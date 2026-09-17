# Multi-level Trails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make levels runtime data, add the themed Quarry Run route and title picker, and update the project documentation while preserving the current Plains behavior.

**Architecture:** `LevelData` is the single contract for terrain, entities, checkpoints, finish data, atlas selection, and renderer theme. `src/world/levels.ts` owns the flat registry consumed by previews and `AdventureScene`; the scene rebuilds all level-dependent state through one loader. The renderer and asset loader read level data, while the unchanged `ScreenController` continues to own title, gameplay, pause, and finish states.

**Tech Stack:** TypeScript, Vite, Canvas 2D, Vitest, Playwright, GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-09-17-multi-level-trails-design.md`

## Global Constraints

- Use Node.js 22.12 or newer and preserve the existing two-space TypeScript style, semicolons, single quotes, and explicit exported types.
- Keep simulation deterministic and separate from rendering.
- Keep progress in memory only; do not add browser storage, backend calls, credentials, or runtime image generation.
- Keep the existing Plains atlas and current Plains colors, parallax positions, route, and preview URLs behaviorally unchanged.
- Every new or changed behavior starts with a focused failing test, then the smallest implementation, then a passing focused test before refactoring.
- Each issue is committed and published as its own stacked pull request in order #27, #28, #30, #29, #31.

---

### Task 1: Start the issue #27 branch and record the current baseline

**Files:**
- Git branch only: create `feat/issue-27-level-parameter` from the design commit.

**Interfaces:**
- Consumes: commit `f276bff` containing the approved design.
- Produces: an issue #27 branch with a clean starting point and a recorded test baseline.

- [ ] **Step 1: Create the issue branch and confirm the working tree.**

  ```sh
  git switch -c feat/issue-27-level-parameter
  git status --short --branch
  ```

  Expected: the branch is `feat/issue-27-level-parameter` and no unrelated files are modified.

- [ ] **Step 2: Run the baseline checks before changing code.**

  ```sh
  npm test
  npm run typecheck
  npm run build
  ```

  Expected: all commands exit successfully; record the test count in the issue #27 PR description.

### Task 2: Add the runtime level contract and generic validation for issue #27

**Files:**
- Modify: `src/world/level.ts`
- Create: `src/world/levels.ts`
- Modify: `tests/world.test.ts`

**Interfaces:**
- Consumes: current `LevelData`, `surfaceY`, and `PLAINS_LEVEL` data.
- Produces: `LevelData` fields `id`, `name`, and `atlas`; `LEVELS: readonly LevelData[]`, `DEFAULT_LEVEL: LevelData`, and `levelById(id: string): LevelData | undefined`; generic `validateLevel(level: LevelData): void`.

- [ ] **Step 1: Write failing registry and validation tests.**

  Add tests that import `LEVELS`, `DEFAULT_LEVEL`, `levelById`, `PLAINS_LEVEL`, and `validateLevel`, then assert:

  ```ts
  it('registers Plains as the default runtime level', () => {
    expect(DEFAULT_LEVEL).toBe(PLAINS_LEVEL);
    expect(LEVELS).toContain(PLAINS_LEVEL);
    expect(levelById('plains')).toBe(PLAINS_LEVEL);
  });

  it('rejects non-contiguous surfaces and unplanted checkpoints', () => {
    expect(() => validateLevel({ ...PLAINS_LEVEL, surfaces: [
      { x1: 0, x2: 10, y1: 100, y2: 100 },
      { x1: 11, x2: 20, y1: 100, y2: 100 },
    ] })).toThrow(/contiguous/);
    expect(() => validateLevel({ ...PLAINS_LEVEL, checkpoints: [
      { id: 'missing', x: 100, y: surfaceY(PLAINS_LEVEL, 100) },
    ] })).toThrow(/checkpoint/);
  });
  ```

  Replace the current test-only surface and checkpoint invariant loops with tests that call the validator for every `LEVELS` entry. Keep the Plains-only elevated-gem assertions in their own `PLAINS_LEVEL` tests.

- [ ] **Step 2: Run the focused world tests and confirm the new tests fail for missing behavior.**

  ```sh
  npx vitest run tests/world.test.ts
  ```

  Expected: FAIL because the registry exports and new validation errors do not exist yet.

- [ ] **Step 3: Implement the level metadata, registry, and invariants.**

  Add type-only `WorldAsset` usage where needed so there is no runtime import cycle. Set Plains metadata to:

  ```ts
  id: 'plains',
  name: 'PLAINS',
  atlas: 'plains',
  ```

  Create `src/world/levels.ts` with a flat registry containing `PLAINS_LEVEL`, `DEFAULT_LEVEL = PLAINS_LEVEL`, and `levelById` returning the matching ID or `undefined`. Update `validateLevel` to check:

  ```ts
  level.surfaces[0].x1 === level.minX;
  level.surfaces.at(-1)?.x2 === level.maxX;
  level.surfaces[index - 1].x2 === level.surfaces[index].x1;
  level.surfaces[index - 1].y2 === level.surfaces[index].y1;
  checkpoint.y === surfaceY(level, checkpoint.x);
  matchingEntity.kind === 'checkpoint' && matchingEntity.x === checkpoint.x;
  ```

  Use level-agnostic messages such as `surfaces must be contiguous`, `surfaces must span level bounds`, and `checkpoint is not planted on terrain: <id>`.

- [ ] **Step 4: Run the focused world suite and the typecheck.**

  ```sh
  npx vitest run tests/world.test.ts
  npm run typecheck
  ```

  Expected: PASS. If existing Plains data violates a new invariant, correct only the data invariant revealed by the validator and add the regression assertion.

- [ ] **Step 5: Commit the contract and validation.**

  ```sh
  git add src/world/level.ts src/world/levels.ts tests/world.test.ts
  git commit -m "feat: add runtime level registry and validation"
  ```

### Task 3: Inject the required level through gameplay and previews for issue #27

**Files:**
- Modify: `src/game/interactions.ts`
- Modify: `src/game/adventure-scene.ts`
- Modify: `src/game/gameplay-preview.ts`
- Modify: `src/world/preview-scene.ts`
- Modify: `src/main.ts`
- Modify: `tests/interactions.test.ts`
- Modify: `tests/screens.test.ts`
- Modify: `tests/renderer.test.ts`
- Modify: `tests/controller-gameplay.test.ts`

**Interfaces:**
- Consumes: `LevelData`, `DEFAULT_LEVEL`, the registry from Task 2, and existing scene constructors.
- Produces: `recoverFromFall(run, player, events, level)` with a required `level`; `new AdventureScene(henry, world, audio, level)`; previews that accept `level: LevelData = DEFAULT_LEVEL`.

- [ ] **Step 1: Update tests to use the required recovery and scene arguments.**

  Change every test call to pass `PLAINS_LEVEL` to `recoverFromFall` and every `AdventureScene` construction to pass `PLAINS_LEVEL`. Add a scene test using a small custom level that checks the player starts at that level’s start x and that its finish can complete the scene; this test must fail while the scene still imports Plains.

  ```ts
  const scene = new AdventureScene({} as never, {} as never, audio, PLAINS_LEVEL);
  recoverFromFall(run, player(), log, PLAINS_LEVEL);
  ```

- [ ] **Step 2: Run the affected tests before implementation.**

  ```sh
  npx vitest run tests/interactions.test.ts tests/screens.test.ts tests/renderer.test.ts tests/controller-gameplay.test.ts
  ```

  Expected: FAIL or type errors at the new required call sites until production signatures and all old references are updated.

- [ ] **Step 3: Remove the fallback level and parameterize the scenes.**

  Delete the default Plains import from `interactions.ts` and make the fourth argument required. In `AdventureScene`, add a constructor `level` parameter, replace all gameplay and rendering `PLAINS_LEVEL` references with `this.level`, remove the readonly camera initializer, and add:

  ```ts
  private loadLevel(level: LevelData): void {
    this.level = level;
    this.player = createPlayer(level.start.x, level);
    this.run = createRun(level);
    this.camera = new Camera({ width: 426, height: 240, worldWidth: level.width, worldHeight: level.height });
  }
  ```

  Call it from construction and replay. Pass `DEFAULT_LEVEL` in `main.ts`. Parameterize `GameplayPreviewScene` and `WorldPreviewScene` with a default `DEFAULT_LEVEL`, keeping their existing default route behavior. Keep asset loading on its current default call until issue #28 adds the directory parameter and wires `level.atlas` into `loadGameplayAssets`.

- [ ] **Step 4: Run the affected suites and typecheck.**

  ```sh
  npx vitest run tests/interactions.test.ts tests/screens.test.ts tests/renderer.test.ts tests/controller-gameplay.test.ts
  npm run typecheck
  ```

  Expected: PASS with no production import of `PLAINS_LEVEL` outside `src/world/level.ts` and `src/world/levels.ts`.

- [ ] **Step 5: Verify the full issue #27 implementation and commit it.**

  ```sh
  rg -n "PLAINS_LEVEL" src
  npm test
  npm run build
  git diff --check
  git add src tests
  git commit -m "feat: make gameplay level configurable"
  ```

  Expected: the `rg` output contains only the two allowed world data modules; tests, typecheck, build, and whitespace checks pass.

### Task 4: Publish issue #27 and start the issue #28 branch

**Files:**
- Git metadata only: `feat/issue-27-level-parameter`, then `feat/issue-28-level-theme`.

**Interfaces:**
- Consumes: the validated issue #27 commits.
- Produces: a pushed issue #27 pull request and a stacked issue #28 branch.

- [ ] **Step 1: Run the complete issue #27 verification before publishing.**

  ```sh
  npm test && npm run typecheck && npm run build && npm run test:browser
  ```

  Expected: all required checks pass, with only the repository’s documented browser skips.

- [ ] **Step 2: Push issue #27 and create its PR.**

  ```sh
  git push -u origin feat/issue-27-level-parameter
  gh pr create --base main --head feat/issue-27-level-parameter --title "feat: make the level a runtime parameter" --body-file /tmp/issue-27-pr.md
  ```

  The PR body must explain the runtime contract, generic validation, required injection, tests, and the exact validation commands, and include `Closes #27`.

- [ ] **Step 3: Branch issue #28 from the issue #27 head.**

  ```sh
  git switch -c feat/issue-28-level-theme
  git status --short --branch
  ```

### Task 5: Move renderer appearance and asset paths into level data for issue #28

**Files:**
- Modify: `src/world/level.ts`
- Modify: `src/world/renderer.ts`
- Modify: `src/world/assets.ts`
- Modify: `src/game/gameplay-preview.ts`
- Modify: `src/main.ts`
- Modify: `tests/renderer.test.ts`
- Create or modify: `tests/world-assets.test.ts`

**Interfaces:**
- Consumes: runtime `LevelData` and `WorldAsset` from issue #27.
- Produces: `LevelTheme` with `sky`, `ground`, `edge`, and `parallax`; `loadWorldAssets(directory = 'plains')` with generic error messages; `loadGameplayAssets(level: LevelData = DEFAULT_LEVEL)` that passes `level.atlas` to the loader; a renderer whose Plains calls use only `level.theme` for these values.

- [ ] **Step 1: Write failing theme and loader tests.**

  Add a renderer test with a custom theme and assert its first fill and parallax image calls use the custom values and positions. Add a loader test that mocks `fetch` and `Image`, calls `loadWorldAssets('quarry')`, and verifies requests use `/assets/quarry/manifest.json` and the manifest image. Assert a failed response does not contain the word `Plains`.

  ```ts
  const level = { ...PLAINS_LEVEL, theme: {
    sky: '#010203', ground: '#040506', edge: '#070809',
    parallax: [{ asset: 'cave', x: 90, y: 55, scale: 2 }],
  }};
  drawWorld(ctx, worldAssets, level, camera);
  expect(ctx.fillStyle).toBe('#010203');
  ```

- [ ] **Step 2: Run focused tests and confirm the new behavior fails.**

  ```sh
  npx vitest run tests/renderer.test.ts tests/world-assets.test.ts
  ```

  Expected: FAIL because `LevelData` has no theme and `loadWorldAssets` ignores its directory.

- [ ] **Step 3: Implement theme data and parameterized loading.**

  Add the exported `LevelTheme` type, put the exact current Plains values in `PLAINS_LEVEL.theme`, replace renderer hardcoded colors and two hills with `level.theme`, and preserve the existing parallax factors `0.18` and `0.1`. Change `loadWorldAssets(directory = 'plains')` to use `${BASE_URL}assets/${directory}/`, and use generic messages `Could not load world asset metadata`, `Missing world asset: <asset>`, and `Could not load world atlas`. Change `loadGameplayAssets(level: LevelData = DEFAULT_LEVEL)` to call `loadWorldAssets(level.atlas)` and pass `DEFAULT_LEVEL` from `main.ts`, preserving all preview defaults.

- [ ] **Step 4: Run focused and full unit verification.**

  ```sh
  npx vitest run tests/renderer.test.ts tests/world-assets.test.ts
  npm test
  npm run typecheck
  npm run build
  ```

  Expected: PASS and unchanged Plains renderer assertions.

- [ ] **Step 5: Commit issue #28 and publish its PR.**

  ```sh
  git add src tests
  git commit -m "feat: make world rendering level-specific"
  git push -u origin feat/issue-28-level-theme
  gh pr create --base feat/issue-27-level-parameter --head feat/issue-28-level-theme --title "feat: add per-level world themes" --body-file /tmp/issue-28-pr.md
  ```

  The PR body must include `Closes #28`, state that Plains pixel output is preserved, and list unit, typecheck, build, and browser validation.

### Task 6: Start issue #30 and author the validated Quarry Run data

**Files:**
- Modify: `src/world/levels.ts`
- Modify: `tests/world.test.ts`
- Create or modify: `tests/quarry-run.test.ts`

**Interfaces:**
- Consumes: `LevelData`, `LevelTheme`, generic validation, `surfaceY`, and the world asset names.
- Produces: exported `QUARRY_RUN: LevelData`, registered in `LEVELS`, with `levelById('quarry')` support and no new public atlas files.

- [ ] **Step 1: Write failing Quarry registry, geometry, and interaction-placement tests.**

  Add assertions that `QUARRY_RUN` is registered, validates, has the Quarry metadata and cave parallax, has exactly two springs and two checkpoints, has a stone hazard, has a surface below `height + 80` for a fall pit, and places every interactive gem, spring, checkpoint, and hazard within 28 pixels vertically of `surfaceY(QUARRY_RUN, entity.x)`.

  ```ts
  it('registers a playable Quarry Run', () => {
    expect(levelById('quarry')).toBe(QUARRY_RUN);
    expect(() => validateLevel(QUARRY_RUN)).not.toThrow();
    expect(QUARRY_RUN.theme.parallax.every(({ asset }) => asset === 'cave')).toBe(true);
    expect(QUARRY_RUN.entities.filter(({ kind }) => kind === 'spring')).toHaveLength(2);
  });
  ```

- [ ] **Step 2: Run focused tests and confirm Quarry is absent.**

  ```sh
  npx vitest run tests/world.test.ts tests/quarry-run.test.ts
  ```

  Expected: FAIL because `QUARRY_RUN` is not defined or registered.

- [ ] **Step 3: Implement a short, forgiving Quarry route.**

  Add a contiguous route with `minX = 0`, `maxX` materially shorter than Plains, and a terrain sequence containing safe flats, two steeper ramp pairs, and one segment whose ground is below `height + 80` to create recovery space. Use `stone` ground-facing entities, `cave` parallax, and `finish-arch`. Give all entities `quarry-` IDs. Place two springs on walkable ground, gems just after their ramp exits, two checkpoint entities at `surfaceY` positions, and one stone hazard at a reachable ground position. Use a grey-blue sky, stone-grey ground, and a contrasting edge color. Register `QUARRY_RUN` after Plains and run `validateLevel` for each registry entry at module initialization only if the project’s current data-module pattern permits it; otherwise keep validation in tests to avoid import-time side effects.

- [ ] **Step 4: Run Quarry and full unit verification.**

  ```sh
  npx vitest run tests/world.test.ts tests/quarry-run.test.ts tests/interactions.test.ts
  npm test
  npm run typecheck
  npm run build
  ```

  Expected: PASS, including checkpoint recovery called with `QUARRY_RUN` and no Plains checkpoint leakage.

- [ ] **Step 5: Commit issue #30 and publish its PR.**

  ```sh
  git switch -c feat/issue-30-quarry-run
  git add src/world/levels.ts tests/world.test.ts tests/quarry-run.test.ts
  git commit -m "feat: add Quarry Run level"
  git push -u origin feat/issue-30-quarry-run
  gh pr create --base feat/issue-28-level-theme --head feat/issue-30-quarry-run --title "feat: add Quarry Run" --body-file /tmp/issue-30-pr.md
  ```

  The PR body must include `Closes #30`, describe route interactions and recovery, and report unit, typecheck, build, and browser checks planned for the next issue gate.

### Task 7: Add the title-screen picker for issue #29

**Files:**
- Modify: `src/game/adventure-scene.ts`
- Modify: `tests/screens.test.ts`
- Modify: `tests/renderer.test.ts`
- Modify: `tests/browser.spec.ts`

**Interfaces:**
- Consumes: `LEVELS`, `DEFAULT_LEVEL`, `AdventureScene.loadLevel`, and `InputFrame.horizontal`.
- Produces: title selection with one-step-per-input-edge movement, predictable wrapping, selected-level start, picker text `◀ LEVEL NAME ▶`, and a read-only `selectedLevelName` getter used by unit tests.

- [ ] **Step 1: Write failing picker unit tests.**

  Add tests that start a scene on the title, press right once to select Quarry, repeat an update with right held to confirm it does not advance again, press right at the end to wrap to Plains, press left at the beginning to wrap to Quarry, and press jump to start the selected level. Assert the selected level’s start and finish state are used after starting.

  ```ts
  scene.update(1 / 60, { horizontal: 1, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false });
  scene.update(1 / 60, { horizontal: 1, jumpHeld: false, jumpPressed: false, pausePressed: false, mutePressed: false });
  expect(scene.selectedLevelName).toBe('QUARRY RUN');
  ```

  Add a render assertion that title text includes `◀ PLAINS ▶` or `◀ QUARRY RUN ▶` and uses the existing palette.

- [ ] **Step 2: Run the focused picker tests and confirm the missing behavior.**

  ```sh
  npx vitest run tests/screens.test.ts tests/renderer.test.ts
  ```

  Expected: FAIL because title horizontal input currently does nothing and no selection text is drawn.

- [ ] **Step 3: Implement edge-guarded selection and level loading.**

  Add mutable `private level: LevelData`, `selectedIndex = 0`, and a previous-horizontal direction field. While the screen is `title`, convert horizontal input to `-1`, `0`, or `1`; advance only when that direction differs from the previous nonzero direction, wrap with modulo `LEVELS.length`, and clear the edge state when input returns to zero. On `jumpPressed`, call `loadLevel(LEVELS[selectedIndex])`, then `screens.start()` and `screens.loaded()`. Keep pause and finish behavior unchanged except replay should call `loadLevel` for the selected level and return to title. Expose `get selectedLevelName(): string { return LEVELS[this.selectedIndex].name; }`. Draw the title panel subtitle as `◀ ${LEVELS[selectedIndex].name} ▶` and preserve the start instruction below it without overlap.

- [ ] **Step 4: Run focused and browser verification.**

  ```sh
  npx vitest run tests/screens.test.ts tests/renderer.test.ts
  npm test
  npm run typecheck
  npm run build
  npm run test:browser
  ```

  Expected: PASS. Add a browser assertion for selecting Quarry from the title, starting it, and confirming the adventure status remains in Playing state without page errors.

- [ ] **Step 5: Commit issue #29 and publish its PR.**

  ```sh
  git switch -c feat/issue-29-level-picker
  git add src/game/adventure-scene.ts tests/screens.test.ts tests/renderer.test.ts tests/browser.spec.ts
  git commit -m "feat: add title screen level picker"
  git push -u origin feat/issue-29-level-picker
  gh pr create --base feat/issue-30-quarry-run --head feat/issue-29-level-picker --title "feat: add the title-screen level picker" --body-file /tmp/issue-29-pr.md
  ```

  The PR body must include `Closes #29`, explain edge guarding and state rebuilds, and include browser evidence.

### Task 8: Update requirements and user documentation for issue #31

**Files:**
- Modify: `docs/REQUIREMENTS.md`
- Modify: `README.md`
- Modify: `docs/plains-adventure.md`
- Review: `docs/RELEASE-VERIFICATION.md`
- Review: `docs/RELEASE-VERIFICATION-2026-09-17.md`

**Interfaces:**
- Consumes: the shipped multi-level behavior and current documentation vocabulary.
- Produces: documentation that describes multiple levels, the picker, no new biome art, and in-memory progress without rewriting historical verification records.

- [ ] **Step 1: Write documentation checks as text assertions before editing.**

  Add a small test only if the repository already has a documentation-test pattern; otherwise use `rg` checks as the verification artifact. The required phrases are:

  ```sh
  rg -n "multiple|level picker|in-memory|no new biome|touch controls|public hosting" README.md docs/REQUIREMENTS.md docs/plains-adventure.md
  ```

  Before editing, confirm the existing text lacks at least one required current-behavior statement; this is the documentation red step.

- [ ] **Step 2: Update the canonical requirements and guides.**

  Change the scope to multiple desktop-browser levels with a title picker, state that Quarry Run reuses the Plains atlas and introduces no new biome artwork, and preserve touch controls, persistent saves, and public hosting as out of scope. Update README layout to include `src/world/levels.ts`, controls to include left/right picker selection, progress to say the selected level is not persisted, and limitations to remove the claim that extra biomes are the only route expansion while retaining the no-new-biome-art constraint. Update `docs/plains-adventure.md` to name Plains as one route and explain how the picker returns to the title. Review current release verification text and change only present-tense product claims that would be false after the picker ships; leave historical certification evidence dated and intact.

- [ ] **Step 3: Read the changed docs against the running behavior.**

  ```sh
  rg -n "one desktop-browser Plains|only level|Plains level|extra biomes|level picker|multiple levels" README.md docs/REQUIREMENTS.md docs/plains-adventure.md docs/RELEASE-VERIFICATION.md docs/RELEASE-VERIFICATION-2026-09-17.md
  git diff --check
  ```

  Expected: no current guide claims Plains is the only selectable route; historical release records remain clearly dated or accurate.

- [ ] **Step 4: Commit issue #31 and publish its PR.**

  ```sh
  git switch -c docs/issue-31-multi-level-docs
  git add README.md docs/REQUIREMENTS.md docs/plains-adventure.md docs/RELEASE-VERIFICATION.md docs/RELEASE-VERIFICATION-2026-09-17.md
  git commit -m "docs: document multi-level release scope"
  git push -u origin docs/issue-31-multi-level-docs
  gh pr create --base feat/issue-29-level-picker --head docs/issue-31-multi-level-docs --title "docs: document multi-level trails" --body-file /tmp/issue-31-pr.md
  ```

  The PR body must include `Closes #31`, identify the canonical requirements amendment, list documentation checks, and explain any historical verification text intentionally left unchanged.

### Task 9: Review and fix the complete stacked change

**Files:**
- Review: all files changed since `b0aaa9d`.
- Modify: only files needed to fix verified review findings.

**Interfaces:**
- Consumes: five published PR branches and all issue acceptance criteria.
- Produces: a clean full-diff review, fixes for every critical or important finding, and refreshed PR branches if needed.

- [ ] **Step 1: Inspect the complete diff and run the full verification suite.**

  ```sh
  git diff --stat b0aaa9d...HEAD
  git diff --check b0aaa9d...HEAD
  npm test
  npm run typecheck
  npm run build
  npm run test:browser
  ```

- [ ] **Step 2: Review each issue criterion against code, tests, and docs.**

  Check that runtime callers cannot fall back to Plains, renderer output remains pixel-equivalent for Plains, Quarry recovery uses Quarry checkpoints, picker input has an edge guard, all current docs match the product, and no persistence or new atlas was introduced. For each finding, record the file and observable failure before changing code.

- [ ] **Step 3: Fix findings with the same failing-test-first cycle.**

  For every defect found, add or amend the smallest focused test, run it to observe the expected failure, implement the fix, rerun the focused test, then rerun the full suite. Do not broaden scope to unrelated cleanup.

- [ ] **Step 4: Request and address a code review of the final diff.**

  Use the code-review workflow with base `b0aaa9d` and the final head SHA. Fix all Critical and Important findings, push amended branches, and update affected PR descriptions with the final validation results.

- [ ] **Step 5: Re-run final verification before reporting completion.**

  ```sh
  npm test && npm run typecheck && npm run build && npm run test:browser
  git status --short --branch
  ```

  Expected: all required checks pass, the final branch is clean apart from intentional committed work, and the final response links all five PRs with their validation results.
