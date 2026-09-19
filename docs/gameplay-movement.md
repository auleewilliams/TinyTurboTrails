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

## Terrain materials

Frost Ridge ice uses ground friction 0.45: acceleration is 414 px/s² and braking
is 540 px/s², with the usual 220 px/s top speed. Sandy Cove soft sand targets
176 px/s (0.8 speed), and shallow water targets 143 px/s (0.65). Both retain
normal friction and slow incoming momentum gradually at 1200 px/s².

Materials apply only on terrain contact. Air movement and platform rides keep
ordinary controls; landing resumes the terrain settings. A joint belongs to
the segment on its left, consistently for height and movement. Cyan glints,
amber stipples and blue wave marks identify ice, soft sand and shallow water.
Unmarked ground uses the original movement defaults. Authored friction must
be finite in [0.25, 2], speed in [0.5, 1], and nondefault physics needs a visible
material. Ice preserves normal top speed; sand and water must reduce it.
