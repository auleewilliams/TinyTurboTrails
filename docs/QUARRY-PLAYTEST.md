# Quarry terrace descent — issue 219

The [approved issue](https://github.com/auleewilliams/TinyTurboTrails/issues/219)
replaces the long horizontal Quarry with four resting levels at support Y
140, 420, 700 and 980. The main descent uses permanent staggered shelves above a
continuous floor. Three automatically cycling, 96px lifts connect rim ↔ upper
workings on the left, upper workings ↔ mine on the right, and mine ↔ floor on
the left. Travel takes four seconds, with a 1.5-second pause at each endpoint.

The world is 820×1080. The wider envelope leaves waiting ledges and local catches
on both sides of each shaft. B's fixed waiting ledges connect to the main
landings by short jumps; the gap beside them is the main descent. No reward
trail leads into an absent carriage. Catch bridges use the existing one-way
platform representation. Collision preserves an attached moving carriage when
it crosses a fixed catch; free falls land on the highest crossed support.
Movement samples each platform at the collision substep, fixing a maximum-step
upward detachment exposed by this layout. No platform timing engine was replaced.

R/O/C/K retain their identities and use explicit support heights. The three
checkpoints require grounded contact on their own resting level, can reactivate
on an upward visit, and retain the run's rewards. Existing horizontal trails
keep their forgiving swept checkpoint activation. The floor finish requires
actual floor support. Find more letters returns to (470, 980), between K and
the arch, and deliberate re-entry uses the existing results and word flow.
The ribbon follows descent height and climbs back during retracing; visited
checkpoint posts and completion remain recorded independently.

## Baseline and observations

An unchanged archive of base `cdc33129cfc1af67f502b6649cec328f6fd65d2c`
was played with real keyboard input in Chromium 156.0.8078.4, with a measured
426×240 canvas. The short opening capture showed the shallow rise, automatic R
pickup, checkpoint feedback and first miner slime knockback. The panorama and
miner costume establish the theme. This opening capture did not establish
repetition, enjoyment or waiting behaviour across the entire old trail.

Source inspection separately found six horizontal sections, repeated flat/rise/
pit patterns, nine springs, three crumbling ledges and three stars on one shelf.
Those are geometry facts. The approved descent's changing views are an intended
experience, not measured owner enjoyment. No automated duration is a human play
measurement.

## Automated verification and retained evidence

`tests/quarry-descent.test.ts` drives the real AdventureScene from the rim,
finishes without letters/stars/lift rides, uses the actual Find more letters
action, rides C → B → A, retrieves ROCK, takes all three star branches and
returns to finish without teleports, restarts or reward writes. The upper and
lower side return jumps reconnect through the nearby terrace above the branch.

`tests/quarry-run.test.ts` uses explicitly labelled local phase/position
fixtures for endpoint pauses, absent berths, both slip directions, full ride
cycles at 60/30/10 Hz and fixed checkpoint recovery. Those fixtures are not
claims of complete input routes. `tests/vertical-support.test.ts` supplies
unsupported/edge/moving-support negatives, shelf discrimination, letter
render/contact/flight agreement, floor-only finish and retained HUD history.

The browser pilot observes shipped debug text and actual platform/character
canvas draws, and dispatches ordinary keyboard input. It does not read or write
the scene, player, run or education session. Native canvas size is asserted
before routes and after evidence resizing. Actual input journey captures cover
native, 320px and desktop views; renderer fixtures remain separately labelled.

Raw RED/GREEN logs, initial failed cohorts, native reports, discovery logs,
source/build hashes and screenshots live in the task evidence directory:
`/home/leew/.hermes/cache/scratch/m8-219-evidence/`.
The worker handoff there records actual final results and any unfinished gates.
Historical or draft files alone do not establish that a cohort passed.

## Review corrections and CI failure disposition

Fresh review of the first published revision found that gem 015 occupied the
same position as star 2, and that a shared star-contact test had been relaxed
to accept the accidental gem pickup. Gem 015 now sits separately on the fixed
upper approach; the cross-trail test again requires zero gems from star contact.
The coordinator separately identified that the next descent shelf was outside
the native view at the upper and mine landings. Quarry-only camera framing now
shows those lower shelves while preserving the horizontal trails' camera rule.
Real-input native and small-window captures and pixel observations accompany
the correction. The map thumbnail now renders the starting rim and platform
bodies rather than showing a support-free view.

The first published revision's full CI run `40341439231` failed 26 browser
identities on its tested merge of base `cdc3312` and head `6d268a0`; its 465
passes and one existing conditional Firefox audio skip do not clear this
revision. Follow-up evidence in the worker handoff records the corrected
fixtures and actual new results. Old Quarry-only crumbling browser coverage
was retired with the geometry; the generic mechanic has unit, renderer and
world-fixture coverage, not browser coverage.

## Old test assumptions

The obsolete Quarry spring/pit/ferry/crumbling counts and X-sorted routes were
replaced with tests for its current permanent supports, three vertical lifts
and real vertical return. Shared damage, heart, patrol and controller-rumble
browser tests use Sunset's unchanged first flat patrol (x620–700, support168),
with a safe stationary stop on the same flat. Their health, contact, pulse and
post-Resume neutral-poll assertions remain. The existing 1800-frame/30-second
three-hit unit bound remains unchanged. Other trail geometry is unchanged.

## Owner acceptance still required

- [ ] Owner-led enjoyment, clarity, waiting and retries, with iteration.
- [ ] Human exploratory duration; automated/simulated time is not this measure.
- [ ] Physical-controller and child checks, if the owner chooses to perform them.
- [ ] Conditional native Safari/hardware/assistive-technology checks.

These checks remain unperformed unless the owner records observations. Keep
issue 219 open for that acceptance; the implementation PR uses `Refs #219`.
Fresh independent Claude review, exact-revision CI/artifact readback and merge
remain coordinator responsibilities. No release or deployment is part of this work.
