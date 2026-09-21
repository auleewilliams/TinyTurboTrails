# Foundation payload, renderer and build hygiene — milestone 6

Scope: issues #123–#129. The implementation is based on `c2ab241`; this record
describes the working-tree result and must be updated with the final commit and
CI URL before merge.

## Startup payload (#123, #124)

`npm run measure:startup` loads the production build at `/?scene=adventure`,
records each response body once and waits for the adventure UI to settle. The
result is [startup-payload.json](startup-payload.json): **2.14 MiB across 24
responses**, below the 2.5 MiB acceptance ceiling and down from the issue's
8.21 MiB baseline. The request set does not contain
`assets/henry/reference.png`; `/?scene=art` still requires and renders it.

Untouched generated sources, prompts and provenance remain under
`assets/source/`. `scripts/prepare-trail-art.mjs` reproducibly emits the smaller
runtime title, landmarks, Plains scenery and trail backdrops. The two panorama
derivatives use WebP at quality 0.86; transparent sprites and the other sheets
remain PNG. The overworld enables high-quality smoothing only while reducing a
cached 426 × 240 trail preview to 126 × 71, then restores the gameplay setting.

## Failure policy and renderer contracts (#125–#127)

Shared terrain materials and Quarry/Timbers backdrops are optional decoration.
The screenshot [plains-no-decorative-sheets.png](after/plains-no-decorative-sheets.png)
shows the playable solid-theme fallback; browser coverage completes the full
Plains route with both requests aborted. Required Henry, atlas and declared
scenery failures still use Retry.

Backdrop row/support selection and parallax fallback now come from `LevelTheme`,
with row validation and no trail-ID comparisons in either renderer module.
The material-cell map is exhaustive over the theme material union. The dead
`texturedTerrain` flag and unused non-Timbers `terrainTops` metadata are removed;
Timbers retains the same wood-atlas overlay by material identity.

The `after/` directory contains six full-route samples per trail plus native,
2× and 320-pixel map captures and each selected destination. The corresponding
pre-change reference is `docs/evidence/trail-milestone/after/`. Adult inspection
found the same geometry, crop/pan range, draw order and readable landmark/sprite
silhouettes after resampling.

## Performance

[render-performance.json](render-performance.json) repeats the repository's
600-frame full-route/readback audit. Compared with the previous trail-milestone
p95 values, every trail improved on this host:

| Trail | Previous p95 ms | Milestone 6 p95 ms |
| --- | ---: | ---: |
| Plains | 2.7 | 2.2 |
| Quarry Run | 2.3 | 2.1 |
| Treetop Timbers | 2.8 | 2.1 |
| Sunset Site | 2.3 | 1.9 |
| Frost Ridge | 1.8 | 1.7 |
| Sandy Cove | 1.8 | 1.6 |

## Node/container alignment (#128)

`package.json` requires Node 22.12 or newer, CI selects Node 22 and the Docker
build stage now uses `node:22-alpine`. Dependabot ignores Node image major bumps
so changing that major requires coordinated review of all three declarations.
This host has Node 22.22.1 but no Docker-compatible CLI; the pull-request job is
therefore the authoritative container build and `npm run test:deployment` gate.

## Validation

| Check | Result |
| --- | --- |
| `npm test` | 537 passed in 32 files |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run test:ci` | 8 passed |
| Browser matrix | 184 passed, one expected Firefox native-audio skip, one unrelated WebKit music timing sample failed; the exact WebKit test passed immediately in isolation |
| Focused changed-path browser checks | All passed in Chromium; all changed milestone cases also passed in Firefox and WebKit in the full matrix |
| Docker build / deployment smoke | Pending pull-request CI; no Docker CLI on this host |

The full browser run had no failure in payload, loading fallback, renderer,
resampling, map, route or input behavior. The WebKit music-preview failure read
a previous bass pitch; its unchanged test passed on the immediate serial rerun
in 4.2 seconds. No retry setting was added.

## Tracker hygiene (#129)

#77 was verified and closed with delivery evidence. #85 and #94 had already
been closed while this work was in progress. #94 now explicitly records its one
unperformed Henry-led navigation check, split into #137 using the existing
parent worksheet. #129 is closed; no automated result is represented as child
usability acceptance.
