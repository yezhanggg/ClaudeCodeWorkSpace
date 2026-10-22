# Puff: a 10-second felt cloud animation

A glowing needle-felt cloud turns all the way around, crouches, floats up, and glints, following the 10-panel storyboard
in `ref_storyboard.png`. The character design comes from `ref_cloud.png`.

| file | what it is |
|---|---|
| `out/puff_cloud_10s.mp4` | the video: 1920×1080, 30 fps, 10 s, 4 motion-blur samples per frame |
| `out/puff_cloud_10s.gif` | the GIF: 720×405, 25 fps, 10 s |
| `STORYBOARD.md` | the plan, with every "read" timed before any code was written |
| `cloud.html` | the renderer page: open it in Chrome to watch it play live, or add `?t=3.2` to hold one frame |
| `src/timeline.js` | all the motion, as a pure function of time (springs, easing, eyes, camera) |
| `src/shaders.js` | the look: a raymarched cloud made of 12 felt puffs, glossy eyes, and a golden-hour tabletop |
| `render.mjs` | headless renderer (Playwright + Chromium): contact sheets, strips, stills and frames |
| `run_final.sh` | the exact commands that made the final MP4 and the frames for the GIF |

## How it was made

**ClaudeAnimationBase ([JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase)).**
The workflow and the animation principles come from its ANIMATION_GUIDE.md:
- Storyboard first, with timed reads.
- Every frame is a pure function of `t`, so frames can render in parallel.
- The eyes lead each action: a glance before the turn, a look up before the rise.
- Anticipation: a wind-up before the spin and a crouch before the rise.
- Squash and stretch, follow-through, and overlapping action: the puffs drag and settle on their own springs.
- Something always moves: breathing, bob, sway, and camera drift.
- There are transitions in and out, and no text.
- The review loop of contact sheets and frame strips.

The renderer is modelled on its `render.mjs`, and the easing helpers (`ease`, `easeOut`, `backOut`, `kf`, `seg`) are its
`core.js` helpers. Its 2D p5.brush look and its "never project 3D" rule were set aside, because the reference is a 3D felt
render and the storyboard asks for a full turn.

**21st (MCP).** The motion settings come from 21st Video blocks:
- **Light Sweep:** 20° angle, 0.2 width, 0.22 strength, over 10 frames at 30 fps. It is the sheen that crosses Puff at the glint.
- **Blur Dissolve:** 12 px blur, 2% scale. It is the fade in from and out to warm haze.
- **Springs:** 21st Video blocks run on Remotion, which animates with mass, stiffness and damping springs. Every big motion
  channel here (yaw, height, squash, eye look, camera, and each puff) chases its keyed target through such a spring.
  The springs supply the overshoot and settle that make the motion feel smooth.

**Smoothness.** Each video frame averages 4 sub-frames across a 180° shutter (motion blur), each with its own sub-pixel
jitter (anti-aliasing). The camera rides a critically damped spring, so it never jerks.

## Re-render

You need Node.js with Playwright's Chromium, and ffmpeg. With no GPU, WebGL runs in software (SwiftShader).

```bash
node render.mjs --sheet=0.8,3.0,4.0,7.6,8.3 --cols=5 --w=480 --out=out/check/sheet.jpg   # quick contact sheet
./run_final.sh                                                                          # full renders (~1 h on 4 CPU cores)
```

The story timing lives in `T` at the top of `src/timeline.js`, and the puff layout lives in `LOBES`.
