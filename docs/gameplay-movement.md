# Henry movement tuning — issue #3

The movement preview is available at `/?scene=movement`. It uses the same local
Henry atlas as the art preview and draws explicit course geometry beneath it.
Arrows/A-D move, Space jumps, and the orange marker launches a spring when Henry
crosses it. The preview is diagnostic; the complete level and interactions arrive
in issues #5 and #6.

## Tuning contract

| Constant | Value | Purpose |
| --- | ---: | --- |
| max speed | 220 px/s | horizontal cap in air and on ground |
| ground acceleration | 920 px/s² | reach momentum quickly |
| air acceleration | 620 px/s² | retain control without instant turning |
| braking | 1200 px/s² | release input or reverse smoothly |
| gravity | 1500 px/s² | forgiving platform arc |
| jump velocity | 510 px/s | full jump impulse |
| jump cut | 48% extra gravity | variable height on release |
| coyote time | 100 ms | ledge grace |
| jump buffer | 120 ms | press just before landing |
| spring velocity | 620 px/s | reusable launch response |
| platform top speed | 90 px/s | readable ride, enforced by level validation |
| platform ride snap | 6 px | vertical slack that keeps a rider planted |

The simulation receives seconds and is intended to run from the foundation's
fixed 60 Hz clock. A movement update subdivides any displacement above four
pixels, so a fast fall cannot cross a terrain top between collision checks.

Terrain is data, not drawing logic: each surface is an explicit segment with
`x1`, `x2`, `y1` and `y2`. The collision geometry is independent of the sprite
atlas. The current preview course has flat ground, a broad ramp, a raised flat
section and a spring marker. Boundary clamps stop Henry at the course edges.

`animationFor` maps vertical velocity to jump/fall and grounded horizontal
velocity to idle/run. It does not infer collision from artwork. The shared
48 × 48 atlas anchor places the sprite's boot baseline at the collision feet.

Moving platforms are the one thing terrain cannot express, because `surfaceY`
allows only one ground height per x. They are separate level data with their own
collision pass, resolved after terrain inside the same substeps, and they gave
the movement step the ground velocity it previously lacked. See
[moving platforms](moving-platforms.md).

Collision, input and animation tests cover acceleration caps, braking, variable
jumps, jump buffering, coyote time, slope following, downhill acceleration,
spring launches, state selection and high-speed landing. These are unit-level
checks; full route difficulty and controller playtesting remain release work.

## Per-surface friction — issue #39

A terrain segment may specify `friction`; omitting it is exactly `1`. Level
validation accepts only finite multipliers in the inclusive range **0.6–1.4**.
The movement step samples the supporting segment once for contact height, slope
and friction. At a shared endpoint, the first segment wins; the next update
uses the new segment after Henry crosses the join.

| Surface tuning | Multiplier | Acceleration | Release braking |
| --- | ---: | ---: | ---: |
| Slippery preview | 0.6 | 552 px/s² | 720 px/s² |
| Normal / omitted | 1 | 920 px/s² | 1200 px/s² |
| Grippy preview | 1.4 | 1288 px/s² | 1680 px/s² |

Ground acceleration includes turning against existing momentum. Release braking
uses the braking rate. Air acceleration and air release braking, static ledges,
moving platforms, downhill acceleration, jump impulse and the speed cap retain
their existing values. Friction changes traction, not maximum speed; it does not
yet model sand drag or shallow-water resistance.

Every non-default surface gets an automatic visual tell in the world renderer:
low grip has a cyan band with smooth pale streaks, high grip an ochre band with
dark grains. Shape and color both differ. The movement preview shares these cues:
its opening flat is slippery, its final flat is grippy, and the ramp and spring
section use normal grip. Try accelerating, releasing, reversing and jumping
across both ends at `/?scene=movement`.

At 60 Hz, releasing from 220 px/s on flat ground stops in approximately 32 px
at 0.6, 18 px at 1, and 13 px at 1.4. Automated movement checks enforce bounded
stopping distance and unchanged air/platform behavior. These are initial tuning
values, not a substitute for Henry's playtest. Plains and Quarry Run retain
normal grip throughout; Frost Ridge and Sandy Cove can author their own segments
later without changing the shared movement step.
