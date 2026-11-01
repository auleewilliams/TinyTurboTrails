# Sunset steel planning evidence

This packet records the unchanged Sunset baseline at
`885b6c16d5397e061f1ccb40ca326856bc77db88`, inspected 2026-11-01.
It supports the [steel artwork proposal](../../sunset-art-plan.md). This baseline
is separate from the later [implemented preview packet](preview-01/README.md);
neither packet constitutes owner visual acceptance.

## Recorded verification

- Dependency installation (`npm ci`) and production build/typecheck passed.
- Full unchanged Vitest suite passed: 1,943 tests in 97 files. Log retained at
  `test-results/issue-242/planning-units.log`.
- Four existing, unchanged Chromium cases passed with one worker and zero retries:
  main route at 426px and 320px viewports; actual finish/full missed-BEAM retrace;
  optional crane boarding, carrying and disembarking in both directions.
- One additional planning capture passed: nine input-reached locations, each at
  426px and 320px viewports, with native and CSS screenshots (36 PNGs total).
  All 52 observed same-origin response bodies match the local production build.
- The 426 viewport canvas is 426×240 CSS/logical pixels. The 320 viewport canvas
  is 320×180.28125 CSS pixels; its enclosing screenshot is 320×181 pixels. The
  native framebuffer remains 426×240. These measurements are separate.
- All 36 planning PNG file hashes and decoded dimensions were checked against
  the manifest. Source hashes for every tracked `src/` and `public/` file match
  the inventory. The accompanying audit records an initially incorrect CSS
  rounding assumption and its correction; the captures were not changed.
- A planning-only simulation ran the existing exact all-gem input journey on
  both the unchanged level and a registered in-memory clone with the38 proposed
  gem moves. Both collected all62 gems and finished. No production file changed.

The existing test runner drives DOM keyboard events using the repository's
bounded keyboard pilot. The additional capture holds that pilot's clock only
while taking paired screenshots of a reached pose. It does not reposition Henry
or inject scene/run state. This is automated native rendering/input evidence,
not physical-keyboard, child, owner-enjoyment, or final artwork acceptance.

The preserved historical 45-second missed-letter timing failure is unrelated
to these passes; no cause or fix is claimed. This selected baseline is not the
full configured three-engine suite or an implementation validation gate.

## Files

- [inventory.json](inventory.json): all 40 supports, five terrain segments,
  eight equal-height joins, four scenery anchors, actual Henry alpha bounds,
  all62 gem/letter/support associations, proposed exact38 gem changes and hashes.
- [capture-manifest.json](baseline/capture-manifest.json): actual route histories,
  viewport/native/CSS sizes, browser version, PNG hashes and served/build hashes.
- [baseline-audit.json](baseline-audit.json): independent image/body readback.
- [proposed-gem-simulation.json](proposed-gem-simulation.json): unchanged and
  hypothetical gem-adjustment simulation histories, events and route-source hash.
  Reproduce with [probe-proposed-gems.mjs](probe-proposed-gems.mjs) into a separately
  versioned output after preserving the original. The first probe attempt did
  not register the clone in `LEVELS`; `startSelected` fell back to Plains and
  stalled at the first jump (feet197.890688, target500). The corrected fixture
  temporarily registers the clone in the isolated process and checks the Sunset
  start explicitly. This was a planning harness error, not a game regression.
- [regression-report.json](regression-report.json): file-backed copy of the four
  existing test results and their original case identities/attachments.
  The original inline report remains unchanged at
  `test-results/issue-242/baseline-existing/report.json`, hash recorded in the copy.
- [baseline.capture.ts](baseline.capture.ts) and
  [capture.config.ts](capture.config.ts): separate planning harness. The canonical
  Playwright config and regression test files are unchanged.
- `test-results/issue-242/planning-capture/report.json`: original planning test
  report. Capture output is intentionally write-once; preserve earlier results
  before repeating with a separately versioned output destination.

## Representative before views

| Location | Native framebuffer | Small CSS screenshot |
| --- | --- | --- |
| Stacked underpass | [426×240](baseline/stacked-underpass-426-native.png) | [320×181](baseline/stacked-underpass-320-css.png) |
| High deck | [426×240](baseline/high-deck-426-native.png) | [320×181](baseline/high-deck-320-css.png) |
| Under the moving ferry | [426×240](baseline/below-ferry-426-native.png) | [320×181](baseline/below-ferry-320-css.png) |
| Far dock | [426×240](baseline/far-dock-426-native.png) | [320×181](baseline/far-dock-320-css.png) |
| Descent | [426×240](baseline/descent-426-native.png) | [320×181](baseline/descent-320-css.png) |
| Lower yard | [426×240](baseline/yard-426-native.png) | [320×181](baseline/yard-320-css.png) |
| Rest deck | [426×240](baseline/rest-426-native.png) | [320×181](baseline/rest-320-css.png) |
| Roof | [426×240](baseline/roof-426-native.png) | [320×181](baseline/roof-320-css.png) |

## Commands used

```sh
npm ci
npm run build
BROWSER_REPORT_SOURCE_SHA=885b6c16d5397e061f1ccb40ca326856bc77db88 PLAYWRIGHT_PORT=4242 npx playwright test tests/sunset-scaffolds.spec.ts --project=chromium --workers=1 --grep 'Sunset fixed main route has zero BEAM letters at (426|320)px|Sunset optional crane boards|Sunset actual finish retrace' --output=test-results/issue-242/baseline-existing/artifacts --reporter=json > test-results/issue-242/baseline-existing/report.json
node scripts/inventory-sunset-art.mjs
BROWSER_REPORT_SOURCE_SHA=885b6c16d5397e061f1ccb40ca326856bc77db88 PLAYWRIGHT_PORT=4243 npx playwright test -c docs/evidence/issue-242/capture.config.ts --project=chromium
```

The shared T3 browser could not start because this host blocks its sandbox
(AppArmor); the repository Playwright browser ran successfully. No host security
configuration was changed.

The capture harness also passed an explicit standalone TypeScript check:
`npx tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --lib ES2022,DOM --types vite/client,node docs/evidence/issue-242/baseline.capture.ts docs/evidence/issue-242/capture.config.ts`.
The first invocation omitted TypeScript7's required `--ignoreConfig` for explicit
file arguments; the second omitted the `node` type set. Those command setup
errors were corrected without changing the project config or capture source.
