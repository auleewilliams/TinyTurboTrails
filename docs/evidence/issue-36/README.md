# Issue #36 — patrolling slimes

Adventure route (`/?scene=adventure&debug=1`) immediately after starting Plains,
with Henry left standing at the start (`X 60`) so the camera never moves.

- `*-patrol-start.png` — first frame of the run: `slime-001` at its level position.
- `*-patrol-later.png` — 1.5 s later: the same slime has walked up the first ramp,
  still planted on the terrain under it, and turns around at its patrol bounds.

Captured in Chromium, Firefox and WebKit against the production bundle
(`npm run build` + `npm run preview`) on 2026-09-17.
