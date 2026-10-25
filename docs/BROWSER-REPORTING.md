# Browser report retention and readback

For #198. This adds reporting, not test consolidation or new skip policy.
The dated [#167 audit](evidence/issue-167/README.md) remains historical; its
unidentified aggregate skip is not retroactively attributed to a named test.

## Subsequent runs

`npm run test:browser` preserves dot console output and writes Playwright's native
JSON to **`test-results/browser-report.json`**. It includes nested case titles,
source locations/IDs, project names, outcome/expected status, individual attempt
status/duration in milliseconds, annotations (including available skip reasons),
errors and attachment paths. Existing failure traces/screenshots remain unchanged.
No retries, assertions, timeouts, traversal budgets or engines are changed.

For a full local run:

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run build
BROWSER_REPORT_SOURCE_SHA="$(git rev-parse HEAD)" npm run test:browser
# Run these even when the browser command fails:
PLAYWRIGHT_JSON_OUTPUT_FILE=test-results/configured-cases.json npx playwright test --list --reporter=json
node scripts/browser-report.mjs test-results/browser-report.json test-results/configured-cases.json test-results/browser-summary.json
```

Run the list command **after execution**: Playwright clears its output directory
at execution startup. `--reporter=json` replaces the configured reporters for the
list invocation; its explicit environment path never overwrites execution JSON.
A list report is discovery only: its empty result arrays and apparent skipped
counts are **not executed skips**. For filtered runs apply the **same filters** to
the list invocation; the normal CI job always runs the entire configured matrix.
Do not run two suites against the same output directory concurrently.

The dependency-free summarizer compares exact case-ID/project identity sets,
rejects duplicates and missing attempts, and reconciles enumerated outcomes
against native aggregate `expected`, `unexpected`, `skipped` and `flaky` counts.
It retains failures/skips beside timings; successful reconciliation is not a
green-test verdict. Native JSON and the browser step's exit code are authoritative
for failures, including global errors. A killed runner may not finish the report;
missing/incomplete evidence must not be interpreted as passing or zero skips.

CI sets `metadata.sourceRevision` from the actual checked-out commit (normally a
PR merge SHA, **not** the PR head). Node version/platform/architecture are also
recorded. Record both PR head and tested merge SHA when citing PR measurements.
A local run omitting `BROWSER_REPORT_SOURCE_SHA` leaves that field null rather than
inventing provenance. Reporter overrides can change these defaults; inspect the
native report config when reproducing another run.

## Retrieve and verify CI artifacts

The existing `browser-test-results` artifact uploads all of `test-results/` with
`if: always()`, including failed browser runs. The report, configured list and
reconciled summary are non-hidden files beside existing screenshots/traces.
Reconciliation also runs after a browser failure; it cannot make a failed browser
step successful. Upload still runs if reconciliation fails.

```sh
gh run view RUN_ID --repo auleewilliams/TinyTurboTrails --json headSha,conclusion,jobs
gh run download RUN_ID --repo auleewilliams/TinyTurboTrails --name browser-test-results --dir DOWNLOADED_DIR
node scripts/browser-report.mjs DOWNLOADED_DIR/browser-report.json DOWNLOADED_DIR/configured-cases.json DOWNLOADED_DIR/readback-summary.json
```

Compare readback totals and per-project counts with the browser console summary,
and inspect skipped cases' `annotations`/`skipReasons`. Verify the downloaded
report's source revision matches the checkout in that run. Artifact retention is
bounded by repository/Actions retention settings; committed measurement evidence
under `docs/evidence/issue198/` is a bounded snapshot, not permanent full logs.

## Opt-in attachment verification

The three positional arguments retain their existing behavior and summary shape.
To also verify file attachments in a downloaded artifact, append
`--artifact-root ROOT`, where ROOT is the directory containing the uploaded
**contents of `test-results/`** (not its parent):

```sh
mkdir -p test-results
node scripts/browser-report.mjs DOWNLOADED_DIR/browser-report.json DOWNLOADED_DIR/configured-cases.json test-results/verified-summary.json --artifact-root DOWNLOADED_DIR
```

The API is `summarizeBrowserReport(report, configuredReport, { artifactRoot })`.
Verification visits every nested case/project/result, including failed attempts,
retries and skipped results. With verification enabled, the written summary and
console JSON include `attachmentVerification` with `checked`, `inline`, `missing`,
`invalid` and `diagnostics`. `checked` counts successfully verified file references,
including repeated references to the same file; `inline` counts attachments with
an absent or empty string path (body content needs no file). Other path types,
blank-only strings, NUL characters, malformed attachment entries and malformed
traversal containers are invalid. Invalid containers count as one diagnostic each; unseen children
cannot be counted. Missing and invalid references fail the command with exit 1
and diagnostics on stderr, including available case ID/title, project,
zero-based attempt/attachment indices, retry number and original reference.
The API throws with these totals in `error.attachmentVerification`.

Supported path conventions are deliberately narrow:

- Artifact-relative paths such as `case/attachments/image.png`, optionally prefixed
  with `test-results/`, resolve under ROOT.
- Absolute CI paths such as
  `/home/runner/work/repo/repo/test-results/case/attachments/image.png` resolve
  using the exact suffix after the single `test-results` path component. POSIX,
  Windows drive-absolute (`C:/...`) and UNC (`//server/share/...`) forms are
  recognized. Forward and backslashes are normalized as separators.
- Absolute paths without exactly one `test-results` component, drive-relative
  paths, URL schemes and colon-containing non-drive paths are rejected. There is
  no basename search or fallback to the original absolute host path. Any literal
  `..` component is rejected before normalization, including one before the CI root.

Files must exist, be regular files and open for reading. Internal symlinks are
allowed, including parent traversal within their targets when every visited
directory stays inside ROOT. Targets are checked component by component before
processing `..`; an intermediate outside symlink is rejected even if string
normalization would hide it. Absolute symlink targets must start with the literal
canonical ROOT path; non-canonical aliases are conservatively unsupported.
Symlink targets outside ROOT (including dangling escapes) and loops are
rejected before inspecting outside targets. Use a finished, unmodified downloaded
artifact during verification; this tool does not lock directories against
concurrent replacement. No attachment content is decoded or compared with visual
expectations. A failed command does not write/replace OUTPUT; any pre-existing
output is stale and its presence must not override the command's exit status.

Reconciliation and complete attachments **do not establish test success or image
correctness**. Native failed attempts, skips, errors and their annotations remain
in the summary, and the browser command's exit code retains its meaning.

### Historical readback for issue #205

On 2026-10-22 the opt-in CLI read the existing downloaded [PR #204 browser
artifact](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/39689017770)
without modifying it. Recomputed results: 375 configured/enumerated identities,
374 expected, zero unexpected/flaky, one Firefox native-audio skip; 525 checked
file references, 432 inline, zero missing/invalid. Its source revision is
`291db2af5b4c9e69b8bebdccc68207d0bf8f4b0c`, the historical #204 tested merge,
**not** the implementation branch for #205 or new browser execution evidence.

Synthetic reports in `scripts/browser-report.test.mjs` are explicitly fixtures.
Test-first slices retained local RED/GREEN logs under ignored
`test-results/issue205/`: basic API/CLI behavior (5 pass/3 fail, then 8 pass),
path relocation/containment (8 pass/3 fail, then 11 pass), malformed data
(12 pass/2 fail, then 14 pass). Real fixture directories use the invoking Hermes
scratch `TMPDIR`, not system `/tmp`. A temporary sabotage suppressing the
missing-file failure produced 11 pass/3 fail (API, CLI and failed-attempt tests);
the original implementation was restored exactly. Full downloaded artifacts are
not committed. The initial implementation passed 15 reporting tests and 41 script
tests, but independent review found an indirect symlink escape: `sub -> OUTSIDE/deep`
and `link -> sub/../x` could incorrectly certify ROOT's `x` instead of rejecting
the outside target.

The follow-up added real-filesystem regressions before changing the verifier:
15 passed/6 failed, then 21 passed after preserving target component order.
Fixtures cover relative and absolute targets, existing and dangling escapes,
legitimate internal sibling traversal, dangling internal targets with decoy files,
and traversal through a regular file. Native filesystem resolution confirms the
fixture destinations. Outside fixture directories are made inaccessible while
verifying, so an attempted outside inspection cannot satisfy the escape diagnostic.
Temporarily restoring the old verifier reproduced 15 passed/6 failed; the fix was
restored byte-for-byte and all 21 reporting tests passed again. Follow-up logs use
the `review-` prefix under ignored `test-results/issue205/`.

The follow-up full script suite passed 47 tests; the two-worker unit run passed
961 tests across 52 files (70.82s). Typecheck, production build, whitespace and
relative documentation-link checks passed. Read-only historical artifact
verification again counted 525 verified references and 432 no-path entries, with
zero missing/invalid. Full local browsers were not run for this reporting-only change.

## Desktop support check guidance

The [canonical device/input and browser policy](REQUIREMENTS.md#supported-devices-and-input)
is desktop/laptop only for now. Existing automated coverage in
[`tests/browser.spec.ts`](../tests/browser.spec.ts) checks uniform viewport fit,
map/play/pause/finish layout after resize, fullscreen where available, native
menu targets/focus, keyboard/pointer actions and simulated standard-controller
navigation. Narrow/tall viewport cases exercise desktop-window layout; they do
not establish phone/tablet or touch-gameplay support. Bundled Chromium, Firefox
and WebKit results do not certify the installed target-browser matrix, including
Safari on macOS.

For an owner-led desktop check, use the existing [controls](../README.md#controls):

- Resize a desktop window through wide, narrow and tall shapes, then enter and
  exit fullscreen where available. Check that the complete 426×240 view keeps
  its proportions and that HUD, readable menus, labels and native targets stay
  clear of clipping, overlap and page overflow.
- Choose/start a trail, move/jump and use finish actions with a keyboard; repeat
  with a physical standard controller when available. Check deliberate input
  after screen transitions, focus loss and controller disconnect/reconnect.
- Use visible Pause/Resume and independent Sound/Rumble settings from map, play
  and results with keyboard, pointer and available controller input. Check
  On/Off text, focus return and the live-run Return to Trails confirmation.
  Try pointer selection and optional word-building separately from gameplay.

These are check instructions, not results or new release blockers. Record date,
exact source commit, OS, desktop/laptop device, installed browser/version (or
bundled engine), viewport/fullscreen state, input method and controller model
when used, steps, actual outcomes and any coaching. Identify simulated input;
mark unavailable or unperformed combinations **not run**. Assistive-technology
observations need the actual AT/browser/input environment. Do not infer physical
controller, audible output, native Safari, AT or child acceptance from automation.
The completed owner map/navigation checks for #195/#213 remain completed; they
do not automatically accept the later Pause/settings surface or those other
environments. This guidance does not reopen the historical manual worksheet or
extend its dated waivers.

## Conditional coverage versus physical verification

Keep conditional tests enabled. The native audio test in `tests/audio.spec.ts`
probes whether a user-activated native `AudioContext` reaches `running`, then tests
API/node-start, mute, pause and stop behavior. It should run on a host with a
working browser audio backend; a native clock/API pass is **not** proof of audible
speaker/headphone output or sound quality. Inspect each run's named report rather
than assuming which engine skips it.

The two fullscreen cases in `tests/browser.spec.ts` check
`document.fullscreenEnabled`; they should run where native fullscreen is exposed.
A capability skip is not fullscreen verification on unsupported headless ports.
Controller polling, event and rumble-call probes are automated API tests, not
proof of physical controller compatibility, physical vibration or subjective
feedback. Speaker/headphone listening, real controller/rumble checks, and native
fullscreen behavior on target desktop hardware remain manual release checks.

Per-case costs are single-run observations (including setup/scheduling effects),
not benchmarks, performance budgets or statistical guarantees. A skipped case's
nonzero duration is time spent reaching its skip, not coverage of the skipped body.
