# Landmark labels — issue #213

References [#213](https://github.com/auleewilliams/TinyTurboTrails/issues/213).
The owner/child navigation observation remains **unperformed** and separate from
this automated evidence. No automatic issue-closing reference is used.

The six map-only names are Plains, Quarry, Timbers, Sunset, Frost and Cove.
Trail metadata, full selected-panel names and native accessible names retain
Plains, Quarry Run, Treetop Timbers, Sunset Site, Frost Ridge and Sandy Cove.
All six destinations remain freely open, initially selecting Plains. Story,
opening, reunion and replay-story controls remain removed under #195.

## Placement and targets

Each label uses bold 9px monospace dark ink on a 44 × 10 logical-pixel cream
backing. The baseline is 41 pixels below the landmark center and 11 pixels to
its right. Actual browser glyph metrics, including Quarry's descender, fit below
the artwork and selected-frame stroke. The backing bridges one dotted segment
below Timbers; it does not move path points or cover landmark pixels. It uses
the existing palette and approved art without new assets or generation.

Every landmark target keeps its original x/y/width and original 70 × 60 clickable
area, adding 13 pixels below it (70 × 73 total). Targets remain separate, including
the preview/Play, Stickers, heading and footer. Real pointer clicks in this new
strip select and natively focus the corresponding full-name button. Native
Tab/Enter, keyboard and synthetic standard-controller input are checked through
resize and supported browser fullscreen, including exit.

A regression found diagonal Henry travel through the Plains label. Cosmetic
travel now finishes reaching a clear row before moving horizontally, then uses
a landmark column for vertical travel. Mid-travel retargeting first returns to
the nearest clear row. This does not delay selection or Play, move dotted paths,
change input order or alter gameplay; reduced motion still places Henry directly
at the selected destination.

## Evidence types

`input-*` captures use the shipped app and real pointer/keyboard events. Every
short-label strip is clicked, every full selected panel is checked, and every
trail is started with Play and abandoned through the existing pause confirmation.
The controller checks use a synthetic standard Gamepad object, not a physical
controller. Resize/fullscreen checks inspect actual native button rectangles
and click the rendered label area; they do not establish alignment by calling
`.focus()` directly.

`fixture-*` captures are **renderer fixtures, not completed gameplay**. They
concatenate the actual overworld, reward, art, world and education modules and
extract the actual `AdventureScene.drawMap` method. Runtime import guards check
the dependency graph, with real decoded project art and real environment
previews. No renderer dependency is replaced by a no-op. Explicit adapters
supply cosmetic session results and marker positions without mutating a live
scene or run. All 64 completion-badge combinations are checked with all six
selected frames (384 states per engine). The moving-marker matrix samples
frames 0–80 at 60 Hz for all 36 source/destination pairs (2,916 states per engine),
using the production travel helper. Unit coverage separately retargets mid-trip.
Actual glyph bounds are compared against decoded landmark/Henry alpha masks,
selected-frame strokes, badges and visible dotted-path ink. Backings clear only
path ink in that test mask, never art or Henry pixels.

`gameplay-*` captures are separately identified input-driven Plains route
completion/map return evidence from the existing pilot. That pilot dispatches
keyboard/controller input through the app and accelerates its presentation
clock; it does not mutate scene/run state. Renderer fixtures are not credited as
route completion, earned bests or child usability observations.

Logical PNGs are the actual 426 × 240 canvas bitmap, unmodified. Window PNGs
retain the feedback-control rail and existing fractional fit at 426 × 240 and
320 × 240, or desktop 1366 × 768. Browser screenshots are not resampled or edited.
The selected capture inventory, source/asset hashes and origin paths are in
`provenance.json`; per-engine geometry records retain actual glyph metrics,
loaded assets, badge-state checks and marker travel samples.

## Validation

The first focused unit run was RED against unchanged production: six new label
cases failed on missing text; the existing 35 cases passed. The browser RED case
also failed on absent labels after a sandbox preview-startup attempt that ran
zero tests. A later marker regression was RED (1 failed, 41 passed) and became
GREEN (42 passed). The first actual-glyph check exposed an ascent one pixel
taller than expected; moving the text baseline down one pixel corrected it.
The art-mask regression also exposed the real diagonal-marker collision before
the production travel correction. No prior assertions, deadlines, retries or
engine coverage were removed or relaxed.

The initial complete sandboxed unit cohort reported 1,031 passing and four
failing tests plus a suite import failure: Python `spawnSync` returned `EPERM` in
sprite processing and finish grounding. Its configured seven finish-grounding
cases did not execute. The initial script runner reported three passing file
subtests and one failed file without an individual-case breakdown. These are
retained failed cohorts, not evidence that those checks passed.

Final command results, browser reconciliation and selected captures follow.
Full PR CI/artifact readback, fresh Claude
Code / Claude Opus5.5 review, merge and issue disposition belong to the
coordinator. Native Safari, assistive technology, physical controllers and
owner/child acceptance are not inferred from this automation.

| Stable-source command / cohort | Observed result |
| --- | --- |
| `TMPDIR=<scratch evidence> npm test -- --maxWorkers=1` | 1,042 passed, 57 files |
| `TMPDIR=<scratch evidence> npm run test:ci` | 57 passed |
| `npm run typecheck` | Passed, including the final fixture split |
| `npm run build` | Passed; identical `index-BpjRP4J4.js` runtime bundle |
| `playwright test --workers=2 --grep 'landmark labels:'` | 30 passed: 10 per engine; zero skips/retries |
| Browser configured/executed reconciliation | 30 configured = 30 executed; zero report errors |

The preceding broader cohort ran 42 cases: 41 passed and one new Firefox
layout fixture timed out at its unchanged 30-second deadline while capturing
screenshots. Its collision assertions had completed, but that case remains a
failure. The new fixture was then split into six selected-destination tests,
retaining all badge combinations, every sampled travel frame, all three sizes,
all engines and the same default deadline. The final 30-case cohort passed all
those cases. The broader cohort also passed the retained Story/R/View removal,
all-six previews, every-destination keyboard/controller start, browser fullscreen,
Plains results/replay/Next/Map/session/reload route, word-activity native focus
and held-input return, native HUD hints and pause/frozen ribbon-introduction
checks across all three engines. Runtime and unit source hashes were unchanged
by the fixture split; `tested-source.json` records both browser-spec hashes.
The whole repository browser matrix is still a coordinator PR CI gate.

Fullscreen was available and exercised in all three engines. The retained 37
PNGs are byte-identical copies from the final label cohort, except the two
explicitly named gameplay Plains map-return captures from the preceding broader
cohort. Their origins and hashes are in `provenance.json`. Local report revision
metadata is null because the checks preceded commit; exact file/bundle hashes
identify tested source without inventing a commit-time report revision.

## Selected captures

| Selected trail | Logical 426 × 240 | Window 426 × 240 | Small 320 × 240 | Desktop 1366 × 768 | Completed renderer fixture |
| --- | --- | --- | --- | --- | --- |
| Plains | [logical](input-plains-logical.png) | [window](input-plains-426.png) | [small](input-plains-320.png) | [desktop](input-plains-1366.png) | [logical](fixture-plains-completed-logical.png) |
| Quarry | [logical](input-quarry-logical.png) | [window](input-quarry-426.png) | [small](input-quarry-320.png) | [desktop](input-quarry-1366.png) | [logical](fixture-quarry-completed-logical.png) |
| Timbers | [logical](input-timbers-logical.png) | [window](input-timbers-426.png) | [small](input-timbers-320.png) | [desktop](input-timbers-1366.png) | [logical](fixture-timbers-completed-logical.png) |
| Sunset | [logical](input-sunset-logical.png) | [window](input-sunset-426.png) | [small](input-sunset-320.png) | [desktop](input-sunset-1366.png) | [logical](fixture-sunset-completed-logical.png) |
| Frost | [logical](input-frost-logical.png) | [window](input-frost-426.png) | [small](input-frost-320.png) | [desktop](input-frost-1366.png) | [logical](fixture-frost-completed-logical.png) |
| Cove | [logical](input-cove-logical.png) | [window](input-cove-426.png) | [small](input-cove-320.png) | [desktop](input-cove-1366.png) | [logical](fixture-cove-completed-logical.png) |

Completed renderer fixtures also show [Plains at 426](fixture-plains-completed-426.png),
[Timbers at 320](fixture-timbers-completed-320.png) and
[Cove at desktop](fixture-cove-completed-1366.png). Input-driven earned Plains
map return: [426 window](gameplay-plains-map-426.png),
[320 window](gameplay-plains-map-320.png). Native label/control evidence:
[browser fullscreen](input-fullscreen.png) and [after exit](input-fullscreen-exit.png).
