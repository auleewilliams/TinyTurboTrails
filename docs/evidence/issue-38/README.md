# Issue #38 — crumbling ledges

Quarry Run (`/?scene=adventure&debug=1`) on the normal held-right route.

- `*-ledges.png` — the first ledge during its 0.75-second warning, with the
  stone bridge visibly shaking and cracked beneath Henry.
- The browser check counts nine half-scale stone tiles while all three ledges
  are stable, six after the first ledge crumbles, and nine again after Henry
  falls into the preceding pit and recovers at the active checkpoint.
- The same check proves the ledge is reached without a new input and that its
  safe lower floor costs momentum rather than progress.

Captured in Chromium, Firefox and WebKit against the production bundle
(`npm run build` + `npm run preview`) on 2026-09-18.
