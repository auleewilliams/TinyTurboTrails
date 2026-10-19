# Test consolidation review — owner decision required

## Scope and snapshot

This is a **proposal, not approval or implementation**, for #199. No test,
application, engine, workflow or asset changes are included. Do not close #199
on this documentation PR. Every coverage change still needs explicit owner
agreement, followed by a separate, one-concern implementation PR and red/green
verification.

Reviewed on **2026-10-19 UTC**, against main
`4d3e9debdf0935cf8632b5284f88277750f8b48e` (remote main matched this checkout
when inspected). Line references below refer to that immutable source snapshot;
recheck after rebasing or after #196/#200 land. [Source manifest](source-manifest.json)
records exact source hashes and historical-source drift. These are source-review
results, **not current test execution or branch-coverage certification**.

Starting evidence remains historical and unchanged:
[README](../issue-167/README.md), [18 candidates](../issue-167/candidate-verdicts.csv),
[browser groups](../issue-167/browser-catalogue.csv),
[unit groups](../issue-167/unit-catalogue.csv),
[browser costs](../issue-167/browser-costs.csv), and
[provenance](../issue-167/evidence.json). All four CSVs were parsed, including
68 browser groups, 316 unit groups and 89 historical browser-cost rows. Their
old case totals and costs must not be relabelled as current. The review below
revalidates **all 18 candidate classes**, not every newly added test as an
independently executed suite audit. [Machine-readable decisions](candidate-verdicts.csv)
mirror the rows below.

### Related work is not merged coverage

- **#198** owns the missing all-engine per-case report, named actual skip and
  comparable current costs. No current per-case durations, savings percentage,
  or aggregate skipped-case identity is asserted here. Do not reuse #174's
  scheduling improvement as a consolidation result. Historical Windows costs
  include a failed WebKit Quarry case and missing Firefox costs.
- **#200** owns the phase-sensitive Plains spelling retrace failure. Preserve
  its real-input traversal, zero-recovery assertion, partial-word restoration
  and sticker result. A successful deterministic fixture is not a replacement
  for that failure-sensitive shipped-input route. Do not consolidate it away.
- **Open #196**, inspected at `f8f6f13bf99a6aede895c61ae4ac4ffdef25505c`,
  introduces pouch/tile/Sunset sticker artwork, required-image Retry and visual
  checks. Those are **not main coverage**. Re-review request/decode, drag/focus,
  held-tile/empty-space, native/small and reduced-motion witnesses if it lands.
  Its replay boundary wait is not a solution to the separate #200 encounter.
- **Open #197**, inspected independently at
  `d97d20348a2f817fb47505532a145645b3f9f66c`, is titled documentation but its
  actual diff also adds airborne near-slime braking in `installRetracePilot`.
  Its body still says two Markdown files only; the actual three-file diff is
  authoritative. That unmerged driver adjustment is not assumed present here
  and is not covered by this documentation-only PR's scope claim.

## Revalidated decisions

`Merge`, `move down`, and `remove` below describe possible future work only.
**No removal is currently certified; no engine reduction is proposed.**
A same-title or same-state check at another layer is intentional complementary
coverage unless its caller, clock, input and rendered predicate also match.
Paths are relative to this directory.

| ID / historical candidate | Verdict now | Exact retained witness and current predicate | Why / approval boundary |
| --- | --- | --- | --- |
| C01 Repeated full-route playthroughs | **Defer traversal merge; keep** | `adventure can complete the forgiving route and replay directly with a fresh camera` [browser:1143](../../../tests/browser.spec.ts#L1143): native held-right, nonzero gems, >20 celebration pixels, Space replay and X60. `all checkpoints activate along the ground route and render planted markers` [browser:1420](../../../tests/browser.spec.ts#L1420): each of six flags, fresh feedback, distance <90, grounded feet <=2px, marker attachments. `${biome} trail renders its material, completes and replays` [browser:1729](../../../tests/browser.spec.ts#L1729): native material/atlas witnesses. `milestone ${level.name}: pointer selection, full route, return, replay and next` [browser:2253](../../../tests/browser.spec.ts#L2253) and `signature ${level.name}: nine-star route, native/small evidence and fresh navigation` [browser:2531](../../../tests/browser.spec.ts#L2531) retain session/ribbon/navigation and three-star approach contracts. | Accelerated pilots do not subsume native clocks or actual finish pixels. New spelling activity must be exited before replay. Do not fuse whole routes before #198 costs and #200 reliability evidence; no candidate already contains all predicates. |
| C02 Controller jump #62 | **Keep all three layers** | `accepts any standard face button (A/B/X/Y) as jump, not just button 0` [input:62](../../../tests/input.test.ts#L62): pressed/released mapping. `a controller jump mid-gameplay actually launches the player, not just at the title screen` [controller:14](../../../tests/controller-gameplay.test.ts#L14): A through reconstructed clock/scene lowers Y. `controller jump works mid-gameplay via any face button, not just at the title screen (#62)` [browser:1381](../../../tests/browser.spec.ts#L1381): B through shipped main after A starts. | Mapping, reconstructed integration and actual RAF/main wiring fail independently. New E/D-pad-up activity edges [input:115](../../../tests/input.test.ts#L115) are additional coverage, not replacements. |
| C03 Web Audio unavailable | **Keep both callers; defer move down** | `game remains interactive when Web Audio is unavailable` [audio.spec:71](../../../tests/audio.spec.ts#L71): throwing constructor, preview Start/gem, M muted, Escape paused, no errors. `adventure remains playable when Web Audio is unavailable` [browser:1053](../../../tests/browser.spec.ts#L1053): adventure start, movement and pause with unavailable API. `contains unavailable APIs and rejected browser resume attempts` [audio.test:104](../../../tests/audio.test.ts#L104) guards exception/resume handling. | Two main initialization branches differ. Native audio may skip, so it cannot be the only retained M/Escape witness. Sharing constructor setup is maintenance only; no one-engine split approved. |
| C04 Checkpoint activation overlaps | **Keep layers; defer walking merge** | `activates $id from the ground` [screens:156](../../../tests/screens.test.ts#L156), `catches walking, jumping and swept spring-height passes at every $name flag` [interactions:446](../../../tests/interactions.test.ts#L446), plus exact browser checkpoint case in C01. | Near-flag scene fixtures and swept geometry do not prove ordered feedback through a native full route. The six 2s settling waits protect against stale messages; no shortened budget or removed guard proposed. |
| C05 Collected gem rendering | **Keep** | `keeps a collected gem out of the world until a new run restores it` [interactions:49](../../../tests/interactions.test.ts#L49): active/consumed/recovery/reset state. `omits entities the run has consumed and keeps the rest` [renderer:387](../../../tests/renderer.test.ts#L387): drawWorld predicate. `stops drawing a gem once the adventure collects it` [renderer:440](../../../tests/renderer.test.ts#L440): scene wiring. `a collected gem stops being drawn where it stood` [browser:1528](../../../tests/browser.spec.ts#L1528): airborne pickup, walk back, GEMS 1 and >200 changed cell components. | Native decode/raster disappearance is not mock draw-call or set membership equivalence. New spelling letter pickup/flight is a separate resource/state path. |
| C06 HUD left alignment | **Keep native integration** | `keeps the HUD left-aligned even after a centered overlay ran` [renderer:476](../../../tests/renderer.test.ts#L476) plus `adventure HUD stays left-aligned through keyboard pause and focus loss` [browser:1496](../../../tests/browser.spec.ts#L1496): left 10 after Escape and blur/focus, actual measureText right edge <81. | Mock text state does not prove main overlay sequencing or native font metrics. `adventure keeps its letterbox and pauses on focus loss` [browser:1071](../../../tests/browser.spec.ts#L1071) separately retains 900x600 fractional fit; viewport matrix is not an identical focus sequence. |
| C07 Slime patrol overlaps | **Conditional merge later; keep now** | `a patrolling slime keeps moving while Henry stands still` [browser:826](../../../tests/browser.spec.ts#L826): weighted native pixel strip (200,110,180,90) changes within 5s while X60. `${level.id} uses the common slime atlas, patrols and pauses in play` [browser:2842](../../../tests/browser.spec.ts#L2842): each costume's atlas crop/48px size, count, moving X, pause equality and resumed motion. | Target uses default pointer boot; source uses explicit adventure + Space. Target observes draw coordinates, not the strip. Transplant both boot/input and pixel witness before any deletion; do not silently drop source boot coverage. Preserve squash/side-contact layers listed below. |
| C08 Diagnostic preview scenes | **Keep; defer any move down** | `production canvas loads, scales and recovers from focus loss` [browser:655](../../../tests/browser.spec.ts#L655); `art preview loads local assets and reports a missing atlas` [browser:697](../../../tests/browser.spec.ts#L697); `movement preview accepts keyboard movement and jump input` [browser:751](../../../tests/browser.spec.ts#L751); `world preview loads generated Plains assets and level data` [browser:763](../../../tests/browser.spec.ts#L763); `gameplay preview collects a gem and reaches a checkpoint` [browser:772](../../../tests/browser.spec.ts#L772); `preview switches all tracks and adventure selects music only after starting a level` [music:5](../../../tests/music-browser.spec.ts#L5). | These reachable main branches remain. Pure frame geometry could acquire unit complements, but actual decode/raster/focus/audio/input routes and three engines are retained. No route retirement is agreed. |
| C09 Quarry/Sunset per-level structure | **Defer helper parameterization; keep data/cases** | `registers a playable Quarry Run` [quarry:83](../../../tests/quarry-run.test.ts#L83), `registers a playable Sunset Site alongside the other five routes` [sunset:92](../../../tests/sunset-site.test.ts#L92), each file's `recovers from the pit at $name`, `collects $id with a jump and still finishes`, ledge/spring/platform predicates; Quarry's cache return and ferry recovery variants [quarry:298](../../../tests/quarry-run.test.ts#L298). | Similar helpers do not imply identical pits, bonuses, ledges or ferries. Quarry now adds cache-return witnesses; Sunset still has its own palette, pits, bonus identities and ferry/no-respawn requirement. Do not erase expanded data cases or unify expected data with production builders. |
| C10 Plains world checks | **Conditional merge; not first proposal** | `has stable unique entity IDs and traversable terrain data` [world:9](../../../tests/world.test.ts#L9): validator plus independent IDs/checkpoint nonempty/finish ordering. `$id satisfies generic level invariants` [world:22](../../../tests/world.test.ts#L22): validator, contiguous surfaces, planted and before-finish checkpoints. Retain `registers Plains as the default runtime level` [world:16](../../../tests/world.test.ts#L16), including missing-ID result, and all negatives. | Generic target still lacks direct ID uniqueness, nonempty checkpoint and start/finish order predicates. Transplant those independently of validateLevel before removing standalone positive validation. Small maintenance benefit; no measured runtime estimate. |
| C11 Passing evidence capture | **Defer gating/removal** | `uniform viewport fit keeps story, map, gameplay, pause and finish clear after resizing` [browser:58](../../../tests/browser.spec.ts#L58) retains geometry/hit targets/focus controls across five states and ten sizes. C01 milestone/signature and `all-trail spelling ${level.id}: input-only missing-letter retrace, manual assembly and session sticker` [browser:3396](../../../tests/browser.spec.ts#L3396) retain their functional and failure diagnostics. | Attachments are sometimes visual evidence rather than assertions: marker PNGs alone are not automated marker pixel comparisons. Preserve these obligations explicitly; do not imply screenshots prove unasserted geometry. New spelling captures add native/small dialog states. No phase-level capture-cost profile or agreed release-capture trigger exists yet. |
| C12 Finish layout gem widths | **Keep every case; propose merge of invariant computation only** | `keeps Henry and the stars clear of the text with %i gems` [finish-layout:40](../../../tests/finish-layout.test.ts#L40), counts 0/1/7/42/999; 121 bobs x all 121 sparkle times plus reduced pose and payoff; every bounds/overlap predicate. `fits separate gem and star results on the result row for every star count` [finish-layout:76](../../../tests/finish-layout.test.ts#L76) keeps 0..3. Formatter [finish-layout:58](../../../tests/finish-layout.test.ts#L58), per-level totals/reset [finish-layout:63](../../../tests/finish-layout.test.ts#L63), panel and takeoff/peak/landing cases remain. | First bounded proposal below hoists only pure sparkle construction; **no test deletion, parameter removal, relocation or assertion reduction**. Historical width equivalence does not authorize dropping 1/7; current rendering now also has spelling/finish-grounding paths. |
| C13 Sprite-processing Python tests | **Keep** | `atlas processing removes tinted checkerboard while preserving enclosed details and colored edges` [processing:8](../../../tests/sprite-processing.test.ts#L8), `processes transparent RGBA sheets without stripping white snow or partial alpha` [processing:37](../../../tests/sprite-processing.test.ts#L37), `decodes RGBA rows using all five PNG filter modes` [processing:60](../../../tests/sprite-processing.test.ts#L60), `atlas processing accepts generated RGBA source sheets` [processing:84](../../../tests/sprite-processing.test.ts#L84): real processor/source, pixels/dimensions/RGBA and nine base anchors. | Game rendering does not replace actual processing. A required separate job would need scripts, source assets, expected runtime sheets, tests, Python/toolchain and workflow dependency triggers. No gating change or optional job approved; #196's separate artwork preparation does not subsume this processor. |
| C14 Shared worlds/neutral/audio stubs | **Defer maintenance-only refactor** | Controller fixture [controller:7](../../../tests/controller-gameplay.test.ts#L7), Quarry scene/audio construction [quarry:39](../../../tests/quarry-run.test.ts#L39), and Sunset scene/audio construction [sunset:34](../../../tests/sunset-site.test.ts#L34). Keep each test's fresh player/run, maps, sets, events, mock calls and input source. | New education progress, flattened-slime sets, clock-debt and activity-boundary state increase accidental sharing risk. Any helper must be a factory with isolation regression checks; no singleton mutable fixture. No speedup established. |
| C15 Native AudioContext skip | **Keep; reporting deferred to #198** | `audio stays locked until interaction and supports all effects, mute, pause and stop` [audio.spec:3](../../../tests/audio.spec.ts#L3), conditional native-backend skip at line 22. `app fullscreen retains feedback controls and native map and pause targets` [browser:120](../../../tests/browser.spec.ts#L120) also conditionally skips. Fake lifecycle units, including `gates the squash score on unlock, mute and suspension and releases both voices` [audio.test:63](../../../tests/audio.test.ts#L63), remain independent. | Source conditions do not identify an aggregate skipped result. Retain case/engine/status/reason with failed runs. Native probe covers the listed eight preview effects, not listening quality or physical hardware certification and not every new squash path. |
| C16 All three browser engines | **Keep** | [playwright projects and zero retries](../../../playwright.config.ts#L10); native canvas/pixels/decode, input/polling, focus, media queries, RAF, audio and fullscreen named above, plus viewport/fullscreen diagnostics [browser:2963](../../../tests/browser.spec.ts#L2963). | No engine-independent replacement has been demonstrated. Unit complements may add coverage, not authorize downgrades. Bundled WebKit is not installed Safari certification; physical controller/audio ergonomics remain manual. |
| C17 Indirect module coverage | **Keep; inventory below** | [main](../../../src/main.ts#L41), [SceneHost](../../../src/core/scene.ts#L17), [menu overlay](../../../src/game/menu-overlay.ts), [level builders](../../../src/world/level-kit.ts#L21), browser damage and audio effects as named below. | Source exercise is not complete branch coverage. New education overlay and rendering must remain in the caller inventory. HMR disposal is still not proved by production-preview boot tests. |
| C18 specials zero-reward finish | **Keep; reject route replacement** | `$name can finish with no special rewards` [specials:168](../../../tests/specials.test.ts#L168) assigns finish position, expects zero specials, exits education if open and checks Replay. `$name reaches all three stars from the start with ordinary controls` [specials:93](../../../tests/specials.test.ts#L93), actual per-level traversals, C01 signatures and new spelling retraces remain. | Teleport-to-finish tests finish/menu without stars, not full traversability. Timbers stars/landing bands and failed-approach entries changed since historical audit; do not retain old coordinate assumptions. |

## New main coverage that changes the old risk assessment

These are additions to the retain inventory, not a reason to prune old layers:

- **Static obstacles versus live slimes:** `$name static obstacle/scenery contacts
  have no damage, knockback or protection effects`, `$name walks through every
  static obstacle without blocking or changing the terrain trajectory`, and
  `$name still applies slime-side damage, knockback, flash and short protection`
  [obstacle tests:8–67](../../../tests/obstacle-pass-through.test.ts#L8) cover all
  six authored levels. They explicitly require nonempty prop sets, compare the
  entire player trajectory to empty-entity control, and check health/flash/
  invulnerability and side-damage events. `Timbers static prop passage preserves
  hearts while slime-side contact still hurts` [browser:2136](../../../tests/browser.spec.ts#L2136)
  observes shipped hearts at X750/820 versus X1700. These are complementary,
  not redundant hazard checks. Existing route-driver hazard avoidance is not
  proof that static props damage the player; those semantics changed.
- **Slime squash:** [model](../../../tests/slime-squash.test.ts),
  [scene/audio consumers](../../../tests/slime-squash-scenes.test.ts),
  [regressions](../../../tests/slime-squash-regression.test.ts), and
  `$name flattens the original costume at its ground anchor, with a still
  reduced-motion pose` [slimes:98](../../../tests/slimes.test.ts#L98) retain
  swept-top versus side/near-miss rules, one bounded impulse, simultaneous-top
  stable ordering, persistence through recovery, run reset, original costume
  and reduced-motion geometry. Old patrol/damage/pixel cases do not subsume
  these. Conversely squash fixtures do not replace native idle pixels.
- **Spelling/manual assembly:** [all-trail education](../../../tests/all-trails-education.test.ts)
  retains independent words/repeated identities, partial assembly through
  recovery/replay/switch, every missed-letter retrace (including crumbled
  Quarry), accessible labels and session map status. [education tests](../../../tests/education.test.ts)
  retain wrong/cancelled drag rollback, both Es, removed sign route, optional
  collection, finish return, buffered-jump clearing and no automatic rewards.
  [frame boundary](../../../tests/education-frame.test.ts#L11) retains discarded
  activity clock debt. Native browser cases [browser:3050](../../../tests/browser.spec.ts#L3050)
  through [browser:3396](../../../tests/browser.spec.ts#L3396) retain actual input,
  focus/drag, missing-letter return, viewport bounds and session/reload behavior.
  The six-trail case explicitly requires `recoveries` to equal `[]` at line
  3510. This is the #200-sensitive witness, not a candidate for deletion.
- **Finish feet:** `$name plants both visible finish feet on the collision
  surface, excluding PNG padding` [grounding:27](../../../tests/finish-grounding.test.ts#L27)
  and `keeps the finish pillars vertical while seating both feet along a slope`
  [grounding:46](../../../tests/finish-grounding.test.ts#L46) complement
  `finish artwork pixels meet terrain in all six trails, including the sloped
  beach exit` [browser:2005](../../../tests/browser.spec.ts#L2005). Pure finish-panel
  bounds and star/celebration overlap do not cover these world-space anchors.

## Indirect caller/path inventory — retain before any move or deletion

| Source path | Exact retained exercise / predicate | Limitation |
| --- | --- | --- |
| `src/main.ts`, `src/core/input.ts`, `src/core/scene.ts` | Default Space boot [browser:861](../../../tests/browser.spec.ts#L861), controller start/pause/D-pad [browser:1331](../../../tests/browser.spec.ts#L1331), midgame B jump [browser:1381](../../../tests/browser.spec.ts#L1381), delayed-RAF release [browser:995](../../../tests/browser.spec.ts#L995), disconnect [browser:1095](../../../tests/browser.spec.ts#L1095), and all diagnostic boots in C08. | Reconstructed controller unit does not execute shipped main. SceneHost enter/update/render/change are exercised indirectly; HMR disposal and every error branch are not certified. |
| `src/game/menu-overlay.ts` | Pointer/Tab/Enter/focused Space return and focus cancellation [browser:1256](../../../tests/browser.spec.ts#L1256), controller held-action clearing [browser:1287](../../../tests/browser.spec.ts#L1287), fullscreen native targets [browser:120](../../../tests/browser.spec.ts#L120), story controls [browser:2717](../../../tests/browser.spec.ts#L2717). | Scene menu target arrays alone do not prove DOM targets, focus or event propagation. |
| `src/core/audio.ts`, `src/core/audio-effects.ts`, main audio callers | Native unlock/effect/mute/pause/stop [audio.spec:3](../../../tests/audio.spec.ts#L3); unavailable preview/adventure C03; `movement sounds follow run and landing, and stop on idle, jump, mute, pause and focus loss` [browser:313](../../../tests/browser.spec.ts#L313); music switching [music:5](../../../tests/music-browser.spec.ts#L5); fake-node disposal/squash units C15. | Native probe may skip; API correctness is not physical listening quality. Keep always-running main control checks. |
| `src/art/hit-flash.ts`, renderer and HUD callers | `adventure flashes the sprite after damage without a rectangular overlay` [browser:781](../../../tests/browser.spec.ts#L781), three/empty heart pixels [browser:805](../../../tests/browser.spec.ts#L805), native HUD C06, consumed-gem state/draw/scene/native chain C05, static-prop versus slime hearts [browser:2136](../../../tests/browser.spec.ts#L2136). | Health state alone cannot substitute for drawn pixels; screenshot attachment alone is not an automated image assertion. |
| `src/world/level-kit.ts` and authored levels | `contourTerrain`, grounded entities, default/explicit-base gems, thing/patrol, decoration, checkpoint data/entities are consumed by levels. Generic world invariants [world:22](../../../tests/world.test.ts#L22), per-level identities/bonus/pit/ledge/platform checks C09, native routes C01, grounding and obstacle witnesses above. | Shared builder-backed expectations can mask builder mistakes; preserve independent constants/predicates. Not every malformed builder argument/branch is directly tested. |
| Education overlay, main menu and world renderer | Browser manual assembly pointer/keyboard/controller [browser:3174](../../../tests/browser.spec.ts#L3174), missing-letter held-actions/clock-debt [browser:3244](../../../tests/browser.spec.ts#L3244), six-trail recovery-free retrace C18/new inventory, collection session/reload [browser:3128](../../../tests/browser.spec.ts#L3128). | Unit overlay targets do not replace native drag/focus/input; #196's image/decode obligations are not yet on main. |

## First bounded proposal: finish-layout invariant construction only (C12)

**Decision requested:** approve a separate test-only PR limited to
`tests/finish-layout.test.ts`, hoisting the bob-independent sparkle rectangle
construction out of its nested bob loops. This is the easiest clearly bounded
computation reduction found here; it is **not claimed to be the largest suite
wall-time saving**. No implementation is authorized by publishing this plan.

### Exact scope

1. Keep all six registrations / 15 expanded cases, counts **0,1,7,42,999**, every
   one of the **121** time/bob samples, all four star counts, reduced-motion
   sparkles, payoff bounds, formatter and all six level total/reset predicates.
2. Compute `times.flatMap(time => celebrationStarRects(time))` and
   `celebrationStarRects(0, true)` once in the describe fixture. Reuse those
   read-only rectangles in both existing loops. Continue constructing the
   Henry rectangle **for each bob**. Keep the payoff included exactly where it
   currently participates. Do not hoist assertions, deduplicate samples, change
   parameterization or change failure messages.
3. Preserve the exact ordered predicate-input multiset, including intentional
   duplicate sparkle comparisons across bobs/counts. Helpers are currently pure
   ([adventure:50–56](../../../src/game/adventure-scene.ts#L50),
   [sparkles:21–28](../../../src/game/celebration.ts#L21)): no run state, random
   source, clock or side effect. No code mutates the returned rectangles in
   this file. Recheck purity and aliasing immediately before implementation.

### Why this is proved narrow; what is not proved

The two target loops evaluate the same 121 sparkle times plus one reduced call
for each of 121 bobs across five gem cases and four star-count iterations.
Static call arithmetic is **132,858 -> 122** `celebrationStarRects` invocations
if the two invariant arrays are shared at describe scope. Henry's bob-dependent
**1,089** constructions and **all existing assertions remain**. This is a
construction-count estimate only: it is not a measured speedup, assertion-count
reduction, memory benchmark or promise about suite critical path. Assertions
may dominate runtime. Historical 15,446.303ms for the gem-width group is an old
Windows observation, not a cost at this source or an expected saving.

### Failure preservation / acceptance before merging the later PR

| Existing failure mode | Exact retained test/predicate | Required red-capable validation |
| --- | --- | --- |
| Henry leaves panel at a particular bob / wrong anchor | `keeps Henry and the stars clear of the text with %i gems`: `inside(rect,panel)` for each bob and every gem parameter | Deliberately offset Henry outside panel at one sampled bob; original and proposed harness must both fail, then pass after restoring production code. |
| Sparkle timing/extent enters text or leaves panel | Same group: all sampled `celebrationStarRects(time)` plus reduced pose, panel containment and overlap against every text/control rectangle | Sabotage a sampled normal sparkle and separately the reduced pose; both harnesses fail. Include a nonzero time to catch accidental first-frame-only caching. |
| Payoff/button/prompt overlap or out of bounds | Same group: payoff and all title/result/action/prompt rectangles, text bounds and adjacent nonoverlap | Move payoff or action/prompt across the boundary; both harnesses fail. Do not replace these with screenshot existence. |
| Count-dependent text width / formatter regression | All five original gem cases, `shows gems collected against the total in the same shape as stars`, per-level totals | Widen result text or change formatter; both harnesses fail without dropping 1/7 or changing total 999. |
| Separate gem/star result collision at any star count | `fits separate gem and star results on the result row for every star count`: both boxes inside, mutual nonoverlap, art clear of both | Force star box into gem/art area; both harnesses fail for retained 0..3 loop. |
| Level total/reset regression | `derives the %s gem total from level data`: createRun total >0, mutation followed by startNewRun restores total, box fits | Sabotage gem-total initialization/reset; both harnesses fail. |

For the approved implementation, first collect the original ordered predicate
inputs and proposed ordered predicate inputs in throwaway instrumentation and
compare them exactly (not set equality: duplicates matter). Do not commit that
instrumentation or production sabotage. Save named original/proposed red results
and restored-green reports with the exact source/head SHAs. Run focused Vitest,
then `npm test`, `npm run typecheck`, `npm run build`, and normal required CI.
No browser test/engine/input change is proposed; any expanded scope requires new
approval and relevant browser validation. No timeout, traversal budget, retries,
assertion or failure suppression change is allowed.

Measure focused and suite before/after on the **same environment, toolchain,
worker settings and comparable source cohort**, retaining every failed outcome.
Coordinate with #198; do not mix old Windows costs with fresh Linux costs or
subtract #174 scheduling results. If construction hoisting produces negligible
benefit, report that honestly rather than expanding to parameter deletion.

## Follow-up order / decisions still needed

1. Owner reviews C12 and approves or rejects its exact computation-only scope.
2. Reporting #198 and reliability #200 proceed independently. No browser pilot
   implementation PR should race their shared helpers or claim their work.
3. If later approved, C07 can transplant the exact idle-pixel **and boot/input**
   witness before considering one standalone registration removed (one per
   engine); its runtime benefit is unknown. Keep all data/model/squash layers.
4. C10 direct-predicate transplant is another small, separate option. C09/C14
   helper factories are maintenance, not demonstrated performance gains.
5. Only after reliable current costs and a full assertion/path matrix should
   C01 native Plains checkpoint/finish traversal sharing be considered. Keep
   native clocks, ordered grounded flags, fresh feedback/marker evidence,
   celebration pixels, actual Space release/replay and camera reset. Preserve
   biome materials, special routes and new spelling retraces separately.
6. C03/C08/C11 engine, route, layer or evidence allocation changes remain
   explicitly deferred, not approved by this review.

## Validation of this documentation change

- Historical candidate names/count reconciled against all 18 rows; each has one
  current verdict and retained-predicate rationale above and in the CSV.
- Relative file links and source-line bounds checked programmatically; exact
  named single-line browser registrations checked against current source.
- Exact source hashes and historical unit-file drift recorded in the manifest.
- `git diff --check` and docs-only changed-path guard required before commit.
- No full browser or unit suite run for this proposal; no sabotage performed,
  no runtime pass or measurable speedup claimed. Implementation acceptance and
  owner approval remain outstanding.
