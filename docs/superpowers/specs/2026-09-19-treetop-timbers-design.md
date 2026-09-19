# Treetop Timbers Design

## Goal

Add Treetop Timbers as a third selectable 3–5 minute route. The level uses a
new project-local timber atlas, a warm sunset theme, shallow rope-bridge
contours, crane-hook springs, sawhorse hazards, checkpoints, gems, and a
forgiving required path that never depends on a timed jump.

Issue #32 supersedes the first-release statement that new biome artwork is out
of scope. The canonical requirements and current product documentation will be
updated in the same pull request.

## Level and gameplay data

`src/world/levels.ts` will export `TREETOP_TIMBERS` and register it after Plains
and Quarry Run. It will use the existing `LevelData` contract and the ID
`timbers`. One contiguous surface contour will span the full route. Repeated
paired slopes form shallow V shapes that read as rope-bridge sag while
remaining compatible with the engine's single-height ground model.

The main route will contain six checkpointed sections, at least six springs,
six hazards, and thirty gems. Interactive ground entities will be planted with
`surfaceY`. The finish remains reachable by holding right without a mandatory
jump or moving-platform timing. Decorations and parallax placements will use
the timber atlas's scaffolding, pine, rope/log, and sunset cells.

## Art pipeline

The source sheet will live in `assets/source/timbers/` with its exact generation
prompt and provenance notes. It will contain exactly 16 cells in the existing
`WORLD_ASSETS` order, visually reinterpreting the shared keys as timber terrain,
a sawhorse, scaffolding, pine, rope, amber gem, crane-hook spring, forest slime,
timber checkpoint and finish, sawdust, sunset treetops, and cut logs.

`scripts/process_sprite_atlas.py` will create the 192 × 192 runtime RGBA atlas
under `public/assets/timbers/`. A matching manifest will preserve the existing
asset-key contract, so the renderer needs no biome-specific branches and the
fixed tuple does not need to grow.

## Multi-atlas runtime

The application will preload every unique atlas named by `LEVELS` before the
adventure becomes ready. The resulting atlas-by-ID map will be passed to
`AdventureScene`. Rendering will resolve the current level's atlas on each
frame, so changing the selected level changes both gameplay data and art
without asynchronous work inside the title screen.

The scene constructor will validate that every registered level has a supplied
atlas and fail clearly if one is missing. Existing tests and callers may pass a
single Plains asset through a compatibility helper only if that keeps the
public contract clear; the preferred contract is an explicit readonly map.
World and gameplay preview scenes remain single-level and keep their current
loading behavior.

Preloading is preferred over lazy loading because the atlases are small, title
selection remains immediate, and the existing centralized loading and retry UI
continues to handle all asset failures.

## Error handling

Any atlas metadata or image failure keeps the existing application-level asset
failure state and retry control. A missing atlas entry is rejected at scene
construction rather than silently rendering a different biome. No runtime
image generation, backend, browser storage, or persistence is introduced.

## Testing and verification

Focused Vitest coverage will verify registration, generic level validation,
six checkpointed sections, shallow V contours, grounded interactions, required
route completion, and the 4 × 4 manifest contract. Scene and loader tests will
verify that the selected level renders with its own atlas and that missing
registered atlases are rejected.

Playwright coverage will select Treetop Timbers from the title screen and
verify that the timber atlas is requested and rendered. Final verification is
`npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser`, and
`git diff --check`. A separate reviewer subagent will inspect the completed
commit range; critical and important findings will be fixed before the branch
is pushed and the pull request is opened.
