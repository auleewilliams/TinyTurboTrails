# Issue #189 — bag and manual TREE assembly

The approved pilot collects T/R/E/E into a bag, with a brief letter flight and
no automatic word fill or early reward. Finish opens optional manual assembly:
TREE guide, four spaces, and a stable mixed pile containing only collected,
unplaced identities. Pointer drag/drop and keyboard/controller select/place
are implemented. Correct manual assembly earns one session tree sticker.

Find more letters returns beside finish in the identical completed run. It
retains progress and correct partial placements, disarms immediate finish entry,
and rearms after leaving. No missing-letter teleport, helper tiles, restart,
terrain change or storage is used. Maths remains deferred to
[#193](https://github.com/auleewilliams/TinyTurboTrails/issues/193).

## Verification

Strict vertical RED → GREEN logs and progress summary are retained externally:
`/home/leew/.hermes/cache/scratch/issue189-bag-assembly/`.
They cover bag/no-auto-reward, manual identity placement, finish entry,
same-run return/latch, pickup animation, drag rollback, real browser pointer
integration and mixed pointer/keyboard takeover. Temporarily restoring the exact
original `EducationSession` makes the bag regression fail; restoration is green.

- Full unit suite: 839 tests / 48 files (bounded to two workers locally),
  typecheck, build and 8 CI script tests pass.
- Real simulation inputs traverse from finish across all seven reverse springs,
  collect all four missed letters with zero recovery, and return for retry.
  Only the initial finish fixture positions the player; traversal never does.
- Chromium real pointer, Tab/Enter/Space and standard Gamepad API paths assemble
  TREE. Missing-letter coverage jumps over T during actual outward play,
  preserves partial R, tests focus-loss drag cancellation, pixel freeze during
  a 60-second clock gap, held-action clearing and finish re-entry.
- Read-only independent review found no production logic/security blocker.
  Existing finish/star tests now explicitly leave the optional activity before
  retaining their normal finish assertions. No assertions/retries/timeouts were
  weakened. Final cross-engine captures and exact-head CI are recorded below
  when complete; intermediate results are not final-head verification.

## Screenshots

Fresh bag/flight/assembly/missing-return/sticker evidence will be linked here
from the stable cross-browser snapshot. Older `*-word-small.png` and
`*-stickers-word-only-small.png` files illustrate historical interim auto-fill
behaviour and are not current design or verification evidence.

## Retained accepted work and limitations

[All-six finish grounding](visual-clarity/README.md) and
[harmless static props with preserved slimes](../issue-191/README.md) remain.
No rejected ground markers were added. The original main working tree was
untouched. No merge, deployment or issue closure is authorised.

Automated Gamepad API input does not establish physical-controller ergonomics,
child comprehension, enjoyment or owner acceptance. Those playtests remain
manual. This pilot applies only to Treetop Timbers / TREE.
