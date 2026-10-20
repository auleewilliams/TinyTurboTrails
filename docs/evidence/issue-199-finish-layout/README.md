# #199 C12: invariant finish-layout construction

Measured on 2026-10-20 against main `9ca5c7dd25ec02522442963ed3c27c46f79a0460`.
Only C12 was approved in issue #199's owner comment of 2026-10-20. This is not
completion or approval of the remaining consolidation candidates. The separate
review proposal in PR #201 remains historical; this evidence does not depend on
its files being merged.

## Change and preserved contract

In [`tests/finish-layout.test.ts`](../../../tests/finish-layout.test.ts), construct
sampled normal/reduced-motion sparkle rectangles once in the describe scope.
`celebrationStarRects` and `celebrationSparkles` depend only on time/reduced motion;
they do not read Henry's bob, gem total, star count, mutable run state or globals.
The retained `inside`/`overlaps` predicates only read rectangle fields. Every
per-bob art array remains fresh, Henry is still constructed per bob, and payoff
remains last. No fixture/run state is shared by this change.

All 15 expanded cases remain: five gem parameters `[0, 1, 7, 42, 999]`, 121 time
samples, six level identities, and four result-row star counts `[0, 1, 2, 3]`.
Every loop, predicate, assertion expression, assertion order and duplicate witness
is retained. Only the two repeated sparkle-construction expressions are replaced.
Construction calls drop from 132,858 to 122; this is a static work count, **not a
measured speedup**. No production code, browser engine, route, native-clock/pixel/
input witness, timeout, budget, retry or gameplay behavior changes.

## Executed equivalence proof

[Machine-readable results](results.json) pin original/proposed test SHA-256s,
source baseline, environment, exact input/event counts, timings and sabotage
witnesses. Temporary instrumentation ran each actual test source through Vitest:

- Record each `inside(inner, outer)` and `overlaps(a, b)` input tuple.
- Record every matcher input as `(actual, matcher name, expected)`; these tests
  use only `toBe` and `toBeGreaterThan`.
- Encode each event with `JSON.stringify([kind, ...arguments])` followed by a
  newline for the ordered SHA-256. Independently retain a map of exact serialized
  tuples to integer multiplicities, sort it lexicographically, and directly
  compare the original/proposed maps (not just unique sets or case counts).
- Preserve actual/expected validation in the tracer using `Object.is` for `toBe`
  and numeric `>` for `toBeGreaterThan`. This temporary trace validator is **not**
  a replacement for the separately run real-Vitest green and sabotage gates.

The exact maps and ordered event digests match: **249,305 inside calls, 1,894,405
overlaps calls and 2,143,732 assertion inputs**, totaling 4,287,442 events and 942
unique serialized event tuples. Duplicate multiplicities are preserved.
Ordered SHA-256:
`2230073717d67b09d865899c65f8b822bff2ebd3c7192ba43534e9cfef88d506`.
Multiset SHA-256:
`0872691b9397d506fa05a9b89c9c8cec5ae5c8af6855881fcc7ea24ae00177a3`.

The local audit driver, full JSON reports and compressed tuple maps are retained
outside the repository in `scratch/issue199-implementation-evidence` under the
Hermes cache. Those are local diagnostic artifacts, not promised GitHub-hosted
attachments. This bounded directory publishes their summary, not a new permanent
test runner or the broader audit catalogue.

## Meaningful sabotage: real Vitest on both variants

Each mutation changes real production geometry/state in the isolated worktree,
one at a time, then is restored. Exact mutations and failing titles are in the
JSON. No test-source-shape-only sabotage is counted.

| Temporary mutation | Original failed cases | Proposed failed cases | Retained witness |
| --- | ---: | ---: | --- |
| Move sparkle rectangles to text coordinates `(200, 40)` | 5 | 5 | Every gem-parameter text-overlap case |
| Move payoff badge outside panel (`x: 68` to `0`) | 5 | 5 | Every gem-parameter containment case |
| Move Henry upward by 70 pixels | 6 | 6 | Five text cases and separate gem/star result-row overlap |
| Increase `createRun` gem total by one | 6 | 6 | Every level-specific actual run-state assertion |

All four sabotages fail in both versions with the **same exact failing titles**,
then each version passes all 15 real-Vitest cases after restoration. Production
sources are restored byte-for-byte; none are included in the diff.

## Comparable timing, including limitations

Same Linux x86-64 KVM host (8 QEMU virtual CPUs), Node v22.22.1, npm 9.2.0,
Vitest 5.0.4, lockfile and worktree. No heavy local browser suite ran concurrently.
One unmeasured warm-up per version preceded alternating AB/BA pairs using:

```sh
node node_modules/vitest/vitest.mjs run tests/finish-layout.test.ts \
  --reporter=json --outputFile <external-per-run-report.json>
```

All **seven complete pairs** passed 15/15; all individual suite durations are
published in `results.json`. These are uninstrumented Vitest suite
`endTime - startTime` measurements, not tracing timings or whole-process durations.

| Variant | Median suite time | Range |
| --- | ---: | ---: |
| Original | 19,019.59 ms | 18,244.15–19,570.86 ms |
| Proposed | 19,869.60 ms | 18,830.59–20,446.59 ms |

The proposed median is **4.47% slower in this cohort**. This run does not establish
a runtime benefit; retaining millions of assertions dominates the small
construction reduction. No speedup or statistical significance is claimed.

The outer tool request exceeded its 420-second cap during planned pair eight
(after running preceding sabotage/trace work in the same request). All seven
independently persisted complete pairs are included, with no pair-eight result
invented or partial sample included. Per-process wall timers were not persisted
before interruption, so they are not reported for this cohort.

Earlier diagnostics are not silently counted as green: a Proxy-based tracer
using real Vitest matchers exceeded the unchanged 5,000 ms default in six heavy
cases. The final trace uses the explicit validators above to avoid that audit
instrumentation overhead. A separate pre-change real-Vitest invocation exceeded
5,000 ms in the first gem case (5,019 ms); subsequent unchanged baseline whole-unit
and all retained timing runs passed. No timeout was raised and no test retry was
added. These observations limit performance/reliability conclusions.

## Local gates and browser boundary

- Baseline whole-unit: **953 passed**, zero failed.
- Final targeted real Vitest: **15 passed**, zero failed.
- Final whole-unit: **953 passed**, zero failed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test:ci`: **8 passed**, zero failed.
- `git diff --check`: passed.

The baseline/final whole-unit process walls were 53.04/48.03 seconds; these single
runs are gate evidence, **not** an isolated finish-layout speed comparison. Final
CI status must be read from the PR's exact pushed head. All three browser engines
and the existing deployment-image check remain in PR CI; no redundant heavy local
browser run was started for this test-only refactor. This document does not itself
claim that remote CI has passed, that the PR was merged, or that #199 is complete.
