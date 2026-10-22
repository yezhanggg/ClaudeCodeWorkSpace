// shaders.js: the felt cloud, raymarched as a smooth union of puffs, on a tabletop at golden hour.
const SCENE_FS = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform vec2 uJitter; uniform float uWeight;
uniform vec3 uCamPos, uCamFwd, uCamRight, uCamUp; uniform float uFocal;
uniform vec3 uCloudPos; uniform mat3 uCloudRot; uniform vec3 uCloudScale; uniform float uMinScale, uMaxScale, uTwist;
uniform vec3 uBodyC, uBodyR; uniform vec4 uLobe[12]; uniform float uK;
uniform vec3 uEyeP[2]; uniform mat3 uEyeB[2]; uniform vec3 uEyeR[2]; uniform float uEyeCurve;
uniform float uFloorY, uGlow, uDrift, uSunSwell;
uniform vec2 uSweep; uniform vec4 uSpark; uniform float uLookdev;
out vec4 outColor;

// ---------- noise ----------
float hash13(vec3 p3){ p3 = fract(p3*.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y)*p3.z); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3. - 2.*f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float vnoise2(vec2 x){
  vec2 i = floor(x), f = fract(x); f = f*f*(3. - 2.*f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), f.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), f.x), f.y);
}
float fbm2(vec2 x){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a*vnoise2(x); x = x*2.03 + 17.1; a *= .5; } return s; }

// ---------- the cloud ----------
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = length(p/(r*r)); return k0*(k0 - 1.)/max(k1, 1e-5); }
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.)/k; return min(a, b) - h*h*k*.25; }
vec3 toLocal(vec3 p){
  vec3 q = uCloudRot*(p - uCloudPos);
  q /= uCloudScale;
  float a = uTwist*q.y, c = cos(a), s = sin(a);
  q.xz = vec2(c*q.x - s*q.z, s*q.x + c*q.z);
  return q;
}
float feltBase(vec3 q){
  float d = sdEll(q - uBodyC, uBodyR);
  for (int i = 0; i < 12; i++) d = smin(d, length(q - uLobe[i].xyz) - uLobe[i].w, uK);
  return d;
}
float feltDisp(vec3 q){ return .006*(vnoise(q*5.) - .5) + .0025*(vnoise(q*14. + 7.3) - .5); }
float eyeDist(vec3 q){
  float d = 1e3;
  for (int i = 0; i < 2; i++){ vec3 e = uEyeB[i]*(q - uEyeP[i]); float bx = clamp(e.x, -uEyeR[i].x*1.25, uEyeR[i].x*1.25); e.y += uEyeCurve*bx*bx; d = min(d, sdEll(e, uEyeR[i])); }
  return d;
}
// returns (distance, material): 0 felt, 1 eye
vec2 mapQ(vec3 q){
  float d = feltBase(q);
  if (d < .09) d += feltDisp(q);
  vec3 ec = q - vec3(.24, -.12, .60);
  float de = dot(ec, ec) < .40 ? eyeDist(q) : 1e3;          // eyes only near the face
  return de < d ? vec2(de*uMinScale, 1.) : vec2(d*uMinScale, 0.);
}
vec2 map(vec3 p){ return mapQ(toLocal(p)); }
vec3 calcNormal(vec3 p){
  const vec2 e = vec2(1., -1.)*.0016;
  return normalize(e.xyy*map(p + e.xyy).x + e.yyx*map(p + e.yyx).x + e.yxy*map(p + e.yxy).x + e.xxx*map(p + e.xxx).x);
}
vec3 eyeNormal(vec3 p){
  const vec2 e = vec2(1., -1.)*.0008;
  return normalize(e.xyy*eyeDist(toLocal(p + e.xyy)) + e.yyx*eyeDist(toLocal(p + e.yyx)) + e.yxy*eyeDist(toLocal(p + e.yxy)) + e.xxx*eyeDist(toLocal(p + e.xxx)));
}
float calcAO(vec3 p, vec3 n){
  float occ = 0., sca = 1.;
  for (int i = 0; i < 5; i++){
    float h = .03 + .14*float(i);
    float d = map(p + n*h).x;
    occ += (h - d)*sca; sca *= .80;
  }
  return clamp(1. - 2.0*occ, 0., 1.);
}
// needle felt: short curly fibres at three scales, as ridges where noise crosses its mid level; ~0.25 on average, 1 on a fibre
float ridge(vec3 q){ return 1. - abs(2.*vnoise(q) - 1.); }
float fibres(vec3 q){
  vec3 w = q + .025*(vec3(vnoise(q*6.), vnoise(q*6. + 3.), vnoise(q*6. + 9.)) - .5);     // curl
  float a = pow(ridge(w*vec3(40., 52., 40.)), 3.);
  float b = pow(ridge(w*vec3(95., 78., 95.) + 5.), 3.);
  float c = pow(ridge(w*vec3(170., 150., 170.) + 11.), 2.);
  return .35*a + .35*b + .30*c;
}

// ---------- the world ----------
const vec3 HAZE = vec3(.88, .74, .60);
vec3 backdrop(vec3 rd, float mirror){
  float e = rd.y, a = atan(rd.x, -rd.z);
  vec3 top = vec3(.30, .44, .64), mid = vec3(.52, .61, .74), low = vec3(.90, .76, .62);
  vec3 c = mix(HAZE, low, smoothstep(.0, .07, e));
  c = mix(c, mid, smoothstep(.05, .18, e));
  c = mix(c, top, smoothstep(.20, .60, e));
  // the sun, low and behind Puff's right shoulder
  vec2 sd = vec2(a - .20, (e - .035)*1.7);
  c += vec3(1., .78, .50)*(.30 + uSunSwell)*exp(-dot(sd, sd)*10.) + vec3(1., .86, .62)*.10*exp(-dot(sd, sd)*2.);
  // far cumulus: puffy masses sitting on the horizon, lit warm on top, soft as if out of focus
  float n = fbm2(vec2(a*3.1 + uDrift, e*8.0 - .2));
  float band = smoothstep(.20, .04, e)*smoothstep(-.02, .03, e);
  float cl = smoothstep(.36, .60, n*1.08 - e*2.2 + .16);
  float lit = smoothstep(.42, .80, n + e*1.6) + .45*exp(-dot(sd, sd)*2.5);
  vec3 cloudLit = mix(vec3(.74, .70, .76), vec3(1., .88, .72), clamp(lit, 0., 1.));
  c = mix(c, cloudLit, cl*band*.92);
  // distant hills, hazed blue-grey
  float hh = .006 + .075*pow(fbm2(vec2(a*1.7 + 4., 1.3)), 1.8) + .012*fbm2(vec2(a*5.3, 3.7));
  float hill = smoothstep(hh + .016, hh - .016, e);
  c = mix(c, mix(vec3(.42, .46, .59), HAZE, .30 + .34*exp(-dot(sd, sd)*6.) + 6.*max(.02 - e, 0.)), hill*mirror*.92);
  return c;
}
vec3 floorColor(vec3 p, vec3 rd, float t){
  vec3 rr = reflect(rd, vec3(0, 1, 0));
  vec3 refl = backdrop(rr, .75);
  float fres = .08 + .92*pow(1. - clamp(-rd.y, 0., 1.), 5.);
  // a glossy warm table, with long soft streaks
  float s = vnoise2(vec2(p.x*.35, p.z*4.)) + .5*vnoise2(vec2(p.x*.9, p.z*11.));
  vec3 base = vec3(.60, .50, .42)*(.90 + .1*s)*mix(.80, 1., smoothstep(2., 14., t));
  vec3 c = mix(base, refl, clamp(fres*.70 + .12, 0., 1.));
  // the cloud's shadow and warm glow pool, softer and fainter as it rises
  float h = max(uCloudPos.y - uFloorY - .55, .05);
  vec2 dxz = (p.xz - uCloudPos.xz)/vec2(1.05 + .35*h, .55 + .25*h);
  float r2 = dot(dxz, dxz);
  c *= 1. - .50/(1. + 1.2*h)*exp(-r2*2.2);
  c += vec3(1., .80, .52)*.10*uGlow*exp(-r2*.45)/(1. + .8*h);
  return mix(c, mix(HAZE, refl, .5), 1. - exp(-t*.016));
}
// ---------- capsule for the glint ticks ----------
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0., 1.); return length(pa - ba*h); }

void main(){
  vec2 frag = gl_FragCoord.xy + uJitter;
  vec2 uv = (frag - .5*uRes)/uRes.y;
  vec3 rd = normalize(uCamFwd*uFocal + uCamRight*uv.x + uCamUp*uv.y);
  vec3 ro = uCamPos;

  // background: floor or sky
  float tFloor = rd.y < 0. ? (uFloorY - ro.y)/rd.y : 1e9;
  vec3 col;
  if (uLookdev > .5){ col = vec3(0.); tFloor = 1e9; }
  else if (abs(rd.y) < .022){
    vec3 rf = normalize(vec3(rd.x, min(rd.y, -.0005), rd.z)), rs = normalize(vec3(rd.x, max(rd.y, .0005), rd.z));
    float tf = (uFloorY - ro.y)/rf.y;
    col = mix(floorColor(ro + rf*tf, rf, tf), backdrop(rs, 1.), smoothstep(-.022, .022, rd.y));
  } else col = tFloor < 1e8 ? floorColor(ro + rd*tFloor, rd, tFloor) : backdrop(rd, 1.);

  // cloud: march only inside the bounding sphere (it carries the glow too)
  vec3 oc = ro - uCloudPos; float R = 1.75*uMaxScale + .85;
  float b = dot(oc, rd), c = dot(oc, oc) - R*R, disc = b*b - c;
  if (disc > 0.){
    float sq = sqrt(disc), t = max(-b - sq, 0.), tEnd = -b + sq;
    float dmin = 1e3; vec3 pmin = ro + rd*t; bool hit = false; float mat = 0.;
    for (int i = 0; i < 140; i++){
      vec3 p = ro + rd*t;
      vec2 h = map(p);
      if (h.x < dmin){ dmin = h.x; pmin = p; }
      if (h.x < .0007*t){ hit = true; mat = h.y; break; }
      t += h.x*(h.x > .1 ? .95 : .8);
      if (t > tEnd || t > tFloor) break;
    }
    vec3 warm = vec3(1., .93, .80);
    if (hit){
      vec3 p = ro + rd*t;
      vec3 q = toLocal(p);
      if (mat < .5){
        vec3 n = calcNormal(p);
        // fine fuzz in the normal, so the felt catches light the way fibres do
        vec3 nf = normalize(n + .09*(vec3(vnoise(q*140.), vnoise(q*140. + 4.), vnoise(q*140. + 8.)) - .5));
        float ao = calcAO(p, n);
        vec3 Lk = normalize(vec3(-.18, .80, .58));
        float dk = clamp((dot(nf, Lk) + .35)/1.35, 0., 1.);                 // a soft top light, as in the picture
        float sky = .45 + .55*n.y, bounce = clamp(-n.y, 0., 1.);
        float ndv = clamp(dot(n, -rd), 0., 1.), rim = pow(1. - ndv, 1.3);
        float fib = fibres(q);
        vec3 alb = vec3(1., .93, .92)*(.93 + .10*fib);
        vec3 occ = mix(vec3(.66, .50, .42), vec3(1.), ao);                 // peach creases, like light soaking into wool
        vec3 lit = vec3(1., .97, .95)*.78*dk + vec3(.98, .94, .96)*.40*sky + vec3(1., .78, .50)*.34*bounce;
        col = alb*lit*occ;
        col += vec3(1., .88, .70)*rim*(.80 + .25*fib)*uGlow;                 // backlit fuzz: the whole silhouette glows
        col += vec3(1., .92, .80)*.06*uGlow;                                 // the felt's own glow
        // 21st Light Sweep: a 20° band of sheen crossing the felt
        float band = (q.x + q.y*.364 - uSweep.x)/.27;
        col += vec3(1., .97, .90)*uSweep.y*exp(-band*band)*(.6 + .4*ndv);
      } else {
        vec3 n = eyeNormal(p);
        vec3 r = reflect(rd, n);
        float ndv = clamp(dot(n, -rd), 0., 1.), fres = .04 + .96*pow(1. - ndv, 5.);
        vec3 env = uLookdev > .5 ? vec3(.10, .09, .08) : backdrop(r, 1.)*.25;
        col = vec3(.045, .036, .030) + env*fres;
        // the softbox, upper left, and a little warm bounce from below
        vec3 Lb = normalize(vec3(-.50, .62, .60));
        col += vec3(1., .98, .95)*smoothstep(.86, .95, dot(r, Lb))*.95;
        col += vec3(1., .88, .70)*.20*smoothstep(.80, .97, dot(r, normalize(vec3(.4, -.5, .75))));
      }
    } else {
      // a soft fibrous fringe past the silhouette, then the halo: bright and tight at the edge, wide and faint beyond
      vec3 qm = toLocal(pmin);
      float len = .5 + .5*vnoise(qm*22.), f = clamp(fibres(qm*2.)*2.2, 0., 1.);
      float fringe = smoothstep(.030, 0., dmin)*.75 + smoothstep(.045*len, .004, dmin)*(.20 + .30*f);
      col = mix(col, vec3(1., .96, .86), clamp(fringe, 0., 1.));
      float dd = max(dmin, 0.);
      col += vec3(1., .92, .72)*.55*uGlow*exp(-dd/.22);
      col += vec3(1., .82, .52)*.16*uGlow*exp(-dd/.50)*smoothstep(1.2, .3, dd);
    }
  }

  // the glint: three warm ticks that pop at upper right (screen space)
  if (uSpark.w > 0. && uSpark.w < 1.){
    vec2 pp = vec2(frag.x, uRes.y - frag.y) - uSpark.xy;           // y down, like the anchor
    float k = uSpark.w, s = uSpark.z;
    float grow = clamp(k/.22, 0., 1.), out_ = clamp((k - .55)/.45, 0., 1.);
    float pop = 1. + (2.7)*pow(grow - 1., 3.) + 1.7*pow(grow - 1., 2.);   // backOut
    for (int i = 0; i < 3; i++){
      float ang = radians(-80. + 37.*float(i)) + .05*float(i == 1);
      vec2 dir = vec2(cos(ang), sin(ang));
      float r0 = s*(1.0 + .10*float(i == 1)), len = s*(.46 - .06*float(i == 1));
      float a0 = r0 + len*.45*out_, a1 = r0 + len*(.15 + .85*pop) + len*.25*out_;
      float d = sdSeg(pp, dir*a0, dir*max(a1, a0 + 1.));
      float w = s*.050*(1. - out_*.7);
      float a = smoothstep(w, w*.4, d)*(1. - out_);
      col = mix(col, vec3(1., .985, .94), a);
      col += vec3(1., .86, .6)*.30*exp(-d/(s*.10))*(1. - out_)*grow;
    }
  }
  outColor = vec4(col*uWeight, uWeight);
}`;

const POST_FS = `#version 300 es
precision highp float;
uniform sampler2D uAcc; uniform vec2 uRes; uniform float uSeed, uGrain;
out vec4 outColor;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y)*p3.z); }
vec3 shoulder(vec3 c){ vec3 x = max(c - .82, 0.); return min(c, .82) + .18*(1. - exp(-x/.18)); }
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  vec4 a = texture(uAcc, uv);
  vec3 c = a.rgb/max(a.a, 1e-5);
  vec2 d = uv - .5; d.x *= uRes.x/uRes.y;
  c *= 1. - .16*dot(d, d);
  c = shoulder(c);
  c += (hash12(gl_FragCoord.xy + uSeed) - .5)*uGrain + (hash12(gl_FragCoord.yx*1.37 + uSeed*.71) - .5)/255.;
  outColor = vec4(clamp(c, 0., 1.), 1.);
}`;

const QUAD_VS = `#version 300 es
in vec2 aPos; void main(){ gl_Position = vec4(aPos, 0., 1.); }`;
