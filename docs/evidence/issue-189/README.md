# Timbers educational pilot — issue #189

This bounded pilot adds TREE matching, an optional deliberately opened maths
spot, and two session-only stickers. Placement, bindings, question selection and
visuals are implementation choices in [the interaction guide](../../gameplay-interactions.md#optional-timbers-educational-pilot-189), not owner-approved tuning.

## Verification

Node 22.22.1; lockfile installed with `npm ci`. From the isolated issue worktree:

```sh
npm test
npm run typecheck
npm run build
npm run test:ci
npx playwright test tests/browser.spec.ts --grep 'educational|paused T shortcut|pause return works through pointer|controller pause return requires confirmation' --workers 2
```

The full unit suite passes **807 tests in 46 files**; typecheck and production
build pass; the CI script suite passes **8 tests**. **30 targeted browser cases pass with zero failures or skips**: 21 educational
cases and 9 existing pause/navigation cases, across Chromium, Firefox and WebKit.
The full browser matrix remains for orchestrator/CI.

The new browser tests use actual keyboard events, pointer/native buttons and
standard-gamepad axes/buttons through `BrowserInput`. The existing trail pilot
only drives those inputs and timestamps; there are no production scene hooks.
They cover two separate Es, visible target/progress, explicit entry, wrong/correct
answers, pixel-identical frozen frames, safe exit, native focus, focus loss,
held controller release, pause transitions, both earned stickers, replay and
reload reset. Unit tests cover all 24 letter orders, stable IDs, both recovery
paths, trail changes and all 2,652 valid maths operand/operator pairs.

## Test-first record

Raw command logs, failures, traces and additional captures stay outside Git at
`/home/leew/.hermes/cache/scratch/issue189-evidence/`. Its README gives chronology.
Every log includes the actual exit status. Key RED → GREEN pairs:

| Behavior | RED log | Passing log |
| --- | --- | --- |
| Letter identity/matching | `slice1-word-red.log` | `slice1-word-green.log` |
| Real trail pickup/display | `slice1-browser-red.log` | `slice1-browser-green-final.log` |
| Maths validity/retries | `slice2-maths-red.log` | `slice2-maths-green.log` |
| Input/overlay freeze | `slice2-overlay-red.log` | `slice2-overlay-green.log` |
| Native entry focus | `slice2-focus-red.log` | `slice2-browser-reentry-green.log` |
| Exit/re-entry between frames | `slice2-reentry-red.log` | `slice2-reentry-green.log` |
| Map collection | `slice3-collection-red.log`, `slice3-browser-red.log` | `slice3-collection-green.log`, `slice3-browser-green.log` |
| Explicit word-complete replay state | `slice4-completion-red.log`, `slice4-browser-red.log` | `slice4-completion-green.log`, `final-browser.log` |

Removing duplicate-ID rejection makes the repeated-E assertion fail
(`slice1-sabotage.log`); restoring it passes (`slice1-restored.log`). Removing the
scene's overlay freeze guard changes the full state snapshot and fails
(`slice2-freeze-sabotage.log`); restoring it passes (`slice2-restored.log`).
Failed exploratory runs are retained, including premature resize sampling,
instant keyboard taps, the test's incorrect zero-velocity assumption on a slope,
and the real stale Leave focus on same-frame exit/re-entry. The revision counter
fixes that last bug; no existing assertions, retries or timeouts were weakened.

## Captures and pending playtests

The PNGs here are genuine Playwright captures from the final targeted run. The
small captures show the entire 320×240 window, including external Mute/rumble
controls. Their readable layout was inspected separately from DOM assertions.

| Engine | Repeated E / word complete | Maths retry / focus | Maths sticker | Both stickers |
| --- | --- | --- | --- | --- |
| Chromium | [Word](chromium-word-small.png) | [Maths](chromium-maths-small.png) | [Reward](chromium-maths-sticker.png) | [Collection](chromium-stickers-small.png) |
| Firefox | [Word](firefox-word-small.png) | [Maths](firefox-maths-small.png) | [Reward](firefox-maths-sticker.png) | [Collection](firefox-stickers-small.png) |
| WebKit | [Word](webkit-word-small.png) | [Maths](webkit-maths-small.png) | [Reward](webkit-maths-sticker.png) | [Collection](webkit-stickers-small.png) |

Parent/child playtesting remains pending for comprehension, enjoyment, difficulty,
letter/sign readability at speed, reward feedback and navigation. Physical
controller checks remain pending; automated gamepad events are not hardware
verification. Bundled Playwright WebKit is not installed Safari on macOS or the
full supported installed-browser matrix. No owner-led tuning or child acceptance
is claimed, and the pilot does not authorize expansion to other trails.
