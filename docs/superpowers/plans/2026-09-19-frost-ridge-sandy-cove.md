# Frost Ridge and Sandy Cove Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The primary agent implements; a separate subagent reviews the completed branch.

**Goal:** Ship Frost Ridge (#34) and Sandy Cove (#35), backed by shared terrain movement (#39), and open one reviewed PR.

**Architecture:** Extend the existing surface contract for explicit movement and material cues. Keep biome layouts in separate modules, reuse the atlas loader and title picker, and compute jellyfish positions in existing run state for both drawing and contact detection.

**Tech Stack:** TypeScript, Vite, Canvas 2D, Vitest, Playwright, existing Python atlas processor, built-in image generation.

**Spec:** `docs/superpowers/specs/2026-09-19-frost-ridge-sandy-cove-design.md`

## Global Constraints

- Use Node.js 22.12 or newer.
- Sunset Site (#33) is excluded.
- Preserve Plains, Quarry Run and Treetop Timbers, the existing keyboard/controller inputs, and memory-only progress.
- Required routes have no lethal pits.
- Do not introduce backend services, credentials, browser-storage persistence or runtime generation.
- Use two-space indentation, semicolons, single quotes and explicit exported types.
- Each trail has six checkpointed sections and at least thirty gems; target roughly 3–5 minutes of exploratory play, without claiming that length proves duration.

## Review Focus

- A surface boundary approached from either direction must select the same segment for height and physics; test the exact joint and points on either side in Task 1.
- A platform flush with special ground must not inherit its friction; test an explicit platform ID as well as elevated support in Task 1.
- Entering water at full speed must decelerate gradually in both directions, while leaving restores normal target speed; test signed velocities in Task 1.
- Jellyfish must not visually bounce away from their damage location, or keep bouncing while paused; test shared positions, pause and reset in Task 2.
- Adding two atlas requirements must preserve asset retry and all older levels; update fixtures and test a failed new atlas in Task 4.

## Task 1: Shared material movement and validation

**Files:** Modify `src/game/movement.ts`, `src/world/level.ts`, `tests/movement.test.ts`, `tests/world.test.ts`, and `docs/gameplay-movement.md`.

**Interfaces:** Export `SurfaceMaterial = 'ice' | 'sand' | 'water'` and `surfaceAt(terrain: Terrain, x: number): Surface`. Extend `Surface` with optional `friction?: number`, `speedMultiplier?: number`, `material?: SurfaceMaterial`. Keep all existing movement entry points unchanged.

- [x] Add parameterized behavioral tests, including this release comparison:

```ts
it('brakes more slowly on ice without raising top speed', () => {
  const ice: Terrain = { ...flat, surfaces: flat.surfaces.map((surface) => ({
    ...surface, material: 'ice', friction: 0.45, speedMultiplier: 1,
  })) };
  const ordinary = createPlayer(100, flat);
  const sliding = createPlayer(100, ice);
  ordinary.vx = sliding.vx = DEFAULT_MOVEMENT.maxSpeed;
  simulatePlayer(ordinary, input(), flat, 0.1);
  simulatePlayer(sliding, input(), ice, 0.1);
  expect(sliding.vx).toBeGreaterThan(ordinary.vx);
  expect(sliding.vx).toBeLessThanOrEqual(DEFAULT_MOVEMENT.maxSpeed);
});
```

  Also compare omitted properties against explicit defaults over a recorded input sequence. Check ice reversal stays positive longer; sand reaches 176 px/s and water 143 px/s after sustained input on a long flat. For both signs, start at 220 px/s inside water and assert speed after 1/60 second is between 143 and 220, then converges to 143. On returning to ordinary ground assert eventual speed 220.
- [x] Add boundary tests with contiguous segments `[0, 100]` and `[100, 1000]`: `surfaceAt` uses the existing left-segment convention at exactly 100, and selects right at 100.001. Check clamping at both terrain ends. Test jumping, subsequent airborne steps, landing, elevated platforms, and a flush platform with non-null `platformId`; compare against ordinary-ground controls where the surface should not apply.
- [x] Run `npm test -- tests/movement.test.ts tests/world.test.ts` and confirm new tests fail for missing behavior.
- [x] Implement one lookup and reuse it for height interpolation, slope and the current ground material. Ground effects require `onGround`, null `platformId`, and feet touching the contour. Use explicit friction and target speed defaults of 1. Ground acceleration and release braking scale by friction; use braking when the signed current speed exceeds a slower same-direction target. Preserve the existing global speed clamp, input handling, jump velocity, air control, and collision substeps. Do not clamp directly to a material's reduced speed.

```ts
const friction = standingOnTerrain ? surface.friction ?? 1 : 1;
const speedMultiplier = standingOnTerrain ? surface.speedMultiplier ?? 1 : 1;
const target = Math.max(-1, Math.min(1, input.horizontal))
  * DEFAULT_MOVEMENT.maxSpeed * speedMultiplier;
const slowingToTarget = player.vx * target > 0 && Math.abs(player.vx) > Math.abs(target);
```

- [x] In `validateLevel`, reject nonfinite friction or values outside [0.25, 2], speed outside [0.5, 1], unknown materials, ice without friction below 1, and sand/water without speed below 1. Require a visible material when nondefault movement is authored. Add parameterized tests for NaN, Infinity, both out-of-range ends, unknown names, and valid omitted defaults. Keep tuning constraints separate from terrain geometry validation.
- [x] Run focused tests, document final tuning and boundary/air/platform semantics, and commit `feat: add shared terrain movement properties`.

## Task 2: Deterministic bouncing creatures

**Files:** Modify `src/world/level.ts`, `src/game/interactions.ts`, `tests/interactions.test.ts`, and `tests/world.test.ts`.

**Interfaces:** Add optional `bounce?: { amplitude: number; seconds: number }` to `WorldEntity`. Export `advanceBounces(run: RunState, level: LevelData): void`; consume `run.seconds`. Rendering continues to use `entityPosition`, and contact detection continues to use `EntityState` positions.

- [x] Add a synthetic slime at a flat ground anchor with amplitude 8 and period 2 seconds. Set `run.seconds = 1`, advance bounces, and assert `entityPosition(run, entity).y === entity.y - 8`. Check at 0, 2 and 4 seconds that it is back on the anchor. Run contact detection with Henry's feet within 28px of the live position but outside 28px of the authored anchor, and assert damage occurs there.
- [x] Test identical positions when run time does not change, plus `startNewRun` restoring the authored position and zero clock. Reject bouncing on non-slimes, amplitude outside (0, 12], period outside [1, 4], and nonfinite values. Add pause coverage through `AdventureScene` in Task 4.
- [x] Run `npm test -- tests/interactions.test.ts tests/world.test.ts`, confirming the missing bounce behavior fails.
- [x] Implement the optional data and validation. Call `advanceBounces` after patrol advancement and before contact checks in `stepEntities`; use the existing state X and `surfaceY` only for patrolling anchors, otherwise the authored Y:

```ts
const phase = (run.seconds % bounce.seconds) / bounce.seconds;
state.y = baseY - Math.sin(phase * Math.PI) ** 2 * bounce.amplitude;
```

  The configured `seconds` means one full rise/fall cycle, with maximum lift at half-period.
- [x] Preserve ordinary slime contact damage; add no stomp mechanic. Run focused tests and commit `feat: add deterministic jellyfish bounce motion`.

## Task 3: Biome art, layouts and material rendering

**Files:** Create `src/world/frost-ridge.ts`, `src/world/sandy-cove.ts`, `src/world/surface-materials.ts`, `tests/biomes.test.ts`, two source art directories, and two runtime atlas directories. Modify `src/world/renderer.ts` and `tests/renderer.test.ts`. Registration happens in Task 4.

**Interfaces:** Export `FROST_RIDGE: LevelData`, `SANDY_COVE: LevelData`, and `drawSurfaceMaterials(ctx: CanvasRenderingContext2D, level: LevelData, offset: { x: number; y: number }): void`.

- [x] Add level tests importing the new modules. For each, call `validateLevel`, require six matching checkpoint entities, at least thirty gems, grounded checkpoint positions, contiguous surfaces, and no ground below the recovery threshold. Frost: every ice surface is flat, hazard-free and followed by at least 240px ordinary flat runout before danger. Cove: water and sand are flat, no hazards or jellyfish occupy them, jellyfish have bounded bounce data and are at least 120px from water/checkpoints. Start tests with missing modules and confirm failure.
- [x] Author six sections per level with explicit, varied contour points. Initial route budgets are approximately 10,000–12,000px, adjusted after full-route simulations. Frost section themes: snowfield introduction, fir climb, frozen lake, spring ridge, glacier flats, summit approach. Cove themes: beach arrival, palm dunes, first shallows, driftwood bay, tide pools, sunny exit. Use distinct section lengths and entity placements rather than repeating one generated section six times. Every checkpoint sits on safe ordinary ground; place springs before optional bonus gem arcs, not mandatory gaps.
- [x] Create source prompts preserving this exact shared cell order:

```text
4 by 4 sprite sheet, 16 isolated cells, transparent background, no labels or grid.
Row 1: flat terrain, left terrain cap, right terrain cap, rising terrain ramp.
Row 2: hazard, large background decoration, tree, small decoration.
Row 3: gem, spring, creature, checkpoint.
Row 4: construction finish arch, dust puff, distant landscape, low bush/debris.
Detailed readable pixel art for a forgiving child-oriented side-scrolling game.
```

  Frost additions: snow/ice terrain, icicle cluster, snowy cave, snow-laden fir, frost flowers, bright gold gem, snow spring, blue slime, dark-blue/gold checkpoint, snowy construction arch, powder puff, distant blue peaks, snow bush. Cove additions: sand terrain, coral hazard (art only; no required hazard placements), beach shelter, palm, shells, bright gem, driftwood spring, purple jellyfish, beach checkpoint, construction beach arch, sand puff, sea/islands, driftwood. Save exact complete prompts before generation, then use the built-in generator once per atlas. Inspect each generated sheet.
- [x] Save source sheets as `assets/source/{frost,cove}/environment-sheet.png`, process via `python3 scripts/process_sprite_atlas.py SOURCE DESTINATION`, and save `public/assets/{frost,cove}/environment.png`. Generate matching 48px-cell manifests in existing asset order. Inspect alpha bounds to record real anchors/terrain tops. Write provenance identifying built-in generation, prompt, source and processing command; do not claim a model version the tool did not report.
- [x] Implement material overlays as surface-aligned 8px bands below the ground edge: cyan/glints for ice, amber/stipples for sand, blue/wave marks for water. Clip marks to each segment's bounds and cull offscreen segments. Call after terrain tiles and ordinary edges but before entities. No world-coordinate pattern drift with camera movement.
- [x] Add renderer recording tests for band X/width at offsets 0 and 0.5, distinct material colors/patterns, no marks beyond the surface, and no overlays on unmarked ground. Add atlas tests for all sixteen cells, dimensions and nonempty alpha content. Run `npm test -- tests/biomes.test.ts tests/renderer.test.ts tests/sprite-processing.test.ts` and commit the independently testable art/layout/rendering deliverable.

## Task 4: Integrate, play through, review and open PR

**Files:** Modify `src/world/levels.ts`, affected scene fixtures in `tests/*.test.ts`, `tests/browser.spec.ts`, `docs/REQUIREMENTS.md`, `docs/gameplay-movement.md`, and `docs/art/README.md`. Create `docs/evidence/issues-34-35/README.md` and screenshots.

**Interfaces:** Append/re-export Frost then Cove in `LEVELS`. Reuse `levelById`, `loadWorldAssetMap`, `AdventureScene` and the title picker unchanged unless a concrete five-level regression requires a fix.

- [x] Add failing registration checks:

```ts
expect(levelById('frost')).toBe(FROST_RIDGE);
expect(levelById('cove')).toBe(SANDY_COVE);
expect(LEVELS.slice(-2)).toEqual([FROST_RIDGE, SANDY_COVE]);
```

- [x] Register both levels. Locate fixtures with `rg -n 'timbers|worldMap' tests` and supply all registered atlas keys, preserving tests intentionally asserting missing assets. Prefer a small reusable test helper built from `LEVELS` for dummy maps, while keeping distinct atlas objects in renderer-selection tests.
- [x] Adapt the deterministic traversal harness in `tests/treetop-timbers.test.ts` to each new trail. Use sustained right and simple anticipatory danger jumps; require finish within 180 simulation seconds, no recovery loops, gems collected, and checkpoints activated. Separately traverse every Cove water patch without jumping and assert no damage/recovery events and positive progress. Sample all Frost ice entry/exit regions. Add replay tests asserting fresh gems, health, time and bounce state, plus pause tests that freeze live entity positions. Record actual traversal times without presenting automated run time as a human playtest.
- [x] Extend the existing browser atlas-observation pattern to Frost (three picker steps) and Cove (four). Wait for ready/title, select with key presses, start, assert selected atlas draw calls, move through the introductory material section and capture screenshots. Observe visible debug X/V to verify ice coasting and Cove slowdown. Add a failed Frost/Cove atlas request test that exercises retry. Cover replay and picker reuse after completion with a deterministic browser clock if necessary; do not add production test-only state.
- [x] Update canonical requirements to five levels and shipped atlas names. Document tuning, harmless shallow water, contact-damage jellyfish, provenance and evidence. Preserve exclusions on persistence and runtime generation.
- [x] Run the required verification once the implementation is stable:

```sh
npm test
npm run typecheck
npm run build
npm run test:browser
git diff --check
```

  Inspect screenshots from Chromium, Firefox and WebKit; commit representative biome/material views under the evidence directory. Record commands, outcomes, traversal times and any unperformed human playtesting. If a required check cannot run, investigate the environment and report the limitation explicitly.
- [x] Read the requesting-code-review skill and dispatch one reviewer subagent with the approved spec, plan, base commit `16839ee`, completed diff, test results, and explicit read-only review instructions. While it reviews, prepare the PR body and verify evidence links. Fix important findings and rerun affected checks; ask the same reviewer to verify fixes.
- [ ] Read verification-before-completion and finishing-a-development-branch skills. Commit remaining work, push the current branch, and open one PR with the user-visible result, `Closes #34`, `Closes #35`, `Closes #39`, test results, screenshot links, and known limitations. Do not include #33 or merge the PR. Return the PR URL and concise validation summary.
