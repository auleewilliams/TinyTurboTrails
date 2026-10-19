# #198 current browser timing and skip evidence

Measured **2026-10-19 UTC**, reporting only. The [#167 audit](../issue-167/README.md)
remains historical; this snapshot does not identify that audit's missing skip.

## Immutable source and environment

- PR #202 measured head: `732484288d6f2fb92859c4aced1406b6ca47ba54`.
- Actual checked-out/tested PR merge: `31d37007bd773cc936c5993bb60d77da8c697328`,
  against base `4d3e9debdf0935cf8632b5284f88277750f8b48e`.
- [CI run 39337249785](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/39337249785)
  completed successfully; `check` passed (including Docker build and deployment
  smoke tests with **push disabled**), `publish` skipped as intended for a PR.
- GitHub-hosted `ubuntu-24.04`, image `20261012.334.1`, runner `2.337.0`, Linux x64,
  Node `v22.23.3`, Playwright `1.64.0`, two workers, zero retries.
- Installed browser distributions from run logs: Chromium headless shell
  `156.0.8078.4`/build `1248`; Firefox `157.0`/build `1555`; WebKit `27.2`/build `2370`.

These measurements precede this evidence-only commit. Later-head CI verification
belongs to the PR check/verification thread, not a retroactive change to these
source-labelled costs. No gameplay/test/driver changes are included here.

## Enumerated costs and reconciliation

[`browser-costs.csv`](browser-costs.csv) contains **336 actual attempt rows**, one
per configured case/engine, with ID, file/line/column, full title, project, outcome,
expected status, actual attempt status, duration in milliseconds, retry index and
available skip reason. [`summary.json`](summary.json) records provenance, exact
counts, named skips, attachment checks and downloaded-report SHA-256 hashes.

| Engine | Configured / emitted | Passed | Failed | Skipped | Sum of attempt durations (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Chromium | 112 / 112 | 112 | 0 | 0 | 1,055,722 |
| Firefox | 112 / 112 | 111 | 0 | 1 | 1,093,088 |
| WebKit | 112 / 112 | 112 | 0 | 0 | 1,254,960 |
| Total | 336 / 336 | 335 | 0 | 1 | 3,403,770 |

Exact `(case ID, project)` sets match the independently generated configured list;
no missing, duplicate or substituted cases. Native aggregates and console both
report **335 passed, 1 skipped**, no failures/flaky cases/global errors. Browser
report elapsed time: `1,729,903.757 ms` (console rounded to `28.8m`). Attempt sums
are not wall time: parallel cases and native-route-lock waits affect both. These
are single-run descriptive observations, not benchmarks or guarantees. All
outcomes remain in the cost table, including the skipped attempt's `2,727 ms`.

## Actual conditional skip (not inferred from aggregate output)

Exactly one named skip was emitted:

- **Firefox**, `tests/audio.spec.ts:3`,
  **audio stays locked until interaction and supports all effects, mute, pause and stop**.
- Annotation from `tests/audio.spec.ts:22`:
  **Native AudioContext cannot run on this host; requires an audio backend.**
- The user-activated native `AudioContext` probe did not reach `running` within
  the existing 1,500 ms probe timeout. This is a host/backend capability outcome,
  not evidence that the rest of the audio test body ran, nor a universal claim
  about Firefox. This case passed in Chromium and WebKit in this same run.
- Expected execution: Firefox on a host with a working browser audio backend
  whose user-activated native context reaches `running`; rerun the unchanged test
  there. The test exercises native audio API/node-start/mute/pause/stop state,
  **not** audible speaker output or subjective sound quality.

Both conditional fullscreen cases ran/passed in **all three engines**; neither
produced a skip. Automated controller/rumble-call coverage remains API-level.
Real speaker/headphone listening, physical controller input/vibration and target
hardware fullscreen checks remain manual release work; see
[reporting/coverage guidance](../../BROWSER-REPORTING.md#conditional-coverage-versus-physical-verification).

## Real artifact readback

Downloaded **`browser-test-results` artifact `12228850731`** from that completed
run using `gh run download`, rather than reading a workspace report and assuming
it was uploaded. Its non-hidden root files include:

- `browser-report.json` — native report (61,557,799 bytes; full errors, annotations,
  stdout and attachments retained by Playwright).
- `configured-cases.json` — discovery listing only, not executed skips.
- `browser-summary.json` — reconciled per-case summary.

Reran `node scripts/browser-report.mjs` against the **downloaded** native report
and configured list; its parsed output exactly equals the uploaded summary.
An independent Python walk reconciled all 336 case/project identities, native
aggregates, per-engine counts and the CSV row count. Checked all **471 referenced
file attachments** exist in the downloaded artifact; none missing. Hashes and
artifact digest are in `summary.json`. Full logs/native JSON and local probes
are retained outside Git in scratch `issue198-evidence/`; no screenshot churn or
large native-report dump is committed.

## Failure-path verification and limits

A focused local `audio.spec.ts` probe exercised the native report on an actual
failed run: **6 configured/emitted = 1 passed + 4 failed + 1 skipped**. Four launch
failures were missing Chromium/WebKit binaries in the default local Playwright
cache, not gameplay assertions. Firefox emitted the named native-audio-backend
skip; its Web Audio-unavailable fallback case passed. Native execution JSON and
failure traces survived the after-run listing, and reconciliation retained all
four failed attempt statuses/durations. This local probe is **not** full browser
success and is not the source of the cost table above.

CI's actual observed run was successful, so it does not claim an observed failed
CI upload. The unchanged directory uploader and reconciliation use `if: always()`
(the latter gated on browser-step execution), cover the same non-hidden native
report path, and do not suppress a browser failure exit code. Missing or unfinished
reports must remain failures/incomplete evidence, not a clean count. No artificial
failure, assertion weakening, retries or changed skip policy was introduced.

Local gates: 863 unit tests, 13 script tests, typecheck and build passed. New
processing tests were run RED then GREEN, and an isolated sabotage removing exact
identity validation made its regression test fail. Independent fresh read-only
Codex review passed with no security/logic findings; additional edge-case tests
were suggested as nonblocking. No merge or deployment performed.

For subsequent local runs and CI download/readback commands, see
[Browser reporting](../../BROWSER-REPORTING.md).
