// timeline.js: everything that moves, as a pure function of time (frames render in parallel and out of order).
// Easing and acting helpers follow ClaudeAnimationBase's core.js; the follow-through comes from damped springs
// (mass / stiffness / damping, the Remotion spring model that 21st Video blocks animate with), integrated from
// t = -0.5 on every call, so no state survives between frames.
const DUR = 10, FPS = 30;
const TAU = Math.PI * 2, DEG = Math.PI / 180;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeIn = x => Math.pow(clamp(x), 3);
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeInOutCubic = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeInOutSine = x => -(Math.cos(Math.PI * clamp(x)) - 1) / 2;
const backOut = x => { x = clamp(x); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const wob = (t, f = 1, ph = 0) => Math.sin((t * f + ph) * TAU);
// keyframes: kf(t, [[t0, v0], [t1, v1], ...], easeFn)
function kf(t, keys, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return lerp(va, vb, e((t - a) / (b - a))); }
  }
  return keys[keys.length - 1][1];
}
// 0 → 1 → 0 over [t0, t0 + d]: a fast close and a slower open, like a real blink
function blinkAt(t, t0, d = .17) {
  if (t < t0 || t > t0 + d) return 0;
  const k = (t - t0) / d;
  return k < .38 ? easeIn(k / .38) * .2 + ease(k / .38) * .8 : 1 - ease((k - .38) / .62);
}

// ---------- the cloud: puffs in local space (x right, y up, z toward camera), radius in w ----------
const BODY = { c: [0.02, -0.28, -0.05], r: [1.12, 0.52, 0.80] };
const LOBES = [
  [0.22, -0.16, 0.16, 0.70],   // face puff
  [-0.18, 0.22, -0.12, 0.60],  // big top dome
  [0.56, 0.30, -0.12, 0.42],   // upper right
  [1.00, -0.14, 0.02, 0.36],   // right
  [-0.86, -0.05, 0.02, 0.48],  // left
  [0.18, 0.12, -0.48, 0.55],   // back dome
  [-0.55, -0.08, -0.45, 0.46], // back left
  [0.62, -0.10, -0.44, 0.44],  // back right
  [-0.52, -0.38, 0.30, 0.38],  // front lower left
  [0.78, -0.40, 0.28, 0.34],   // front lower right
  [-0.80, 0.20, -0.26, 0.38],  // side left, mid depth
  [0.86, 0.14, -0.24, 0.36],   // side right, mid depth
];
const SMOOTH_K = 0.085;
const EYES = [[-0.06, -0.07], [0.57, -0.07]];      // where the eyes sit on the face, in local x, y
const EYE_R = [0.074, 0.165, 0.055];

// ---------- keyed targets (the springs chase these) ----------
const T = {
  blinks: [0.95, 5.58, 9.02],
  glance: 1.38, wind: [1.50, 1.85], spin: [1.85, 4.80], settle: 5.25,
  lookUp: 6.00, crouch: [6.25, 6.70], rise: [6.70, 7.40], lookDown: 7.55,
  glint: 8.14, out: 9.45,
};
function yawTarget(s) {
  if (s < T.wind[0]) return 0;
  if (s < T.spin[0]) return -16 * DEG * ease(seg(s, T.wind[0], T.wind[1]));
  if (s < T.spin[1]) return lerp(-16, 368, easeInOutSine(seg(s, T.spin[0], T.spin[1]))) * DEG;
  return lerp(368, 360, ease(seg(s, T.spin[1], T.settle))) * DEG;   // overshoot past front, then back
}
function yTarget(s) {
  if (s < T.crouch[0]) return 0;
  if (s < T.rise[0]) return -0.10 * ease(seg(s, T.crouch[0], T.crouch[1]));
  return lerp(-0.10, 0.70, easeInOutCubic(seg(s, T.rise[0], T.rise[1])));
}
function sqTarget(s) {                                   // + squash (wide, short), − stretch (tall, thin)
  return kf(s, [[T.wind[0], 0], [T.wind[1] - .05, .05], [T.spin[0] + .25, 0],
    [T.crouch[0], 0], [T.crouch[1], .13], [T.rise[0] + .12, -.06], [T.rise[1] - .1, 0], [T.rise[1] + .08, .07], [T.rise[1] + .3, 0],
    [T.glint - .04, 0], [T.glint + .12, -.05], [T.glint + .4, 0]]);
}
function lookXTarget(s) { return kf(s, [[T.glance, 0], [T.glance + .16, .55], [T.spin[1] - .1, .55], [T.settle, 0]]); }
function lookYTarget(s) { return kf(s, [[T.lookUp, 0], [T.lookUp + .2, .42], [T.lookDown, .42], [T.lookDown + .3, 0]]); }

// ---------- the simulation: every spring in one pass, from rest at t = -0.5 ----------
// spring(stiffness, damping, mass = 1); ζ = damping / (2·sqrt(stiffness·mass)) sets the overshoot.
const SP = {
  yaw: [62, 12.5], yawTop: [90, 12], y: [105, 12.5], sq: [190, 10.5], look: [300, 30], cam: [26, 10.5],
};
const LOBE_SP = LOBES.map(([, y]) => { const k = 270 - 140 * clamp((y + 0.40) / 0.85); return [k, 2 * .40 * Math.sqrt(k)]; });
function simulate(t) {
  const dt = 1 / 600, t0 = -0.5;
  const st = { yaw: 0, yawV: 0, yawTop: 0, yawTopV: 0, y: 0, yV: 0, sq: 0, sqV: 0, lx: 0, lxV: 0, ly: 0, lyV: 0, cam: 0, camV: 0,
    lobe: LOBES.map(() => 0), lobeV: LOBES.map(() => 0) };
  const step = (x, v, target, [k, c], h) => { v += (k * (target - x) - c * v) * h; return [x + v * h, v]; };
  for (let s = t0; s < t - 1e-9;) {
    const h = Math.min(dt, t - s);
    [st.yaw, st.yawV] = step(st.yaw, st.yawV, yawTarget(s), SP.yaw, h);
    [st.yawTop, st.yawTopV] = step(st.yawTop, st.yawTopV, st.yaw, SP.yawTop, h);
    [st.y, st.yV] = step(st.y, st.yV, yTarget(s), SP.y, h);
    [st.sq, st.sqV] = step(st.sq, st.sqV, sqTarget(s), SP.sq, h);
    [st.lx, st.lxV] = step(st.lx, st.lxV, lookXTarget(s), SP.look, h);
    [st.ly, st.lyV] = step(st.ly, st.lyV, lookYTarget(s), SP.look, h);
    [st.cam, st.camV] = step(st.cam, st.camV, st.y, SP.cam, h);
    for (let i = 0; i < LOBES.length; i++) [st.lobe[i], st.lobeV[i]] = step(st.lobe[i], st.lobeV[i], st.y, LOBE_SP[i], h);
    s += h;
  }
  return st;
}

// ---------- local-space SDF (mirrors the shader, without the felt noise), used to seat the eyes on the surface ----------
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
function sdEll(p, r) {
  const k0 = Math.hypot(p[0] / r[0], p[1] / r[1], p[2] / r[2]), k1 = Math.hypot(p[0] / (r[0] * r[0]), p[1] / (r[1] * r[1]), p[2] / (r[2] * r[2]));
  return k0 * (k0 - 1) / Math.max(k1, 1e-6);
}
function feltSDF(p, lobes) {
  let d = sdEll([p[0] - BODY.c[0], p[1] - BODY.c[1], p[2] - BODY.c[2]], BODY.r);
  for (const [x, y, z, r] of lobes) d = smin(d, Math.hypot(p[0] - x, p[1] - y, p[2] - z) - r, SMOOTH_K);
  return d;
}
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function seatEye(x, y, lobes) {
  let p = [x, y, 1.6];
  for (let i = 0; i < 80; i++) { const d = feltSDF(p, lobes); p[2] -= d; if (Math.abs(d) < 1e-5) break; }
  const e = 1e-4, g = [0, 1, 2].map(a => { const p1 = p.slice(), p2 = p.slice(); p1[a] += e; p2[a] -= e; return feltSDF(p1, lobes) - feltSDF(p2, lobes); });
  const n = norm(g), up = norm([0 - n[0] * n[1], 1 - n[1] * n[1], 0 - n[2] * n[1]]), xa = cross(up, n);
  return { p, n, basis: [xa, up, n] };          // rows: eye-space x, y, z (z = out of the felt)
}

// ---------- camera ----------
function lookAt(pos, target, roll = 0) {
  const f = norm([target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]]);
  let r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const c = Math.cos(roll), s = Math.sin(roll);
  [r, u] = [r.map((x, i) => x * c + u[i] * s), u.map((x, i) => x * c - r[i] * s)];
  return { pos, fwd: f, right: r, up: u };
}
function rotYXZ(yaw, pitch, roll) {            // world = Rz(roll) · Rx(pitch) · Ry(yaw) · local; returned transposed (world → local)
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], Rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]], Rz = [[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]];
  const mul = (A, B) => A.map((row, i) => [0, 1, 2].map(j => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
  const M = mul(Rz, mul(Rx, Ry));
  return [[M[0][0], M[1][0], M[2][0]], [M[0][1], M[1][1], M[2][1]], [M[0][2], M[1][2], M[2][2]]];
}
const project = (cam, focal, p, W, H) => {
  const d = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]], z = dot(d, cam.fwd);
  return [W / 2 + dot(d, cam.right) / z * focal * H, H / 2 - dot(d, cam.up) / z * focal * H];
};

// ---------- the whole frame state at time t ----------
function stateAt(t, W = 1920, H = 1080) {
  const s = simulate(t);
  const FLOOR = -1.10;
  // idle life on top of the acting: breathe, bob, sway (never still)
  const bob = 0.034 * wob(t, .40), breathe = 0.011 * wob(t, .40, .2);
  const roll = 0.030 * wob(t, .19, .1) - 0.05 * clamp(s.yawV / 3.4, -1, 1) * seg(t, 1.4, 1.6);
  const pitch = 0.020 * wob(t, .23, .6) + 0.06 * clamp(-s.yV / 2.2, -1, 1);
  // squash: keyed + stretch from vertical speed + breathing
  const sq = clamp(s.sq - 0.09 * clamp(s.yV / 2.0, -1, 1) + breathe, -0.22, 0.22);
  const sy = 1 - sq, sxz = 1 / Math.sqrt(sy);
  const yawSpeed = clamp(Math.abs(s.yawV) / 3.4);
  // puffs: each drags behind the body through its own spring, wobbles on its own phase, and fluffs out while spinning
  const lobes = LOBES.map(([x, y, z, r], i) => {
    const lag = (s.lobe[i] - s.y) * 0.55, fluff = 1 + 0.045 * yawSpeed * yawSpeed;
    return [x * fluff + 0.006 * wob(t, .29 + .06 * i, i * .37), y + lag + 0.007 * wob(t, .33 + .05 * i, i * .61), z * fluff, r];
  });
  // eyes: seated on the felt, shifted by the look, blinking and squeezing
  const blink = Math.max(...T.blinks.map(b => blinkAt(t, b)));
  const squeeze = kf(t, [[T.glint + .02, 0], [T.glint + .14, .86], [T.glint + .58, .86], [T.glint + .78, 0]]);
  const eyeOpen = Math.max(0.09, (1 - blink) * (1 - squeeze));
  const eyes = EYES.map(([x, y], i) => {
    const e = seatEye(x + s.lx * 0.11, y + s.ly * 0.14 + (1 - eyeOpen) * 0.03, lobes);
    const inset = EYE_R[2] * .25;
    return { p: e.p.map((v, a) => v - e.n[a] * inset), basis: e.basis, r: [EYE_R[0] * (1 + .12 * (1 - eyeOpen)), EYE_R[1] * eyeOpen, EYE_R[2]] };
  });
  const cloudPos = [0.0, s.y + bob, 0];
  // camera: slow push-in and drift, tilts up after the cloud on a heavy, critically damped spring
  const camPos = [0.10 * wob(t, .07, .1), -0.30 + 0.30 * s.cam, lerp(5.95, 5.50, ease(t / DUR))];
  const camTgt = [0.04 * wob(t, .05, .3), -0.08 + 0.78 * s.cam, 0];
  const cam = lookAt(camPos, camTgt, 0.006 * wob(t, .11));
  const focal = 1 / (2 * Math.tan(15 * DEG));   // 30° vertical field of view
  const glintK = seg(t, T.glint, T.glint + .7);
  const glow = 1 + 0.45 * (glintK > 0 ? easeOut(glintK / .25) * (1 - ease((glintK - .25) / .75)) : 0) + 0.12 * seg(t, T.rise[0], T.rise[1]);
  const sparkAnchor = project(cam, focal, [cloudPos[0] + 0.86, cloudPos[1] + 0.52, 0.3], W, H);
  // 21st "Light Sweep": 20°, width .2, strength .22, 10 frames at 30 fps
  const sweep = seg(t, T.glint - .02, T.glint - .02 + 10 / 30);
  // 21st "Blur Dissolve": 12px blur, 2% scale, ~0.4 s, in from and out to warm haze
  const fadeIn = ease(seg(t, 0, .42)), fadeOut = ease(seg(t, T.out, DUR));
  const vis = fadeIn * (1 - fadeOut);
  return {
    t, cam, focal, floorY: FLOOR,
    cloud: { pos: cloudPos, rot: rotYXZ(s.yaw, pitch, roll), scale: [sxz, sy, sxz], twist: clamp((s.yawTop - s.yaw) * 0.3, -.15, .15) },
    body: BODY, lobes, k: SMOOTH_K, eyes, eyeCurve: 9 * squeeze,
    glow, sweep: [lerp(-1.7, 1.9, sweep), sweep > 0 && sweep < 1 ? .22 : 0],
    spark: [sparkAnchor[0], sparkAnchor[1], H * 0.11, seg(t, T.glint, T.glint + .75)],
    drift: t * 0.006, sunSwell: 0.12 * seg(t, T.rise[0], 9.5),
    post: { vis, blur: 12 * (1 - vis), scale: 1 + 0.02 * (1 - vis) },
    debug: { yaw: s.yaw / DEG, y: s.y, sq, lx: s.lx, ly: s.ly, cam: s.cam, blink, squeeze },
  };
}
if (typeof module !== 'undefined') module.exports = { stateAt, simulate, DUR, FPS, T };
