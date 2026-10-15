# Suite purpose and coverage audit

This is the [issue 167](https://github.com/auleewilliams/TinyTurboTrails/issues/167) audit snapshot for [42f86fb](https://github.com/auleewilliams/TinyTurboTrails/commit/42f86fb411e4370c9fed9e97e72e945579bcaf2e), after the scheduling and viewport changes. It records **37 unit files, 316 registration/parameter groups representing 693 cases, and 68 browser groups representing 89 cases per engine / 267 configured cases**. The catalogues describe current contracts and conservative decisions; they do not remove a test or authorize a coverage reduction.

## Catalogues

- [Unit catalogue](unit-catalogue.csv): every current registration or parameter group, its source, purpose/requirement, relevance, concrete assertion witness, complementary browser coverage, cheapest harness, historical cost where available and verdict.
- [Browser catalogue](browser-catalogue.csv): every current group, all expanded titles, current source/requirement references, unique contracts, named complements/retained coverage, individual level reasoning and observed costs/statuses.
- [Browser member costs](browser-costs.csv): one row per current browser case with separate Chromium/WebKit observations and an explicit missing Firefox column.
- [Candidate verdicts](candidate-verdicts.csv): all first-pass issue categories, including per-level/diagnostic/evidence/Python/shared-fixture candidates, named retained contracts and validation conditions.
- [Evidence and completeness](evidence.json): revision, source hashes, group/case totals, parameter-count method, report provenance and retained CI artifact inspection.

The unit table is based on static assertion/API/fixture review, not a new test run. A source parser found every registration. Saved Vitest results matched 676 cases without ambiguity in the 36 unchanged test files. The changed viewport file has six scalar registrations plus eleven literal dimension rows, giving 17 cases and 693 overall. The current normal CI independently reported 693 unit passes. Historical unit milliseconds are labelled cd1a045 observations, not current timings. A material-renderer negative group has no explicit expect call: it passes a context with no drawing methods, so any unwanted ordinary/offscreen drawing would throw. That is a real no-draw witness.

All original 80 browser titles remain, with nine added groups: weather; two rumble groups; three pause-return groups; cached gameplay previews; viewport fit; app fullscreen. Current ribbon/reset and no-signboard assertions are carried forward. The 900x600 focus/letterbox case now expects a 900px canvas under fractional fit, not the old 852px integer width. Its exact size/focus sequence is not an unchanged duplicate of the new viewport matrix.

## Recorded execution and evidence limits

| Snapshot and run | Configured cases and result | Browser step |
| --- | --- | --- |
| [cd1a045 stock CI](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/38564714907) | 261; 260 passed, 1 skipped | 26m47s |
| [Scheduling PR 174](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/38624723059) | Same source base/261; 260 passed, 1 skipped | 22m45s |
| [Merged scheduling main](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/38638003535) | Same tested source tree/261; 260 passed, 1 skipped | 21m01s |
| [Current viewport main](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/38650798507) | 267; 266 passed, 1 skipped | 23m02s |

The same-base scheduling pair saved 4m02s / 15.06% in one normal Linux CI pair. Its full check job decreased from 28m39s to 27m30s; setup variance explains the smaller overall reduction. The viewport run adds behavior/cases, so its duration is not an isolated scheduling comparison. The passing local cd1a045 Chromium/WebKit pair saved 3m11.9s / 15.39%. No statistical guarantee is claimed.

Browser cost cells come from the existing Windows viewport JSON, two workers and zero retries. Its hash matches the committed [viewport verification record](../issue-172/browser-results.json); a7f7056 to tested 326936b has no application/test/config changes, and that tree matches this snapshot. The cohort finished **176 passed, 1 skipped, 1 failed**: the existing WebKit Quarry signature reached Finish at STARS 0/3 rather than 3/3. The catalogue retains failed/skipped status beside each duration. Passing isolated/concurrent diagnostics do not convert that full run into a passing benchmark. Native audio passed on local Chromium and skipped on local WebKit; Windows Firefox failed before page creation and is not runtime evidence. Its installation was not repaired.

Read-only inspection of current main CI artifact **11935852110**, browser-test-results (79,366,357 bytes), found **765 PNG files and no JSON/HTML report or skip metadata**. Thus **Firefox per-case duration and the current skipped case/engine cannot be recovered from that retained artifact**. The successful all-engine CI aggregate is not a per-case cost report. Source now has both audio.spec.ts:22 native-device and browser.spec.ts:121 fullscreen-unavailable skip conditions; neither skip identity nor engine is inferred from dot order, screenshots or file timestamps. A future reporting-only change should keep normal dot output and retain a JSON report at a non-hidden path inside the uploaded artifact, without changing cases, budgets, projects or zero retries. No rerun was made for this audit.

## Decisions and follow-up boundaries

No whole browser group has a proved unchanged replacement. The milestone driver is accelerated and does not subsume native material/ground/feedback/input witnesses. The zero-star specials fixture places Henry at Finish: it proves zero-reward completion/menu, not traversability. Static inspection counts 28 complete routes per engine / 84 across three, plus checkpoint walks: the viewport fit group added one Plains completion. Counts are static, not route telemetry.

The browser level column is deliberately case-specific. Canvas alpha/decode/raster, actual focus/RAF/gamepad input, native audio and fullscreen keep all-engine witnesses. Atlas frame geometry/body-mask comparisons could move to units only while native decode remains. Preview/adventure unavailable-audio caller checks are conditional unit/one-browser split candidates, not approved downgrades: retain both routes and always-running all-engine M/Escape/main input coverage first, because the native-audio case can skip. Pure exception handling already has named unit coverage.

| Proposed consolidation | Named retained coverage and required transplant |
| --- | --- |
| Plains finish and checkpoint walking | Keep the sequential six-flag ground/feedback/marker case plus nonzero gems, actual finish/celebration pixels, native clock, Space replay and X60/camera reset from the separate finish case. |
| Standalone idle slime pixels | Move the unchanged idle pixel-strip witness at Henry X60 into the Plains member of the six-trail common-atlas/patrol/pause group before deleting anything. Keep physics/data layers. |
| Frost/Cove finish with milestones | Preserve real atlas, native ice coast >80, sand/pool 176/143 speeds, pause freeze and same-atlas replay before sharing traversal. |
| Default Space boot / Timbers atlas / mute pointer / focus flows | Preserve each default route, native input/release, actual atlas, 900x600 geometry or button state witness in the named targets listed in the candidate table. Similar setup is not a replacement. |
| Finish-layout work | Prefer hoisting independent geometry while keeping all 121 samples, all five gem counts, formatter/level totals and star counts. The recorded vectors for 0/1/7 are identical and 42/999 differ; proof inputs are unchanged. Optional 1/7 removal still requires retained 0, widths 42/999 and formatter contracts. |
| Repeated Plains positive validation | Move direct unique-ID/checkpoint/finish-order predicates into the generic world group before removing the standalone validator call; retain the Plains registry/default test. |
| Per-level/shared fixtures | Parameterize helpers only while retaining Quarry/Sunset/Timbers identities, data, pits, bonus routes, ledges/platforms and all expanded cases; fresh mutable fixtures must remain independent. |

Future changes should compare the retained predicate/path matrix, use deliberately wrong assets/material speeds, missed checkpoint feedback, stale input/replay resets and out-of-bounds geometry as appropriate, then run required normal validation with zero retries. Do not weaken budgets, raise timeouts or use retries to hide failures. The earlier unrestricted-parallel checkpoint recovery loop and the viewport Quarry star failure have unresolved causes; keep their recorded outcomes when investigating drivers.

Checkpoint settling contributes 12 stationary seconds per engine by static arithmetic, but it prevents stale feedback from impersonating the next flag. Redesign observation before removing that guard. Supplemental capture cost is unmeasured: the viewport test alone captures 50 PNGs per engine (five states x ten sizes). Preserve all geometry/input/pixel assertions, screenshot comparisons and failure diagnostics; any moved passing evidence needs an explicit release-capture workflow. Python tests exercise real processing, alpha preservation, all five PNG filters and a generated sheet; keep them unless a separately required job preserves every dependency trigger. Shared fixture cleanup and unit geometry savings are secondary to browser runtime.

## Indirect source coverage

| Module without a direct unit import in the original audit | Existing exercise and limitation |
| --- | --- |
| art/hit-flash | Native adventure damage-flash pixels; do not substitute only health state. |
| core/audio-effects | RetroAudio fake-node units and native preview effects; hardware/listening quality is not certified. |
| core/scene | Actual main boot/frame/screen integration in browser cases. Production preview does not prove the HMR disposal branch. |
| game/menu-overlay | Real pointer/keyboard/controller story/map/pause/finish targets, including fullscreen and focused-Space isolation. Scene target arrays alone do not render a DOM overlay. |
| world/level-kit | Authored levels consumed by generic/per-level model tests and real routes; exercise does not establish every builder branch. |
| main.ts | Default and diagnostic boot, input, requests, menus, pause/focus, audio and story/browser integration. Reconstructed unit loops are complementary. |

## Issue closure status

These dated tables and candidate decisions are submitted for review. They do not complete issue 167: all-engine per-case costs and named skip reporting remain missing, and conditional consolidations are not approved implementations. The scheduling timing requirement is already public in merged PR 174. No removals, merges or moves have been agreed/implemented here, so conditional candidates need one concern per follow-up and named retained contracts before deletion. Missing all-engine per-case costs and named skip reporting remain evidence gaps. Bundled engines do not certify the installed stable/previous browser matrix, Safari on macOS or physical-controller behavior.

These changes are documentation only. Tests, runtime, CI, retries and browser scope remain unchanged. Publishing the audit does not close issue 167 or approve implementing its conditional recommendations.
