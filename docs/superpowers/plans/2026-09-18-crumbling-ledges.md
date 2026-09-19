# Crumbling Ledges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three readable, deterministic crumbling ledges to Quarry Run that drop Henry onto safe terrain and reset on checkpoint recovery.

**Architecture:** Keep static terrain immutable and expose active ledge entities as optional one-way collision platforms to movement. Store stable/warning/crumbled state and the 0.75-second timer in `RunState`; scenes bridge run-owned collision and visual state into movement and rendering. Render the mechanic with repeated existing stone art plus deterministic procedural shake and cracks.

**Tech Stack:** TypeScript, Vite, Vitest, Canvas 2D, Playwright

**Spec:** `docs/superpowers/specs/2026-09-18-crumbling-ledges-design.md`

## Global Constraints

- Audience: Henry, age six; forgiving and readable at speed.
- Use three 72px-wide ledges in later Quarry sections.
- Use a fixed 0.75-second warning that continues after Henry leaves.
- Every ledge must drop onto safe ordinary terrain, never checkpoint recovery.
- Checkpoint recovery restores ledges but preserves gems and the active checkpoint.
- Reuse the existing Plains/Quarry atlas; add no new artwork, audio, input, or persistence.
- Preserve deterministic simulation and immutable level surfaces.

---

### Task 1: Level model, validation, and Quarry placements

**Files:**
- Modify: `src/world/level.ts`
- Modify: `src/world/levels.ts`
- Modify: `tests/world.test.ts`
- Modify: `tests/quarry-run.test.ts`

**Interfaces:**
- Produces: `WorldEntityKind` member `'crumbling-ledge'`
- Produces: optional `WorldEntity.width?: number`, required and positive for crumbling ledges
- Produces: three Quarry entities with IDs `quarry-ledge-001` through `quarry-ledge-003`, width `72`, asset `stone`, and layer `world`
- Consumes: existing `surfaceY(level, x)` for safe-ground validation

- [ ] **Step 1: Write failing level-validation and Quarry-placement tests**

Add tests that reject missing/non-positive widths, out-of-bounds spans, ledges less than 36px above terrain, and ledges whose terrain is already below `level.height + 80`. Add Quarry assertions equivalent to:

```ts
const ledges = ofKind('crumbling-ledge');
expect(ledges).toHaveLength(3);
for (const ledge of ledges) {
  expect(ledge.width).toBe(72);
  for (const x of [ledge.x - 36, ledge.x, ledge.x + 36]) {
    const ground = surfaceY(QUARRY_RUN, x);
    expect(ground - ledge.y, ledge.id).toBeGreaterThanOrEqual(36);
    expect(ground - DEFAULT_MOVEMENT.height).toBeLessThanOrEqual(FALL_Y);
  }
}
```

Exclude `crumbling-ledge` from the existing grounded-entity and main-route activation-window assertions.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/world.test.ts tests/quarry-run.test.ts`

Expected: FAIL because the entity kind, width validation, and Quarry ledges do not exist.

- [ ] **Step 3: Add the model, validation, and placements**

Extend `WorldEntity` and add a `validateCrumblingLedge` helper called from `validateLevel`. Validate the complete span, width, at least 36px of clearance at the left/center/right samples, safe ground above the fall threshold, and no overlap with checkpoints or springs. Add three ledges centered near the spring-driven routes at `x=6700`, `x=8040`, and `x=9900`, adjusting their authored `y` values only as needed to satisfy the invariant and natural landing arcs.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/world.test.ts tests/quarry-run.test.ts`

Expected: PASS, including the existing held-right Quarry completion test.

- [ ] **Step 5: Commit**

```bash
git add src/world/level.ts src/world/levels.ts tests/world.test.ts tests/quarry-run.test.ts
git commit -m "feat: place safe crumbling ledges"
```

### Task 2: One-way ledge collision

**Files:**
- Modify: `src/game/movement.ts`
- Modify: `tests/movement.test.ts`

**Interfaces:**
- Produces: `CollisionPlatform { id: string; x1: number; x2: number; y: number }`
- Changes: `simulatePlayer(player, input, terrain, seconds, platforms?: readonly CollisionPlatform[]): void`
- Consumes: active ledges supplied by Task 3

- [ ] **Step 1: Write failing one-way-platform movement tests**

Cover a descending landing, a max-speed diagonal landing that cannot tunnel through, upward pass-through, choosing a ledge above terrain, and becoming airborne after walking beyond an edge. Use a platform such as:

```ts
const platform = { id: 'ledge', x1: 80, x2: 152, y: 120 };
const player = createPlayer(116, terrain);
player.y = 70;
player.vy = 300;
player.onGround = false;
simulatePlayer(player, idle, terrain, 0.1, [platform]);
expect(player.y + DEFAULT_MOVEMENT.height).toBe(120);
expect(player.onGround).toBe(true);
```

- [ ] **Step 2: Run the movement tests and verify RED**

Run: `npm test -- tests/movement.test.ts`

Expected: FAIL because `CollisionPlatform` and the optional platform argument do not exist.

- [ ] **Step 3: Implement minimal collision support**

During each existing movement substep, retain the feet position before vertical integration. While descending, select the highest crossed platform whose horizontal span contains `player.x`, then compare it with normal terrain and snap to the highest valid landing surface. While ascending, ignore all platforms. If Henry was grounded on a platform and leaves its horizontal span, normal gravity makes him airborne and existing coyote time remains available.

- [ ] **Step 4: Run movement tests and verify GREEN**

Run: `npm test -- tests/movement.test.ts`

Expected: PASS with unchanged static-terrain tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/movement.ts tests/movement.test.ts
git commit -m "feat: support one-way platform collision"
```

### Task 3: Deterministic ledge lifecycle and scene wiring

**Files:**
- Modify: `src/game/interactions.ts`
- Modify: `src/game/adventure-scene.ts`
- Modify: `src/game/gameplay-preview.ts`
- Modify: `tests/interactions.test.ts`
- Modify: `tests/quarry-run.test.ts`

**Interfaces:**
- Produces: `CRUMBLE_WARNING_SECONDS = 0.75`
- Produces: `CrumblingLedgePhase = 'stable' | 'warning' | 'crumbled'`
- Extends: `EntityState` with optional `ledgePhase` and `ledgeSeconds`
- Produces: `activeLedgePlatforms(run, level): CollisionPlatform[]`
- Produces: `ledgeWarningProgress(run, entityId): number` returning `0` when stable/unknown and `0..1` while warning
- Consumes: Task 2's optional collision-platform input

- [ ] **Step 1: Write failing lifecycle tests**

Build a small level containing one ledge. Assert that `createRun` starts it stable and active, grounded contact starts warning at `0.75`, repeated contact does not restart the timer, `tickRun` advances while Henry is elsewhere, expiry marks it crumbled/inactive, and `recoverFromFall` restores it while leaving a collected gem and checkpoint intact. Assert `startNewRun` restores the initial entity state.

- [ ] **Step 2: Run interactions tests and verify RED**

Run: `npm test -- tests/interactions.test.ts`

Expected: FAIL because ledge phases, timers, and active-platform projection do not exist.

- [ ] **Step 3: Implement the run-owned lifecycle**

Initialize ledge fields in `placeEntities`, trigger stable ledges in `stepEntities` when Henry is grounded with feet at the ledge `y` and center inside its width, advance timers in `tickRun`, and centralize restoration for `recoverFromFall`. Keep `collectedGems` and `checkpointId` untouched during recovery.

- [ ] **Step 4: Wire both scenes to active collision platforms**

Change each gameplay update to call:

```ts
simulatePlayer(this.player, input, this.level, seconds, activeLedgePlatforms(this.run, this.level));
```

Keep run ticking before movement and entity contact after movement so a landing gets the complete 0.75-second warning.

- [ ] **Step 5: Run focused gameplay tests and verify GREEN**

Run: `npm test -- tests/interactions.test.ts tests/quarry-run.test.ts tests/screens.test.ts`

Expected: PASS; Quarry remains completable and recovery behavior is unchanged except that ledges restore.

- [ ] **Step 6: Commit**

```bash
git add src/game/interactions.ts src/game/adventure-scene.ts src/game/gameplay-preview.ts tests/interactions.test.ts tests/quarry-run.test.ts
git commit -m "feat: run crumbling ledge lifecycle"
```

### Task 4: Warning and crumble rendering

**Files:**
- Modify: `src/world/renderer.ts`
- Modify: `src/game/adventure-scene.ts`
- Modify: `src/game/gameplay-preview.ts`
- Modify: `tests/renderer.test.ts`

**Interfaces:**
- Extends: `EntityPosition` result to `{ x: number; y: number; warningProgress?: number }`
- Consumes: `ledgeWarningProgress(run, entity.id)` from Task 3
- Produces: exported `drawCrumblingLedge(...)` only if direct focused testing is clearer than testing through `drawWorld`

- [ ] **Step 1: Write failing renderer tests**

Use the recording canvas to assert that a 72px stable ledge draws three half-scale stone tiles, a warning ledge offsets tiles deterministically and emits crack strokes, greater progress produces at least as much visible warning, and an inactive/crumbled ledge is omitted by the existing entity filter.

- [ ] **Step 2: Run renderer tests and verify RED**

Run: `npm test -- tests/renderer.test.ts`

Expected: FAIL because ledges are still drawn as one ordinary asset and warning progress is ignored.

- [ ] **Step 3: Implement deterministic ledge drawing**

For `crumbling-ledge`, draw three existing `stone` cells at scale `0.5` across the 72px width. Derive a small integer horizontal offset from `warningProgress` only; draw one crack for early warning and additional branches after halfway. Do not use elapsed wall time or mutate state in rendering.

- [ ] **Step 4: Pass presentation state from both scenes**

Extend the existing position callback so warning ledges return their run-derived progress while all other entities keep their current positions. Keep `isEntityActive` as the single visibility gate.

- [ ] **Step 5: Run renderer and unit suites and verify GREEN**

Run: `npm test -- tests/renderer.test.ts`

Run: `npm test`

Expected: PASS with no warnings.

- [ ] **Step 6: Commit**

```bash
git add src/world/renderer.ts src/game/adventure-scene.ts src/game/gameplay-preview.ts tests/renderer.test.ts
git commit -m "feat: render crumbling ledge warnings"
```

### Task 5: Browser behavior, evidence, and full verification

**Files:**
- Modify: `tests/browser.spec.ts`
- Create: `docs/evidence/issue-38/README.md`
- Create: `docs/evidence/issue-38/chromium-ledges.png`
- Create: `docs/evidence/issue-38/firefox-ledges.png`
- Create: `docs/evidence/issue-38/webkit-ledges.png`

**Interfaces:**
- Consumes: playable route `/?scene=adventure`
- Produces: browser-level proof that stable, warning, and crumbled ledge presentation is reachable and reset behavior works

- [ ] **Step 1: Add the browser test before any browser-only implementation changes**

Start Quarry Run, position Henry above a ledge through the same scene-state test seam already used elsewhere in `browser.spec.ts`, advance fixed frames until landing, assert the warning is visibly different, advance past 0.75 seconds, assert the ledge is absent, then force fall recovery and assert it is visible again. Attach one evidence screenshot per browser.

- [ ] **Step 2: Run the focused browser check**

Run: `npx playwright test tests/browser.spec.ts --grep "crumbling ledge"`

Expected: PASS if Tasks 1–4 expose the complete behavior; otherwise use the failure to correct the smallest missing integration and rerun.

- [ ] **Step 3: Document evidence**

Record the tested route, browser projects, stable/warning/crumbled/reset assertions, and screenshot filenames in `docs/evidence/issue-38/README.md`.

- [ ] **Step 4: Run required verification**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `npm run test:browser`

Expected: all commands exit `0`.

- [ ] **Step 5: Commit**

```bash
git add tests/browser.spec.ts docs/evidence/issue-38
git commit -m "test: verify crumbling ledges in browsers"
```

### Task 6: Review, fixes, and pull request

**Files:**
- Modify: only files required by review findings

**Interfaces:**
- Consumes: complete branch diff against `origin/main`
- Produces: reviewed, verified branch and GitHub pull request closing issue 38

- [ ] **Step 1: Dispatch the requested review subagent**

Ask a fresh subagent to inspect `origin/main...HEAD` for correctness, regressions, spec compliance, test gaps, and maintainability. Require file/line evidence and severity for every finding.

- [ ] **Step 2: Address valid findings test-first**

For each valid behavioral finding, add or adjust a test, observe the failure, make the smallest fix, and rerun the focused suite. Commit fixes with an imperative subject.

- [ ] **Step 3: Re-run final verification after review fixes**

Run: `npm test && npm run typecheck && npm run build && npm run test:browser`

Expected: all commands exit `0` on the reviewed commit.

- [ ] **Step 4: Push and open the PR**

Push `38-crumbling-ledges` and create a PR against `main` with a user-visible summary, `Closes #38`, exact validation results, evidence links/screenshots, and any known limitations.
