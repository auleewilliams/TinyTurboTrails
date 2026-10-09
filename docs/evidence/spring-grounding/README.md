# Spring grounding — issue #155

All 39 springs were audited across the six registered playable trails.

| Trail | Springs | Finding and correction |
| --- | ---: | --- |
| Plains | 6 | Coordinates were 12px above terrain; derive Y from `surfaceY`. Add a visible-base anchor at (24,44), removing another 4px of padding. Move spring-003 one pixel right so its full silhouette is on the flat. |
| Quarry Run | 9 | Uses the Plains atlas; inherits the corrected 4px anchor gap. Terrain-derived coordinates were already correct. |
| Treetop Timbers | 7 | Add the missing spring anchor at (24,44), removing a 4px gap. |
| Sunset Site | 5 | Coordinates and visible-base anchor were already correct. |
| Frost Ridge | 6 | Coordinates and visible-base anchor were already correct. |
| Sandy Cove | 6 | Visible base ends on row 38; change spring anchor Y from 44 to 39. Ignore alpha below 128, matching the atlas processor's visibility threshold. |

No bitmap artwork changed. Launch velocity, interaction dispatch and feedback
logic are unchanged. Level validation now rejects spring coordinates above or
below their terrain contact point.

## Visual evidence

Each gallery contains every spring, rendered by `AdventureScene` with the real
assets and production renderer in controlled native 426×240 views:

- [Plains](plains.png)
- [Quarry Run](quarry.png)
- [Treetop Timbers](timbers.png)
- [Sunset Site](sunset.png)
- [Frost Ridge](frost.png)
- [Sandy Cove](cove.png)
- [Actual gameplay animation states](animation-states.png): one representative
  spring per trail, at rest, compressed to 0.6 and released to 1.25. The existing
  `Feedback` object drives `AdventureScene.render`; camera and player stay fixed.

Reproduce with `npm run dev -- --port 4175 --strictPort`, then
`node scripts/capture-springs.mjs`. Reduced motion is disabled for the animation
capture. All seven galleries were visually inspected by the implementer and an
independent sub-agent; no blocking findings were reported.

## Regression coverage

- Unit tests plant all springs exactly on terrain and reject floating/buried
  coordinates, including NaN. Interaction tests exercise every spring through
  `stepEntities`, verifying launch velocity, preserved horizontal momentum,
  single launch during contact and rearming after separation.
- The browser regression reads actual atlas alpha, checks support across each
  entire spring silhouette, and measures rendered visible bases at scales 1,
  0.6 and 1.25. It exercises `drawAsset` with the renderer's transform pattern;
  the gameplay galleries cover actual `drawWorld` integration and feedback.

## Validation

Exact lockfile dependencies were installed with `npm ci` after releasing two
old Vite preview processes holding a native dependency open on Windows.

- `npm test`: 599 tests passed in 33 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test:ci`: 8 tests passed.
- `npm run test:browser -- --workers 3`: Chromium/WebKit produced 157 passes
  and one existing skip. All 79 Firefox cases failed before page creation
  because its executable could not launch (`spawn UNKNOWN`).

The initial sandboxed contact check passed Chromium and WebKit. Running the
complete suite outside the sandbox and reinstalling the Firefox binary did not
resolve the Windows launch failure. Linux CI must pass the complete suite,
including Firefox, before merge; the final CI result is recorded in the PR.
