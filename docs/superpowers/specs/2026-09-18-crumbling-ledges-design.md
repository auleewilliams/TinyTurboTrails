# Crumbling Ledges Design

## Goal

Add a forgiving crumbling-ledge mechanic to Quarry Run. A ledge warns Henry before it gives way, then drops him onto safe terrain so the mistake costs momentum rather than checkpoint progress.

## Player Experience

Quarry Run contains three 72px-wide crumbling ledges in its later sections. Each is suspended over ordinary walkable terrain. Henry can jump upward through a ledge and land on it while descending, like a one-way platform.

The first landing starts a fixed 0.75-second countdown. The countdown continues if Henry walks or jumps away. During the warning, the ledge shakes with increasing intensity and gains visible cracks. When time expires, it stops colliding and disappears. The terrain below catches Henry without invoking checkpoint recovery.

Checkpoint recovery restores every crumbling ledge while preserving collected gems. Starting or replaying a run also restores all ledges.

## Level Model

`WorldEntityKind` gains `crumbling-ledge`. A crumbling-ledge entity carries an explicit positive width and uses the existing stone asset and Quarry palette. Its authored `x` coordinate is the horizontal center, and `y` is the platform surface.

The three Quarry placements must satisfy these invariants:

- the full ledge span stays inside the level bounds;
- ordinary terrain exists below the full ledge span;
- the ledge is high enough above that terrain to form a distinct platform;
- falling from it does not cross the level's fall-recovery threshold;
- it does not cover a checkpoint or required spring.

Level validation rejects malformed ledges, including missing or non-positive widths and unsafe placements.

## Simulation and Run State

Static `surfaces` remain immutable. Movement receives the currently solid ledges as supplemental horizontal collision surfaces. For a descending player, collision resolves to the highest valid surface crossed during the movement substep: an active ledge or the normal terrain. Ascending movement ignores ledges. Walking beyond a ledge's edge leaves Henry airborne and preserves the existing coyote-time behavior.

Each ledge has run-owned state with one of three phases:

- `stable`: solid and untriggered;
- `warning`: solid, with a remaining countdown from 0.75 seconds;
- `crumbled`: neither solid nor visible.

Landing on a stable ledge changes it to `warning`. Run ticking decreases warning timers deterministically using the fixed-step delta and changes expired ledges to `crumbled`. Leaving the ledge never pauses or resets the timer. Checkpoint recovery resets only ledge state plus the existing transient contact state; it does not reset gems or the active checkpoint. New-run setup rebuilds all entity state as it does today.

## Rendering

The renderer treats crumbling ledges as a special entity presentation rather than new biome artwork. It repeats or composes the existing stone visual across the authored width. Stable ledges draw without an offset. Warning ledges use deterministic timer-derived horizontal shake and procedural crack lines that become more prominent near expiry. Crumbled ledges are filtered out by run state.

Rendering remains a pure view of level and run state: it does not advance timers or choose phases. The gameplay preview and adventure scene provide the same collision and presentation state so their behavior does not drift.

## Compatibility and Failure Behavior

Existing levels with no crumbling ledges behave exactly as before. Existing callers of movement may omit supplemental platforms. Invalid ledges fail level validation during development instead of producing ambiguous collision behavior at runtime.

No new audio, generated image, persistent storage, input, or biome asset is introduced.

## Testing

Focused Vitest coverage will prove:

- a descending player lands on an active ledge, including at high horizontal speed;
- an ascending player passes through it and a player walking off becomes airborne;
- first landing triggers the 0.75-second warning exactly once;
- warning continues off-platform, expires deterministically, and removes collision/visibility;
- checkpoint recovery restores all ledges without restoring collected gems;
- new runs restore all entity state;
- all three Quarry ledges meet safe-placement invariants;
- the renderer draws stable, warning, and crumbled states correctly, including visible warning motion/cracks.

A Playwright check will exercise a Quarry ledge in the playable route and capture evidence of its stable, warning, and crumbled presentation. Final verification will run `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:browser`.
