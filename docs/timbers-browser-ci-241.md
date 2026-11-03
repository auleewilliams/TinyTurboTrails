# Timbers follow-up: browser CI corrections

[Run 41515010180](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/41515010180)
tested rebased head `91c91de983b3f534b95f42acc64a7d307ab5038e`. Units,
preparation/preservation tests, type-checking and build passed. Browser results
were 718 passed, 25 failed and one explicit Firefox audio-backend skip across
744 configured identities. Docker and deployment smoke steps were skipped after
the browser failure; this was not a green CI run.

The failures had two causes:

1. Six cases used two outdated Timbers assertions in all three engines. The roots
   check prohibited slimes anywhere in the level; the common-slime check required
   horizontal patrol movement. The owner had explicitly restored elevated slimes
   using their existing in-place hop behavior. The roots check now excludes
   enemies from the root/first-landing vertical clearance and retains the actual
   root traversal with full-heart assertions. The slime check retains atlas/draw
   counts, checks vertical animation and fixed X for Timbers, climbs to a visible
   slime through keyboard input, and verifies Pause/Resume. Ground patrol checks
   keep their existing X-motion assertions. No timeout or retry setting changed.
2. Nineteen Firefox Cove cases shared an observer that read every response body
   without handling rejection. A repeated request for the reused Plains scenery
   manifest received HTTP 304. That response has no entity body; the rejected
   read ended the tests before their journeys completed. A failed CI trace records
   the same URL returning 200, followed 65ms later by 304. This is an observation
   failure, not a gameplay assertion or a missing asset.

The Cove observer now reuses the established HUD response reader, which records
bodyless transport responses and immediately handles rejected reads. Each 304
must bind to the latest earlier, nonempty, hashed 200 at the exact URL, including
origin and query. The 304 retains a null body hash; a separate cache binding
identifies the witnessed body. Missing/late/different-URL/empty witnesses, failed
200 reads, missing hashes and HTTP errors fail verification. Nine focused tests
exercise these requirements. The browser evidence retains every transport record,
the cache bindings, and the screenshot hashes.

Only test code and this evidence change. All 224 compared production source,
shipped-asset and build files match the previously reviewed bytes. The terrain,
tree, bushes, slimes, physics and their source/provenance records are unchanged.

## Retained evidence

The downloaded [failed browser artifact](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/41515010180/artifacts/13179494154)
has SHA256 `4e5a094efd3f8dabf36c7cad69f457cf17f68f6b3d2975f264e08fa34c923486`,
matching GitHub's artifact digest. The raw ZIP, reports, failure log and trace
analysis are retained under the ignored `playwright-report/issue-241/ci-41515010180/`.
An independently recomputed summary reconciles all 744 configured identities.
The local correction packet is `playwright-report/issue-241/ci-observer-fix/`.
Committed results and hashes are in
[verification.json](evidence/issue-241/browser-ci-fix/verification.json).

Final local verification: 2,062 unit tests in 111 files, 116 preparation tests,
type-checking and build passed. All 25 failed CI identities are covered by passing
reruns: nine roots/slime cases across three engines, all 19 affected Firefox
journeys, and two additional Cove map checks in Chromium/WebKit (30 cases total,
zero failures, skips or retries). Readback validates 379 PNG attachments and 21
response packets; all delivered 200 bytes match the production build, and all 19
observed 304s bind to the latest earlier exact-URL body. The configured catalog
still contains 744 cases; only the three Timbers slime titles change from patrols
to hops.

These corrections address this run's 25 failures. Earlier WebKit approach/Retry
timing failures remain historical observations; they were not reproduced as
failures in this canonical run and are not claimed to be fixed here. A fresh full
CI run and whole-PR review must target the correction commit. Owner acceptance
and merging remain separate.
