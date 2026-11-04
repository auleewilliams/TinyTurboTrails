# Representative Sunset steel preview

The owner approved the bounded plan and six-call allowance before production.
Four initial calls are spent; the steel and ground refinements remain unused.
Representative visual approval is pending. The later
[review disposition](../review-01/README.md) corrects the initial alpha/contact
description and supplements the missing ferry journey views. This is a partial implementation,
not completed-trail acceptance or a merge-ready candidate.

## Implemented scope

- Eight fixed supports are covered by six whole joined-run PNGs: first-1,
  first-left-1, first-b, first-3, crane-catch, high-deck, far-dock, lower-catch
  (all IDs have the `site-` prefix). The entire 1,740px first-3/crane-catch run is
  rendered, including its distant end and associated approved gem adjustments.
- The whole moving ferry has 96×15 nonzero-alpha bounds inside its 96×18 canvas;
  its substantial body is13rows tall, with very faint outer rows.
  Fixed steel has an 18px maximum depth. Every standing plane, collision record,
  movement endpoint and timing remains unchanged.
- Gravel covers x[0,980), including the left recovery-gap wall. Remaining terrain
  and supports retain their prior artwork until owner preview approval.
- Only the fourteen preview-affected approved gems move down exactly 2px:
  `site-gem-001`–`008`, `010`, `014`, `015`, `019`, `022`, `023`.
  The other twenty-four approved moves wait for rollout. Full level-data equality
  against the baseline, minus this exact list, is checked in `site-terrain.test.ts`.
- Existing scenery, backgrounds, Henry, HUD, physics, controls, camera, rewards,
  checkpoints and other trails are unchanged.

Sources, exact prompts, tool metadata availability, alpha preparation and the
call ledger are retained in [the source packet](../../../../assets/source/site/steel-v1/README.md).
The unedited approved plan is preserved there separately from the living plan.

## Native gameplay captures

[gallery.json](gallery.json) indexes fourteen input-reached observations: seven
locations at 426px and 320px viewport widths. Each has a native 426×240 framebuffer
and actual CSS capture (426×240 or 320×181 PNG; small CSS height 180.28125).
The first jump holds the existing keyboard pilot clock at an input-reached pose
for capture, then resumes it. It never repositions Henry or injects game state.

[index.json](index.json) retains original report hash, case identities and copies
of all attachments. The original JSON metadata remains unchanged; its absolute
references resolve through the index's file map. `sourceRevision` is honestly
null for this uncommitted capture; `workingBase` is
`885b6c16d5397e061f1ccb40ca326856bc77db88`. Each case separately hashes actual
source files and verifies every observed served body against the production
build. No commit or owner acceptance is inferred from those bindings.

Both initial Chromium capture journeys passed, without retries. Native and small
captures were inspected for Henry/headroom, exposed steel ends, connected runs,
ferry visibility, gravel contact and the recovery lip. The later review found a
faint1px steel top row missed in this initial inspection; this initial statement
does not establish exact visible foot contact. These are automated DOM
keyboard and actual rendering observations, not physical hardware or owner
playtesting. The expanded matrix passed all 39 gameplay cases across Chromium,
Firefox and WebKit: six new native/small capture journeys and 33 existing main,
retrace, missed-letter, crane, bypass and wall-contact cases. The 320px WebKit
under-ferry capture was also inspected directly.

## Verification and retained failures

- Typecheck and production build passed.
- Focused affected units: 25 passed in four files after the final exact-level
  guard. An earlier five-file cohort passed 44 tests.
- Script suite: 102 passed. The first script run failed an immutable Cove
  preservation pin because of the new approved Sunset declaration. A narrow
  hash-checked projection now precedes the original oracle; old evidence and
  assertions remain unchanged. Negative controls reject extra bytes/positions.
- Full unit run: 1,944 passed, five failed unchanged finish-layout tests at their
  existing 5,000ms limit (gem counts 0, 1, 42, 999 and separate star rows).
  A targeted repeat passed 24 and failed gem0 at the same limit. No cause, fix
  or waiver is established. Deadlines, retries and coverage are unchanged.
- The new Retry browser test initially used accessible name `Retry`, while the
  actual unchanged button is `Retry loading`. The failed report is retained;
  all 27 required-resource Retry cases failed this locator in the first matrix.
  Those cases had all completed before the locator changed; the original test
  source is retained. All 27 passed in the corrected three-engine run. The
  correction and its separately recorded rerun do not rewrite the original result.
- Shared renderer/UI matrix: cached map previews, compact HUD and landmark
  labels passed on all three engines (nine cases). Owner-HUD fixtures failed
  their missing-dependency guard on all three; adding the new Sunset module
  to that fixture's explicit module list produced three passes. A unit check
  now exercises all three manual renderer dependency graphs.

Original logs and native reports are retained under `test-results/issue-242/`.
Compact browser case/result ledgers and the unit/script logs are also retained
in [validation](../validation/), preserving failures separately from later passes.
Logs are losslessly gzip-compressed with decoded hashes in `log-index.json`;
their original whitespace is preserved.
The pre-existing historical missed-letter 45-second failure remains historical;
new passes cannot establish a cause or fix for it.
