# Puff: a 10-second felt cloud

Written before any scene code, following the workflow in ClaudeAnimationBase's ANIMATION_GUIDE.md
(storyboard first, reads with start and end times, a transition at every seam, review with contact sheets and strips).

**Logline:** Puff, a felt cloud, turns all the way around to show us every side, then floats up with a little glint of pride.

**World:** A tabletop miniature at golden hour. A glossy warm floor, a blurred backdrop of sunset cumulus and
distant blue hills, and a steel-blue sky up top. The palette is cream felt, peach light, and lavender-blue shadows.
The colour lifts across the video: the sun glow behind Puff swells a little as Puff rises.

**Motif:** Puff's glow. It is soft at the start, pulses with the glint at the top, then fades out into warm haze.

**Puff's arc:** calm → curious (the glance right) → playful (the spin) → eager (looking up before the rise) → proud (the glint).

**Character:** Puff matches the reference: cream needle-felt puffs with a bright warm rim and two glossy black bean eyes, and no mouth.
Puff is a 3D signed-distance cloud built from 12 puffs, so the turn shows real silhouette changes and the eyes go behind
the body (storyboard panels 2 to 8).

## Shots (one continuous shot, camera always drifting)

```
A  0.00–10.00  [transition in: blur dissolve from warm haze, 21st "Blur Dissolve" (12px blur, 2% scale, 0.4 s)]
   reads:  0.00–1.40  a felt cloud with eyes hovering over a table at sunset (idle: breathe, bob, sway)
           0.95–1.11  blink (shows Puff is alive)
           1.40–1.80  the eyes glance right first, then the body winds up the other way (anticipation: the eyes lead)
           1.85–2.70  the spin starts: the eyes slide right and vanish around the edge         (panels 2–4)
           2.70–3.90  the back of the cloud: no face, puffs rolling past                        (panels 5–7)
           3.90–4.80  the eyes come back from the left                                          (panel 8)
           4.80–5.60  overshoot past front and spring back (follow-through), then a blink
           5.60–6.20  hold: front view, settled
           6.00–6.30  the eyes look up (Puff shows the thought before acting)
           6.25–6.70  crouch: squash and dip (anticipation)
           6.70–7.45  rise: stretch while fast, bottom puffs trail, the shadow shrinks, the camera tilts up   (panel 9)
           7.45–8.10  arrive: overshoot, squash, jiggle settle
           8.15–8.80  the glint: three light ticks pop at upper right, a light sweep crosses the felt,       (panel 10)
                      the glow pulses, and the eyes squeeze happily
           8.80–9.45  hold: proud idle float, so the payoff lands
   [transition out: 9.45–10.00 blur dissolve into warm haze]
```

## Motion recipe (where "smooth" comes from)

- **Spring physics, as in Remotion and 21st Video blocks.** Every big channel follows its keyed target through a
  damped spring with mass, stiffness and damping: the yaw, height, squash, eye look and camera.
  The spring is integrated from t = 0 on every call, so each frame is still a pure function of time.
  The springs supply overshoot, follow-through and settles without hand keys.
- **Overlapping action.** Each puff follows the body through its own spring, with the top puffs softer. When the body
  moves, the puffs drag, overshoot and settle at different times. The top also twists a little behind the bottom during
  the spin, so no two parts move in unison.
- **Slow in, slow out.** The targets use eased keys (cubic and sine), and the springs round them off.
- **Motion blur.** Each video frame averages several sub-frames inside a 180° shutter, with sub-pixel jitter for anti-aliasing.
- **21st Video parameters.** Light Sweep: 20° angle, 0.2 width, 0.22 strength, over 10 frames at 30 fps. Blur Dissolve:
  12px blur, 2% scale, 0.4 s.
- **Rules kept from the animation guide.** Something always moves (breathing, bob, sway, drifting backdrop, camera drift).
  There is no text, and the eyes lead every action. The ending rhymes with the opening: the same front pose and the same
  haze, but higher and brighter.

Departures from the guide, at the user's request: the guide's 2D p5.brush look and its "no 3D turns" rule are set
aside, because the reference is a 3D felt render and the storyboard asks for a full turn.
