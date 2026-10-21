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
