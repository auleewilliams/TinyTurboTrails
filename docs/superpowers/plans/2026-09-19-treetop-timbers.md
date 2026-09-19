# Treetop Timbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Treetop Timbers as a third selectable route with its own generated atlas and correct runtime atlas switching.

**Architecture:** Keep gameplay in the existing `LevelData` registry and preserve the fixed 16-key world manifest. Preload each unique registered atlas into a readonly map before constructing `AdventureScene`; rendering resolves the current level's atlas from that map, while preview scenes remain single-level.

**Tech Stack:** TypeScript, Canvas 2D, Vite, Vitest, Playwright, Python standard-library atlas processor, built-in image generation.

**Spec:** `docs/superpowers/specs/2026-09-19-treetop-timbers-design.md`

## Global Constraints

- Use Node.js 22.12 or newer and existing two-space, semicolon, single-quote TypeScript style.
- Keep simulation deterministic and separate from rendering.
- Preserve the 16 existing `WORLD_ASSETS` keys; no biome-specific renderer branch.
- Keep progress in memory only; add no backend, credentials, browser storage, or runtime generation.
- The required route must remain finishable without a timed jump.
- Every behavior change follows RED, GREEN, then refactor.

---

### Task 1: Add the timber atlas and validated level

**Files:**
- Create: `assets/source/timbers/environment-prompt.txt`
- Create: `assets/source/timbers/environment-sheet.png`
- Create: `assets/source/timbers/PROVENANCE.md`
- Create: `public/assets/timbers/environment.png`
- Create: `public/assets/timbers/manifest.json`
- Modify: `src/world/levels.ts`
- Create: `tests/treetop-timbers.test.ts`

**Interfaces:**
- Consumes: `LevelData`, `WorldEntity`, `surfaceY`, and the shared 16-key world manifest contract.
- Produces: `TREETOP_TIMBERS: LevelData` with ID and atlas `timbers`, registered in `LEVELS`.

- [x] **Step 1: Write focused route and manifest tests.**

  Assert registration, `validateLevel`, a route width of at least 9980, six checkpoints, at least six springs and hazards, at least thirty gems, four shallow V contours, grounded interactions, held-right completion, and indices 0–15 in the timber manifest.

- [x] **Step 2: Run the focused test and verify RED.**

  Run: `npx vitest run tests/treetop-timbers.test.ts`

  Expected: six failures because `TREETOP_TIMBERS` and `public/assets/timbers/manifest.json` do not exist.

- [x] **Step 3: Generate and process the atlas.**

  Generate the exact 4 × 4 sheet described in `assets/source/timbers/environment-prompt.txt` with the built-in image generator, save it as `environment-sheet.png`, then run:

  ```sh
  python3 scripts/process_sprite_atlas.py assets/source/timbers/environment-sheet.png public/assets/timbers/environment.png
  ```

  Pair the result with a manifest mapping the unchanged shared keys to indices 0–15 and visible-base anchors at y=44.

- [x] **Step 4: Implement and register the level.**

  Export `TREETOP_TIMBERS` from `src/world/levels.ts`. Build its surfaces from a contiguous point contour, compute grounded entity/checkpoint positions through `surfaceY`, set `atlas: 'timbers'`, and append it to `LEVELS`.

- [x] **Step 5: Run the focused test and verify GREEN.**

  Run: `npx vitest run tests/treetop-timbers.test.ts`

  Expected: 6 tests pass.

- [x] **Step 6: Commit the level and asset deliverable.**

  ```sh
  git add assets/source/timbers public/assets/timbers src/world/levels.ts tests/treetop-timbers.test.ts
  git commit -m "feat: add Treetop Timbers route"
  ```

### Task 2: Preload and select the correct world atlas

**Files:**
- Modify: `src/world/assets.ts`
- Modify: `src/game/adventure-scene.ts`
- Modify: `src/main.ts`
- Modify: `tests/world-assets.test.ts`
- Modify: `tests/screens.test.ts`
- Modify: `tests/renderer.test.ts`
- Modify: other `tests/*.test.ts` AdventureScene call sites mechanically

**Interfaces:**
- Produces: `WorldAssetMap = Readonly<Record<string, WorldAssets>>`.
- Produces: `loadWorldAssetMap(directories: readonly string[]): Promise<WorldAssetMap>` that deduplicates directory IDs.
- Changes: `new AdventureScene(henry, worlds, audio, level)` where `worlds` supplies every unique atlas in `LEVELS`.

- [x] **Step 1: Write failing map-loader and selected-atlas tests.**

  In `tests/world-assets.test.ts`, mock real metadata/image boundaries and assert:

  ```ts
  const worlds = await loadWorldAssetMap(['plains', 'timbers', 'plains']);
  expect(Object.keys(worlds)).toEqual(['plains', 'timbers']);
  ```

  In `tests/renderer.test.ts`, provide distinct atlas objects for `plains` and `timbers`, move the picker to Treetop Timbers, start it, render, and assert the first world draw uses the timber atlas. In `tests/screens.test.ts`, assert construction throws `Missing world assets: timbers` when the map omits that registered atlas.

- [x] **Step 2: Run focused tests and verify RED.**

  Run: `npx vitest run tests/world-assets.test.ts tests/screens.test.ts tests/renderer.test.ts`

  Expected: compile/test failures because `WorldAssetMap`, `loadWorldAssetMap`, and the map-based scene contract do not exist.

- [x] **Step 3: Implement deduplicated preloading.**

  Add to `src/world/assets.ts`:

  ```ts
  export type WorldAssetMap = Readonly<Record<string, WorldAssets>>;

  export async function loadWorldAssetMap(directories: readonly string[]): Promise<WorldAssetMap> {
    const unique = [...new Set(directories)];
    const loaded = await Promise.all(unique.map(loadWorldAssets));
    return Object.fromEntries(unique.map((directory, index) => [directory, loaded[index]]));
  }
  ```

- [x] **Step 4: Make AdventureScene resolve the current atlas.**

  Replace the single `world` constructor field with `worlds: WorldAssetMap`. Reject every registered `LEVELS` atlas absent from the map. Add:

  ```ts
  private get world(): WorldAssets {
    return this.worlds[this.level.atlas];
  }
  ```

  Keep both `drawWorld` and `drawWorldForeground` using that getter. Update test call sites with a shared fixture shaped as `{ plains: assets, timbers: assets }`.

- [x] **Step 5: Wire adventure startup to preload registered atlases.**

  In `src/main.ts`, load Henry and the map together:

  ```ts
  const atlasIds = LEVELS.map(({ atlas }) => atlas);
  void Promise.all([loadHenry(), loadWorldAssetMap(atlasIds)]).then(([henry, worlds]) => {
    scenes.change(new AdventureScene(henry, worlds, audio, DEFAULT_LEVEL));
  });
  ```

  Leave gameplay/world previews on their existing single-level loaders.

- [x] **Step 6: Run focused tests and verify GREEN.**

  Run: `npx vitest run tests/world-assets.test.ts tests/screens.test.ts tests/renderer.test.ts tests/treetop-timbers.test.ts`

  Expected: all focused tests pass with no missing-atlas fallback.

- [x] **Step 7: Commit the runtime integration.**

  ```sh
  git add src tests
  git commit -m "feat: switch world art with selected level"
  ```

### Task 3: Cover the browser route and document the biome

**Files:**
- Modify: `tests/browser.spec.ts`
- Modify: `docs/REQUIREMENTS.md`
- Modify: `README.md`
- Create: `docs/evidence/issue-32/README.md`
- Create: `docs/evidence/issue-32/treetop-timbers.png`

**Interfaces:**
- Consumes: the third picker entry and startup atlas preload from Tasks 1–2.
- Produces: browser evidence that the timber atlas loads and is rendered for the selected route.

- [x] **Step 1: Write the browser assertion.**

  Instrument `CanvasRenderingContext2D.drawImage`, open `/?scene=adventure&debug=1`, press ArrowRight twice with input-edge releases, start with Space, and assert at least one recorded image source ends in `/assets/timbers/environment.png`.

- [x] **Step 2: Run the Chromium test and confirm the integration behavior.**

  Run: `npx playwright test tests/browser.spec.ts --project=chromium --grep "Treetop Timbers"`

  Expected: PASS only after Task 2 supplies and selects the timber atlas; a reverted atlas lookup makes the assertion fail.

- [x] **Step 3: Update current product documentation.**

  Change `docs/REQUIREMENTS.md` to name Plains, Quarry Run, and Treetop Timbers and replace the blanket new-biome exclusion with the shipped timber biome. Update the README level list and controls without changing the no-persistence promise.

- [x] **Step 4: Capture visual evidence.**

  Use the Chromium test to save the active canvas after Treetop Timbers begins as `docs/evidence/issue-32/treetop-timbers.png`. Record the route, browser, command, and visible expected elements in the adjacent README.

- [x] **Step 5: Run documentation and browser checks, then commit.**

  ```sh
  npx playwright test tests/browser.spec.ts --project=chromium --grep "Treetop Timbers"
  git diff --check
  git add tests/browser.spec.ts docs README.md
  git commit -m "docs: record Treetop Timbers verification"
  ```

### Task 4: Verify, review, and publish issue 32

**Files:**
- Modify only files required by validated reviewer findings.
- Create PR body in `/tmp/issue-32-pr.md`.

**Interfaces:**
- Consumes: all commits after base `75fe680` plus the design commit.
- Produces: a reviewed GitHub pull request against `main` with `Closes #32`.

- [x] **Step 1: Run complete fresh verification.**

  ```sh
  npm test
  npm run typecheck
  npm run build
  npm run test:browser
  git diff --check 75fe680..HEAD
  ```

  Expected: every command exits zero; record exact suite counts and browser results.

- [x] **Step 2: Dispatch the requested read-only reviewer subagent.**

  Give it the issue requirements, approved spec, base `75fe680`, current head, and the required read-only reviewer template. Require categorized findings and a merge-readiness verdict.

- [x] **Step 3: Address review findings.**

  Fix every Critical and Important finding with a failing regression test first. Re-run the relevant focused command, then the full verification commands from Step 1. Commit validated fixes with an imperative subject.

- [x] **Step 4: Push and create the pull request.**

  Push branch `32-treetop-timbers`. Create a PR against `main` whose body summarizes gameplay, atlas/runtime architecture, requirement change, visual evidence, exact validation results, known limitations, and `Closes #32`.

- [x] **Step 5: Read back the PR and report it.**

  Run `gh pr view --json number,title,url,baseRefName,headRefName,body` and verify the base, head, closing keyword, and validation details before reporting the URL.
