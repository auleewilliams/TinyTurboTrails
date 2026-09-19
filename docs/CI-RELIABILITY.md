# CI reliability investigation and verification

Work for #102, #101 and #100, coordinated with dependency maintenance #98.
Base: `5aaccbc` (current main including #111), 2026-09-19.

## Historical WebKit evidence (#102)

- Failed main [run 35425805658](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/35425805658):
  `16839ee9b48b1e7ace11111e4e3d63b68bc34b77`, 96 passed, one skipped,
  two failed. Quarry remained Playing at X 1002/Y 155; Timbers never drew its
  atlas. Downloaded artifact `10579013418` contains both error-context files and
  screenshots from successful tests, but no traces or screenshots of the failures.
- Successful PR [run 35425036776](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/35425036776):
  PR head `7ea70f6dcb2ac174f2080b1fb1a503314ee7f749`, tested merge
  `914533e207a9e196a307f0a507737e41841d3396`, 98 passed, one skipped.
  The tested merge and failed main have identical Git tree
  `9c3a21b1c55af54b9306ebaad956d0f2ce8dba56`; this includes tests, assets,
  workflow and lockfile. Both used runner 2.337.0, Ubuntu image
  20260907.300.1, WebKit 26.6/build 2359, and two workers.
- Current-base focused baseline: `CI=1 npx playwright test --project=webkit
  --workers=2 --repeat-each=5 --grep 'title picker selects Quarry|title picker
  renders Treetop'`: **10/10 passed**, no retries. This does not diagnose the
  historical failures, nor is the current base identical to the historical tree.

The input implementation polls held horizontal keys at rendered frames, and
selection requires a neutral simulation sample between presses. A complete
100 ms keydown/keyup can fall between frames, or a 50 ms release can go unsampled.
Title readiness confirms asset loading but does not guarantee an input sample
will occur during the next fixed wall-clock delay. Timbers' atlas assertion
observes actual drawing, so starting a different route produces the same missing
attribute as a render defect. The old Quarry test also did not confirm its route
before traversing with Quarry-specific hazard positions.

A controlled experiment withheld game animation callbacks during the old two
100 ms presses/50 ms releases, then resumed callbacks before starting. All
**3/3 attempts started Plains instead of Timbers**. This demonstrates lost test
input under a frame stall; it does not establish that the historical runner had
such a stall. Reproduce with `npm run build`, start `npm run preview` in a
separate terminal, then run `node scripts/investigate-picker.mjs`.
The historical record lacks route/frame telemetry to prove that,
and Quarry traversal timing remains a separate uncertainty.

The fix observes the actual canvas title text, holds the selection key until the
expected level is drawn, and waits across released animation frames before the
next press. It neither retries selection nor changes game input or simulation.
Both original finish/traversal and actual-atlas-drawing assertions remain.
A regression test delays animation callbacks by 200 ms and verifies each
selection. Failure traces/screenshots are retained, retries remain zero, and CI
uses the same explicit two-worker configuration as the historical runs.

## Publishing policy (#101)

See [Deployment](DEPLOYMENT.md#publishing-eligibility-and-ordering) for the exact
eligibility rule, queue cancellation limitation, legacy-workflow transition, and
rollback instructions. `npm run test:ci` exercises both A→B and B→A completion
orders, main advancing during a build, main advancing after the freshness read,
old reruns, malformed/API failures, existing SHA reuse and registry failures.
Registry calls and promotion are mocked: these are local ordering and error
handling checks, not a claim of production publishing verification.

## Action review and dependency maintenance (#100 / #98)

Resolved upstream release tags via each repository's GitHub commits API and
read the corresponding `action.yml` plus release notes on 2026-09-19:

| Action | Release | Verified full commit |
| --- | --- | --- |
| actions/checkout | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| actions/setup-node | v7.0.0 | `820762786026740c76f36085b0efc47a31fe5020` |
| actions/upload-artifact | v7.0.1 | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| docker/setup-buildx-action | v4.4.1 | `f87e5991a6d7451dcb8d9637bfbc97413f497069` |
| docker/login-action | v4.6.0 | `dbcb813823bdd20940b903addbd779551569679f` |
| docker/build-push-action | v7.4.0 | `c3c9e263c25d99ce0380d002d59b67737d91b0dc` |

All six declare Node 24 action runtimes. Hosted `ubuntu-latest` supports these
(the observed runner 2.337.0 exceeds Node 24's 2.327.1 minimum). The project's
Node >=22.12 requirement and setup-node's Node 22 install are separate from the
action runtime. Checkout v7's fork protection does not change ordinary
`pull_request` merge checkout; no `pull_request_target` or `workflow_run` is used.
Checkout credential persistence is disabled in both jobs. The setup-node npm
cache remains explicit, and upload-artifact keeps its directory upload mode.
Docker still uses a local build context, linux/amd64, and the existing GHA cache.
Release notes include dependency/runtime updates and Docker metadata/config
hardening; PR CI must exercise the upgraded actions together.

Sources: [checkout runtime/credential guidance](https://github.com/actions/checkout),
[setup-node](https://github.com/actions/setup-node),
[artifact action](https://github.com/actions/upload-artifact),
[Docker Buildx](https://github.com/docker/setup-buildx-action),
[Docker login](https://github.com/docker/login-action),
[Docker build/push](https://github.com/docker/build-push-action),
[GitHub concurrency semantics](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

Dependabot proposes weekly grouped Action updates and bounded npm/Docker updates.
It uses ordinary read-only PR CI, lockfile-based installs, and no auto-merge.
This completes only the repository configuration portion of #98; alerts,
security-update settings and subsequent alert triage remain owner work.

## Validation and review record

- Local: 472 unit tests; eight publishing-policy tests; typecheck; production
  build passed. The sandbox initially blocked Python test subprocesses; rerunning
  with subprocess permissions passed the entire suite.
- Workflow validation: actionlint v1.7.12 passed; its downloaded archive was
  checked against the upstream release checksum. Dependabot YAML parsed with
  all three weekly ecosystems. `git diff --check` passed.
- Independent browser reviewer: no substantive findings; confirmed meaningful
  assertions and careful causal claims. Suggested preserving the diagnostic
  script; implemented, reran its three cases, and reviewer verified the follow-up.
- Independent workflow reviewer: no substantive findings; independently resolved
  all six upstream SHA/runtime pairs and ran all eight publishing tests. Confirmed
  ordering, fail-closed behavior, permission boundaries and documented limitations.
- Fixed focused WebKit: `CI=1 npx playwright test --project=webkit --workers=2
  --repeat-each=10 --grep 'title picker selects Quarry|title picker renders
  Treetop|title picker consumes'` — **30/30 passed (9.4 minutes)**, zero retries.
  This is ten Quarry completions, ten Timbers atlas/traversal checks, and ten
  delayed-frame selection regressions. Inspected a resulting Timbers screenshot:
  expected textured terrain, player, gems and HUD are visible.
- Full local browser results and final-head PR CI/container results are recorded
  in [PR #112](https://github.com/auleewilliams/TinyTurboTrails/pull/112) as checks
  complete; these are distinct from the post-merge publishing checks below.
- Docker is not installed in this workstation environment. Container build and
  actual nginx/browser smoke results must come from the normal PR check job.
- No production tags were published, and no settings changed.

## Remaining verification after merge

- Confirm no legacy publish job is running before the first merge; do not rerun
  pre-guard workflow revisions.
- Observe a normal successful main run using the pinned login/build actions,
  confirm SHA tag and `latest` digest, and verify a rerun preserves the SHA digest.
- On naturally overlapping main runs, confirm a stale publisher skips `latest`;
  do not create production tag writes just to test this branch.
- Inspect retained traces if WebKit fails again; passing repetitions cannot prove
  the historical Quarry failure cause. Keep #102 open for this uncertainty.
- Keep #100 open until normal main publishing is verified. #98's account settings
  and actual Dependabot PR behavior remain outside this PR.
