# Timbers ascent — issue 220

The [approved issue](https://github.com/auleewilliams/TinyTurboTrails/issues/220)
replaces the former 10,200px horizontal Timbers trail with one 820×1180 tree.
Henry starts at roots Y1080, chooses either side of a low fork, reaches a broad
middle bough, climbs the canopy and finishes on a spacious lookout at Y180.
All main-route rises are ordinary jumps. Rewards and the single branch spring
are optional.

Permanent wooden boughs are both the climbing surfaces and the return route.
The right return zigzags around the outside of the tree and is reachable by
walking off actual support ends. The shared Y840 right-fork/return top ends at
X470 on descent. Catches beneath side misses keep retries local. The trunk and
scenic stems are drawn behind Henry and have no collision. Branch platforms
use the existing one-way platform model and wood materials; no new art assets
or movement controls were introduced.

TREE keeps its four stable pickup IDs, including separate E1 and E2 tiles.
Thirty-three gems, three independent stars and one optional spring remain.
The low left, spring reward and upper left canopy branches each hold one star;
an outer canopy catch extends past the initial footprint of star 3. The three
checkpoints sit on fixed, wide boughs. A missed-letter action returns Henry to
the lookout with zero motion, retains the run's rewards and requires deliberate
movement before the bounded, grounded finish can reopen. The height ribbon and
current area follow ascent and descent; previously visited posts stay marked.

## Baseline observations

At clean base `bcf42cf066ed9fc1e78fe4b1549795e3eb1fbfc1`, the unchanged
opening was played with real right-key input in Chromium and captured at the
start, around X1142, X2332 and X3521. That observed portion showed a continuous
wood contour, shallow valleys, a spring, the timber palette and backdrop.
The route's full length and enjoyment were not observed through that capture;
10,200px is a source geometry fact. The original screenshots and observation
JSON are in `/home/leew/.hermes/cache/scratch/m8-220-evidence/`.

## Test provenance and coverage migration

`tests/timbers-route.test.ts` drives ordinary input through right ascent,
full walk-off descent, same-run TREE recovery and re-ascent, an E2-only miss,
then retries all three stars during that same re-ascent. It also checks the
left fork, a wrong-end catch, lower finish-X crossing and a short-held jump
from a standing start. Its scene and player handles
are local unit instrumentation. `tests/timbers-ascent.spec.ts` dispatches real
keyboard events at the browser input boundary, observes shipped status and
captures map/start/middle/summit and return views. It does not preposition the
actor or mutate run, collection or completion state. Renderer/map fixtures in
`tests/browser.spec.ts` are explicitly fixture evidence, not full-route proof.

Obsolete X-sorted Timbers runs in the generic milestone, old three-spring star
pilot and all-trail spelling loop were removed only for Timbers; their vertical
input-route replacements are in `tests/timbers-ascent.spec.ts`, and star and
catch mechanics are checked in `tests/timbers-route.test.ts`. Timbers' older
bag, manual assembly, missing-letter and reduced-motion browser tests were
reanchored to input-driven tree movement. Other trails retain the original
generic tests. The former terrain-spring/long-contour Timbers unit assertions
were replaced with fixed-bough, optional-spring and vertical-return assertions.
The worker handoff records exact passes, failures and any residual gaps.

## Acceptance still open

Automated traversal duration is not evidence of human exploratory duration or
fun. Owner-led clarity, retries, summit payoff and length assessment remain
unobserved. Child, physical-controller, native Safari and assistive-technology
checks also remain unobserved. Keep issue 220 open for manual acceptance.
Fresh independent Claude review, full CI/artifact readback and merge belong to
the coordinator; the implementation PR uses `Refs #220`.
