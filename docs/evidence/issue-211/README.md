# Completed-word reward and Done — issue #211

The reward uses the approved trail sticker and wooden tiles, with separate text.
Completion shows an opaque still reward surface immediately, including reduced
motion. The target and assembled word stay visible; the centered 56 × 56 sticker
has its own clear space. Done is the sole native target and receives focus.

Evidence modes:

- `actual-*`: input-driven shipped game. The existing browser pilots send real
  keyboard or standard Gamepad API input and accelerate presentation time; they
  do not write scene/player/run/education state. Routes deliberately miss a
  letter, retrace the trail, manually assemble it and return through Done.
- `fixture-*`: isolated shipped renderer/native-menu fixture with explicitly
  collected letters. This validates the art/layout under reduced motion; it is
  not a route-completion or live-gameplay claim.

The browser tests retain wrong drops, independent repeated E/L identities,
missing-letter/partial progress, replay, map/trail switching, session-only rewards,
results-first entry and Next trail/Map defaults. Final placement and Done are held
through keyboard Enter/Space repeats/release and standard Gamepad confirmation.
Real canvas `measureText` probes observe Done against the generated button's
quiet interior and the success labels against canvas/sticker bounds.

Capture dimensions refer to page viewports: 426 × 300 includes the native
426 × 240 canvas plus external controls; 320 × 240 is the small-window view;
1366 × 768 is the representative desktop. Image alpha is preserved in the
unchanged source PNGs; the success background is intentionally opaque.

Manual owner/child usability, physical controller and assistive-technology
acceptance have not been performed. Automated Gamepad API and accessible name/
focus assertions do not replace those checks. Fresh Claude Code review, complete
CI and artifact reconciliation belong to the parent coordinator.

Source and inspection: implementation `feedb55acb2451615fcaf80aa4d80b1d6230de48`,
based on `081451ce4758b0e577e35034dcb6b946f18aa21a` (merged #217 / #210).
Final full unit/scripts/typecheck/build and the final browser checks ran before
the source commit against the same source/test bytes.
The local browser report has `metadata.sourceRevision: null`; the scratch
`source-revision.txt` records committed blob identities. CI must independently
verify its checkout/merge revision. This evidence is implementation evidence,
not reviewer approval of a later head.

Inspected Chromium captures:

| Trail word | Native canvas page | Small window |
| --- | --- | --- |
| HILL | [426](actual-plains-success-426.png) | [320](actual-plains-success-320.png) |
| ROCK | [426](actual-quarry-success-426.png) | [320](actual-quarry-success-320.png) |
| TREE | [426](actual-timbers-success-426.png) | [320](actual-timbers-success-320.png) |
| BEAM | [426](actual-sunset-success-426.png) | [320](actual-sunset-success-320.png) |
| SNOW | [426](actual-frost-success-426.png) | [320](actual-frost-success-320.png) |
| SAND | [426](actual-cove-success-426.png) | [320](actual-cove-success-320.png) |

[Desktop HILL](actual-plains-earned-1366.png),
[partial entry](actual-plains-missing-assembly-426.png),
[completed reentry](actual-plains-reentry-426.png), and
[Done → results with Next trail focused](actual-plains-done-results-426.png).

Isolated reduced-motion renderer/native-menu fixture:
[TREE native](fixture-reduced-motion-timbers-success-426.png),
[TREE small](fixture-reduced-motion-timbers-success-320.png).
These are explicitly collected-letter fixtures, separate from actual route evidence.

Local unit gate: 1020 passed in 56 files with two workers. Scripts: 57 passed.
Typecheck and production build passed. Focused TDD: 12 new cases failed on the
unchanged baseline, then an earlier implementation iteration passed the focused five-file suite
with 81 cases; the final full-unit gate covers the shipped opaque success surface. The baseline
keyboard browser case reached TREE completion and failed on missing focused Done.

Scratch logs, full browser reports, screenshots and traces are retained at
`/home/leew/.hermes/cache/scratch/m7-211-evidence/`. This includes the initial
sandbox failures and a stopped Chromium cohort (5 passed, 1 incorrect reentry
capture expectation failed, 1 interrupted, 5 not run). Reentry now explicitly
requires the same earned sticker and tiles. No timeouts, retries, engines or
existing assertions were weakened. Full unit/script subprocess gates required
normal command-scoped escalation; all original outputs remain available.

Final focused browser cohort: **42 passed, 6 failed**, retries zero, two workers,
all three engines. Chromium 16/16 and Firefox 16/16 passed. WebKit 10 passed,
6 failed: four TREE input variants and the missing-letter return case exceeded
the unchanged 30-second whole-test budget; Plains missed its unchanged 35-second
results wait while still playing at X 9532. The TREE traces spend about 21–22
seconds reaching Build your word, then expire during partial assembly. These are
observations, not an infrastructure diagnosis or a pass for those paths. The
remaining five WebKit all-trail success/Done routes and reduced-motion renderer
fixture passed. Seventeen actual all-trail success glyph reports observed the
new labels with zero clearance violations (6 Chromium, 6 Firefox, 5 WebKit).

WebKit TREE held-success/Done and the failed routes remain unresolved locally.
Full exact-head CI, artifact reconciliation and fresh opposite-model review are
required before conditional merge. No retries or timeout increases were used.
