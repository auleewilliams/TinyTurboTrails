# Per-surface friction verification

Captured from the production movement preview (`/?scene=movement`) on 2026-09-19
in Chromium, Firefox and WebKit. The opening flat has cyan streaks and friction
0.6; the final flat has ochre grains and friction 1.4. Each carries a readable
label. Existing Plains and Quarry Run terrain remains normal grip.

- `npm test`: 300 passed.
- `npm run typecheck` and `npm run build`: passed.
- `npm run test:browser`: 98 passed, 1 skipped (Firefox native audio backend
  unavailable on this host).
- After fixing inherited centered text alignment in the preview,
  `npm run test:browser -- --grep 'movement preview'`: all 6 passed. Screenshots
  here come from that final focused run.
- Independent subagent code review and followup: no findings.

Automated coverage checks acceleration, release braking, turning, stopping
range, default compatibility, air and platform isolation, boundary transitions,
level validation, visual grip patterns and preview input. Child/controller
playtesting of new biome routes remains future work.
