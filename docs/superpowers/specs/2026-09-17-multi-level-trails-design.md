# Multi-level trails design

## Goal

Turn the current Plains-only adventure into a small runtime-selected level
system, then add Quarry Run and expose both levels through the title screen. The
existing Plains route must keep its current behavior and pixels, while generic
level invariants move into the data validator so future routes cannot silently
repeat known terrain and checkpoint defects.

## Scope and sequencing

The work follows the requested issue order and lands as five independently
reviewable changes:

1. Issue #27 introduces the runtime level contract, registry, generic validation,
   and required level injection through gameplay and recovery.
2. Issue #28 adds per-level rendering themes and configurable world-asset
   directories without changing the Plains rendering result.
3. Issue #30 adds the Quarry Run data using the existing Plains atlas, including
   reachable interactions and a recovery pit.
4. Issue #29 adds title-screen selection and reloads the selected level state.
5. Issue #31 updates the canonical requirements and project documentation.

Each issue is committed and published as its own pull request before the next
issue begins. Later pull requests may be stacked on their predecessors because
the issue dependencies require the earlier runtime contracts and content.

## Data model

`LevelData` will contain an `id`, display `name`, atlas directory identifier,
world dimensions, start and finish data, surfaces, checkpoints, entities, and a
per-level render theme. The theme contains sky, ground, and edge colors plus a
list of parallax assets with world positions and scales. `PLAINS_LEVEL` keeps
the existing values exactly, including its `plains` atlas and current hills.

`src/world/levels.ts` will own a flat registry. It will export `LEVELS`,
`DEFAULT_LEVEL`, and `levelById`. The registry starts with Plains and gains
Quarry Run in issue #30. No scene will import `PLAINS_LEVEL` directly after the
runtime-parameter change; tests may retain direct Plains imports for
Plains-specific assertions.

`validateLevel` will enforce positive dimensions, unique in-bounds entity IDs,
at least one checkpoint, matching checkpoint entities, a finish after the
start, contiguous surfaces spanning `minX` through `maxX`, and checkpoint
coordinates that equal the terrain height at their x coordinate. Validation
errors will be level-agnostic. Tests will run generic checks across `LEVELS`
and keep Plains-only elevated-gem assertions scoped to Plains.

## Runtime flow

`AdventureScene` will receive a level as a required constructor argument. A
single `loadLevel` method will rebuild player, run state, and camera bounds
together at construction, level selection, and replay. Fall recovery will
require its level argument so a missed call site is caught by TypeScript and a
Quarry fall can never respawn at a Plains checkpoint. The gameplay and world
preview scenes will accept an optional level defaulting to `DEFAULT_LEVEL`,
preserving their existing routes. `main.ts` will pass `DEFAULT_LEVEL` to the
adventure scene.

The renderer will consume the level theme for all background colors and
parallax placement. `loadWorldAssets(directory = 'plains')` will construct its
asset URLs from the directory and report generic errors. The current callers
continue loading Plains assets; no new atlas is generated.

## Quarry Run

Quarry Run will be a shorter, visually distinct stone-and-cave route built from
the existing 16-cell atlas. Its surfaces will be contiguous and span the
declared bounds. It will include steeper ramps, two reachable springs with gems
near their exits, two safe checkpoints, one reachable stone hazard, and a pit
deep enough to exercise fall recovery. All interactive entities will be placed
within the existing interaction window of the walkable ground, and all entity
IDs will be unique. Its finish uses the existing finish arch and reports the
run's collected gem count through the shared adventure flow.

## Level picker

The screen state machine remains unchanged. `AdventureScene` will maintain a
selected registry index while on the title screen. A horizontal input edge
changes the index once per press, wrapping at either end; held keyboard or
controller input will not repeat every frame. Jump starts the selected level,
and the title renders the selected display name between left and right arrows.
After completion, replay returns to the title with the picker active and the
next start rebuilds all level-specific state.

## Documentation

The requirements will explicitly allow multiple desktop-browser levels and a
level picker while retaining the no-new-biome-art constraint. README layout,
controls, limitations, and progress language will match the shipped behavior.
The Plains guide will describe Plains as one route in a multi-level release.
Release verification documentation will be checked for single-level claims;
historical certification records will remain historical unless they make a
current product claim.

## Testing and verification

Each behavior change begins with focused Vitest coverage and a failing test,
then the minimum implementation is added and the test is rerun. The final
validation for code issues is `npm test`, `npm run typecheck`, `npm run build`,
and `npm run test:browser`. The Quarry route receives unit coverage for its
data invariants and interaction placement, plus browser smoke coverage for the
picker and selected route. The final review compares the full stacked diff with
the five issue acceptance criteria and fixes any critical or important finding
before completion.
