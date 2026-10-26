# Moving platforms — issue #37

Terrain is a one-dimensional height function: `surfaceY` returns exactly one
ground height per x. A slab that moves cannot be a `Surface`, so moving
platforms are their own data, with their own collision pass resolved after
terrain.

## Data contract

`src/game/platforms.ts` owns the contract. A `MovingPlatform` is level data:

| Field | Meaning |
| --- | --- |
| `id` | stable identity, unique against entity IDs as well |
| `from`, `to` | top-left corner of the slab at each end of the path |
| `width` | slab width; thickness is the shared `PLATFORM_HEIGHT` (10 px) |
| `seconds` | one-way travel time |
| `pause` | seconds parked at each end |
| `offset` | fraction of the cycle already elapsed when the run starts |

`LevelData.platforms` is optional, so a level built from terrain alone is
unchanged. Plains has none; Quarry Run has three vertical lifts and Sunset Site has one (a crane ferry over its cement yard's paired hazards).

Motion is a pure function of the run clock: `platformPhase` is a triangle wave
with a dwell at both ends, and `platformBodyAt` turns it into a `PlatformBody`.
Nothing integrates, so a platform cannot drift after a pause, a checkpoint
recovery or a replay, and two runs of the same seconds produce identical
positions. `RunState.seconds` is the clock; `startNewRun` resets it, and
`tickRun` advances it by the same `MAX_STEP_SECONDS`-clamped step movement
integrates, so a stalled frame cannot slide a slab out from under its rider.

`platformBodiesAt` reports, per body, the velocity the slab actually travelled
at over the step just taken rather than its instantaneous one. The two disagree
at a turnaround — the phase flips direction before the position moves — and a
rider carried by the instantaneous velocity is left behind there.

## Collision and ground velocity

Each frame a scene advances the platforms first, then hands the sampled bodies
to `simulatePlayer`, so movement collides with where the slabs are now. Inside
the existing <=4 px substep loop:

1. The platform Henry rides moves him on both axes by its own velocity, so the
   ride carries him rather than the snap below having to catch him.
2. Terrain resolves as before.
3. Platforms resolve afterwards; a slab standing above the ground wins the
   contact, and a slab below the local ground height is ignored entirely.

Landing is one-way. A rising Henry passes through a slab and lands on its top
face on the way down. Support is granted when his feet cross the top face during
a substep, or when he is already riding and stays within `PLATFORM_RIDE_SNAP`
(6 px) of it — that slack absorbs the gravity a carried rider still accumulates
each step.

`Player` gained `platformId` and `groundVelocityX`: the notion of ground velocity
the movement step lacked. A jump off a ride adds the ride's horizontal velocity
to Henry's, clamped to the usual top speed — so a platform never slides out from
under a jump, though a jump already at top speed gains nothing. Springs, slime
knockback and fall recovery all call `detachFromGround`, so a ride can never
outlive the moment it ended.

## Readable at speed

For a six-year-old, slow and predictable beats clever:

- `PLATFORM_MAX_SPEED` is 90 px/s, well under Henry's 220 px/s run, and
  `validateLevel` rejects any platform that exceeds it. A unit test rides every
  shipped platform through a full cycle and asserts the camera never moves more
  than the cap's worth of pixels in a frame, so a ride can never make the view
  lurch.
- Every shipped platform parks at both ends, and the Quarry rides and the Sunset Site
  ferry all sit over walkable ground, so a mistimed boarding costs a landing rather than a life.
  The ferry travels 2.2 s and rests 0.8 s; the lift travels 2 s and rests 1 s.
- The renderer draws the whole path — pips along the route plus a marker at each
  end — before the slab itself, so the next move is visible before Henry commits
  to it. Slabs use the level theme, so a new world needs no new art.
- `validateLevel` also rejects platforms with duplicate IDs, non-finite or
  non-positive width or travel time, ends outside the level, or ends parked under
  the terrain.

## Quarry Run

Quarry's three 96px lifts connect the four fixed resting levels, with four-second
travel and 1.5-second endpoint pauses. A connects 140 ↔ 420 on the left, B
420 ↔ 700 on the right, and C 700 ↔ 980 on the left. All docks allow walking
on and off; permanent one-way catches limit absent boarding and shaft slips.
Attached riders pass catch bridges with their carriage in both directions;
free falls land on the highest crossed top. Platform collision interpolates
within movement substeps while retaining the existing step-average velocities.

The main descent does not require a ride. The lifts supply the intended full
upward ROCK return. See the [Quarry worksheet](QUARRY-PLAYTEST.md) for geometry,
proof boundaries and remaining owner acceptance.

## Known limitations

- Only the top face is solid. Slabs have no side or underside collision, so
  they cannot push, block or crush Henry.
- A rider who keeps holding a direction will run off the slab; the Quarry rides and the
  Sunset Site ferry are placed so that this is a short drop onto walkable ground.
- No platform is ever load-bearing for finishing a level. Every shipped ride is
  optional on the initial descent; Quarry uses alternating directions on fixed terraces.
- Entities do not ride platforms — only Henry does. A gem or hazard is placed in
  world space and stays there.
