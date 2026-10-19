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
A fresh independent review then reproduced two additional edge cases: airborne
finish entry retained a jump buffer, and an activity opened and closed between
rendered frames retained clock debt. Both have focused RED → GREEN regressions:
return clears only transient player movement, and every activity revision forces
a clock suspension boundary even when its final state is closed.

- Full unit suite: **841 passed / 49 files**, zero failures or skips (bounded to
  two workers locally); typecheck, build and **8 script tests** pass.
- Real simulation inputs traverse from finish across all seven reverse springs,
  collect all four missed letters with zero recovery, and return for retry.
  Only the initial finish fixture positions the player; traversal never does.
- A separate actual Chromium keyboard/pointer loop runs from the start, jumps
  over T, retains a manually placed R, returns beside finish, retraces to T near
  the start, collects it, and reaches finish again to manually earn the sticker.
  No scene/position hooks or helper letters are used. Gems progress from 27/33
  to 31/33; partial R and the earned map sticker survive. See the
  [recorded result](bag-assembly/reverse-browser-result.json),
  [return](bag-assembly/reverse-browser-beside-finish.png),
  [missed T collected](bag-assembly/reverse-browser-missed-T-collected.png) and
  [manual reward](bag-assembly/reverse-browser-earned.png). No layout blocker found.
- Local three-engine targeted run: **26 passed / 4 WebKit whole-test timeouts**.
  Trace inspection showed cumulative route/input/capture cost (the pointer route
  alone took 23.5 seconds), not a stuck assertion. Unchanged one-worker WebKit
  run: **9 passed / 1 controller whole-test timeout**; its actual screenshot
  already shows correctly assembled TREE and the earned sticker. Unchanged
  isolated controller case: **1 passed** in 27.5 seconds. Every named case has
  a successful final-source run; this is not a claim of one clean local matrix.
  No timeouts, assertions, retries or tests were weakened. Exact final-head full
  CI is the full-matrix gate and must be checked live in PR #190.
- [Independent read-only review](bag-assembly/final-review.json) of production
  head `69958a9ca57af4c8f67dd7a7195679c6a4861a70` passed with no security,
  logic or suggestion findings. Both new edge-case regressions also fail when
  their respective fixes are removed only in memory, then pass restored. The
  reviewer independently exercised production frame/input/clock collaborators.
- Missing-letter coverage also tests focus-loss drag cancellation, pixel freeze
  during a 60-second clock gap, held-action clearing and finish re-entry.
  Existing finish/star tests explicitly leave the optional activity before
  retaining their original finish assertions.

## Screenshots

Captures use the stable source snapshot
`69958a9ca57af4c8f67dd7a7195679c6a4861a70`. Native captures use a
426×300 window with the 426×240 game above the feedback controls; small captures
use 320×240. They are genuine browser captures from the input-driven tests.

| State | Chromium native / small | Firefox native / small | WebKit native / small |
| --- | --- | --- | --- |
| Letter bag | [chromium native](bag-assembly/chromium-bag-native.png) / [small](bag-assembly/chromium-bag-small.png) | [firefox native](bag-assembly/firefox-bag-native.png) / [small](bag-assembly/firefox-bag-small.png) | [webkit native](bag-assembly/webkit-bag-native.png) / [small](bag-assembly/webkit-bag-small.png) |
| Pickup flight | [chromium native](bag-assembly/chromium-pickup-flight-native.png) / [small](bag-assembly/chromium-pickup-flight-small.png) | [firefox native](bag-assembly/firefox-pickup-flight-native.png) / [small](bag-assembly/firefox-pickup-flight-small.png) | [webkit native](bag-assembly/webkit-pickup-flight-native.png) / [small](bag-assembly/webkit-pickup-flight-small.png) |
| Manual assembly | [chromium native](bag-assembly/chromium-assembly-native.png) / [small](bag-assembly/chromium-assembly-small.png) | [firefox native](bag-assembly/firefox-assembly-native.png) / [small](bag-assembly/firefox-assembly-small.png) | [webkit native](bag-assembly/webkit-assembly-native.png) / [small](bag-assembly/webkit-assembly-small.png) |
| Missing-letter return | [chromium native](bag-assembly/chromium-missing-return-native.png) / [small](bag-assembly/chromium-missing-return-small.png) | [firefox native](bag-assembly/firefox-missing-return-native.png) / [small](bag-assembly/firefox-missing-return-small.png) | [webkit native](bag-assembly/webkit-missing-return-native.png) / [small](bag-assembly/webkit-missing-return-small.png) |
| Earned tree sticker | [chromium native](bag-assembly/chromium-earned-sticker-native.png) / [small](bag-assembly/chromium-earned-sticker-small.png) | [firefox native](bag-assembly/firefox-earned-sticker-native.png) / [small](bag-assembly/firefox-earned-sticker-small.png) | [webkit native](bag-assembly/webkit-earned-sticker-native.png) / [small](bag-assembly/webkit-earned-sticker-small.png) |

Visual inspection confirms the bag replaces in-trail spaces, a collected tile
flies toward it, the finish pile is mixed with separate Es, missing-letter
return places Henry beside the grounded arch, and manual completion displays
the tree sticker. Controls remain inside the canvas at both sizes. The ordinary
finish panel is faintly visible behind the dark activity screen. Child reading
comfort at 320px remains manual acceptance.

Older `*-word-small.png` and `*-stickers-word-only-small.png` files illustrate
historical interim auto-fill behaviour and are not current design evidence.

## Retained accepted work and limitations

[All-six finish grounding](visual-clarity/README.md) and
[harmless static props with preserved slimes](../issue-191/README.md) remain.
No rejected ground markers were added. The original main working tree was
untouched. No merge, deployment or issue closure is authorised.

Automated Gamepad API input does not establish physical-controller ergonomics,
child comprehension, enjoyment or owner acceptance. Those playtests remain
manual. This pilot applies only to Treetop Timbers / TREE.
