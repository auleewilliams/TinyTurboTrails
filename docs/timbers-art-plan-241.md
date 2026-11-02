# Treetop Timbers artwork plan

Draft for owner approval under [#241](https://github.com/auleewilliams/TinyTurboTrails/issues/241) and [#235](https://github.com/auleewilliams/TinyTurboTrails/issues/235). Refresh the ground and all 44 fixed branches with organic illustrated wood. Keep every support and pickup coordinate unchanged. Remove the 11 specifically inventoried unsupported decorative pine/log-stack draws. Proposed generation limit: five calls, with three initial roles and two restricted reserves.

This approves nothing by itself. The request to proceed covered this planning packet. Production edits and image generation await the bounded-plan/budget decision required by #241. After that, the owner approves one integrated representative preview before the remaining rollout; completed-trail acceptance remains separate.

## Baseline and evidence

Inspected checkout and remote main: `885b6c16d5397e061f1ccb40ca326856bc77db88`. Pilot [PR236](https://github.com/auleewilliams/TinyTurboTrails/pull/236) is merged at that revision. Open issue/PR checks found no Timbers implementation. Open [PR245](https://github.com/auleewilliams/TinyTurboTrails/pull/245) implements Plains and changes shared loader/render/fixture code. Recheck remote main and all open/draft PRs before production; incorporate merged changes and refresh this inventory where affected. The suggested trail order is not a prerequisite to unrelated work.

Evidence is under [evidence/issue-241](evidence/issue-241/):

- [inventory.json](evidence/issue-241/inventory.json): every support, unchanged motion endpoints, current/proposed positions, associated entities, nearby lower supports, per-X depth ceilings, Henry alpha bounds and decorative base footprints.
- [baseline/report.json](evidence/issue-241/baseline/report.json): Chromium version, source/build hashes, actual response-body hashes, route histories, capture hashes and measured viewport/CSS/canvas sizes.
- Native and CSS PNGs in `baseline/`: roots, middle, under-spring, reward landing, clear catch, repeat reward, finish, middle return edge, return720, return780 and returned roots. Additional native images capture an ordinary spring flight.
- [capture-baseline.mjs](evidence/issue-241/capture-baseline.mjs) and [measure-inventory.mjs](evidence/issue-241/measure-inventory.mjs) reproduce the planning observations. They are evidence utilities, not runtime dependencies.

The baseline uses the built production game and the existing DOM-keyboard pilot. It does not reposition Henry, set the camera, or mutate the scene. The pilot clock is frozen briefly while paired settled-state images are taken. These are automated input captures, not a physical-keyboard or owner playtest. Native canvas: 426×240. Viewports: 426×300 and 320×240; CSS canvas widths: 426 and 320. The report records actual fractional CSS heights; screenshot raster rounding is distinct from logical resolution.

Canonical capture results: 20 completed route groups, 46 hash-checked PNGs, no page JavaScript errors, and both return journeys reaching letter bag4/4. Each viewport has62 successful asset response bodies matching the build. It also retains40 response-body read errors during the run; every affected URL has a successful matching body elsewhere in that same browser context. The recorder did not retain status on those failed reads, so their exact response/cache status is unknown and repeat-delivery provenance is incomplete. This is sufficient to inspect the unchanged baseline, not a claim that the production rollout's stricter response-chain gate has passed. [verification.json](evidence/issue-241/verification.json) separates these counts.

The shared T3 browser could not start because the host blocks its sandbox; Playwright Chromium supplied the captures. A first Node attempt failed before capture because this Node build lacks built-in TypeScript stripping; `node-typescript-attempt.log` retains it. Vite's existing transform loads the unchanged pilot instead. The initial completed capture run is retained in `baseline-initial/`: its `return-720` filename actually depicts the middle edge at y660, and `return-780` depicts return720. Its status/history remain unchanged. The canonical `baseline/` run corrects the stage labels and asserts captured feet against unique authored supports.

## Findings and material direction

The current branches are code-drawn tapered polygons with shared wood material, repeated grain marks and rectangular bright tops. Current maximum underside depth is 16px for ordinary branches and 22px for the four wide boughs. Ground uses construction-like timber atlas tiles, a shared wood fill and a code-drawn edge. The original Timbers atlas is not a suitable finished organic branch family; Cove's approved stone shapes are a style/provenance reference, not wood assets to recolour. Preserve all existing shared and Cove image bytes.

Use warm bark, broad readable grain, a continuous walking top and naturally tapered whole ends. Repeat designed internal wood modules at one texture scale. Do not enlarge a short branch across 580px, crop defining ends, key away light colours, paint transparency, cut pickup notches or squeeze an oversized silhouette to fit. The central trunk and six existing scenic connecting limbs remain behind the standing surfaces and retain their current code/palette; their visual contribution must be checked in the preview, without expanding this into a background campaign.

All relevant Henry idle/run/jump/fall source frames were decoded. Visible height above feet reaches 40px; the conservative half-width across either facing is 16px. The collision body is only 18×34 and is insufficient for artwork fit planning.

Most nearby lower supports are 60px below an upper top. An 18px underside leaves a conservative 2px standing gap: `60 - 40 - 18`. This is a proposed source-design envelope, not a declaration that a thin-looking image is acceptable. Allow a naturally continuous body up to 28px only in the exact lateral intervals without a conflicting lower standing corridor, listed per support in `maximumDepthIntervals`. Ceilings are not a stepped outline or a clipping mask: source art must fit beneath them with coherent transitions. End treatments stay inside the existing supported X range; protruding bright tops may not suggest extra footing. If the representative result still looks too slight, stop that family and agree a bounded layout exception instead of spending reserves on progressively thinner artwork.

The spring reward at x40–200/y510 overlaps the catch at x130–280/y540 by 70px. A clear standing underpass is impossible in that overlap even with zero branch depth. The actual retry route rests at approximately x230, outside the reward end; the screenshots show Henry clear of it. Keep this existing one-way crossing, cap the proposed reward body at 18px, keep Henry in front, and verify the flight/left return as intentional crossings. Do not invent a collision wall or require universal zero silhouette overlap while passing through a platform.

## Target decisions

All platform IDs below have the `timber-` prefix. Every from/to coordinate is identical and stays unchanged; each authored `seconds` value is 1 and creates no motion. No moving platforms, slopes, crumbling platforms or extra cliff transitions exist in this trail.

All 44 current branches use the polygon/rectangle path in `drawPlatforms` with `public/assets/trails/materials.png` wood cell2. Ground additionally uses `public/assets/timbers/environment.png` via its manifest's terrain-left/flat/right entries. The pine/log draws use that same atlas's tree/bush entries. Provenance remains in `assets/source/timbers/PROVENANCE.md` and `assets/source/trails/PROVENANCE.md`. Proposed new source destination: `assets/source/timbers/illustrated-v1/`; prepared required kit: `public/assets/timbers/terrain-kit-v1/`; renderer: `src/world/timbers-terrain.ts`. These paths are proposals, not existing generated assets. Use a manifest mapping every unique support ID to its prepared whole assembled bitmap and exact top/width so missing targets cannot silently fall back.

Ground target `ground-0` is an inventory key for the sole surface: x40–820, top1080, width780, visible depth100 to world bottom1180. Replace the flat lip, both boundary ends and continuous fill with an original root-and-bark ground kit; preserve the exact support contour and landing-band overlays. Keep gem `timber-gem-001` at (260,1062), letter `timbers-letter-t` at x220/supportY1080, and start (100,1080).

For the branch table, A means ordinary modular wood (40 targets), B means broad modular wood (four targets). Each target uses the source envelope described above and in the JSON. Lower-neighbour numbers are top separations, not measured empty headroom. Their X ranges include Henry's conservative silhouette margin, so some are relevant only near an edge. Entity shorthand: `gNNN` = `timber-gem-NNN`; `cp-*` = `timber-checkpoint-*`; `special-*` and `letter-*` have the `timbers-` prefix. A pickup can map to overlapping coplanar supports; repeated associations do not create duplicate entities.

| Support | X extent | Top Y | Width | Art | Nearby lower supports and separation | Associated entities |
| --- | --- | --- | --- | --- | --- | --- |
| low-1 | 240–440 | 1020 | 200 | A | ground-0:60 | g002, g003 |
| low-2 | 360–560 | 960 | 200 | A | low-1:60, return-1020:60 | g004, g005 |
| star-1 | 60–230 | 960 | 170 | A | low-1:60 | g006, special-1 |
| fork | 170–620 | 900 | 450 | B | low-2:60, star-1:60, return-960:60 | g007, g008, g009, cp-fork, letter-r |
| fork-left-1 | 180–400 | 840 | 220 | A | fork:60 | g010, g011 |
| fork-right-1 | 470–640 | 840 | 170 | A | fork:60 | g012 |
| fork-left-2 | 260–470 | 780 | 210 | A | fork-left-1:60, fork-right-1:60, middle-left-catch-3:60 | g013, g014 |
| fork-right-2 | 420–620 | 780 | 200 | A | fork-right-1:60, return-840:60 | g014, g015 |
| shared | 360–540 | 720 | 180 | A | fork-left-2:60, fork-right-2:60, return-780:60 | g016, g017 |
| middle | 40–620 | 660 | 580 | B | shared:60, return-720:60, middle-left-catch:60 | g018, g019, g020, cp-middle |
| spring | 40–190 | 600 | 150 | A | middle:60 | g023, timber-spring-1 |
| approach-1 | 230–450 | 600 | 220 | A | middle:60 | g021, g022 |
| approach-2 | 320–560 | 540 | 240 | A | approach-1:60 | g025, g026 |
| spring-reward | 40–200 | 510 | 160 | A | spring-catch:30 | g024, special-2 |
| spring-catch | 130–280 | 540 | 150 | A | spring:60, approach-1:60 | — |
| approach-3 | 240–460 | 480 | 220 | A | approach-2:60, spring-catch:60 | g027, g028 |
| canopy | 180–620 | 420 | 440 | B | approach-3:60, return-480:60 | g029, g030, cp-canopy, letter-e1 |
| upper-1 | 330–550 | 360 | 220 | A | canopy:60 | g031 |
| star-3-catch | 40–250 | 360 | 210 | A | canopy:60 | — |
| upper-2 | 230–450 | 300 | 220 | A | upper-1:60, star-3-catch:60 | g032 |
| star-3 | 60–200 | 300 | 140 | A | star-3-catch:60 | special-3 |
| upper-3 | 350–530 | 240 | 180 | A | upper-2:60, return-300:60 | g033 |
| lookout | 250–590 | 180 | 340 | B | upper-3:60, return-240:60 | letter-e2, finish |
| return-240 | 570–740 | 240 | 170 | A | return-300:60, outer-catch-300:60 | — |
| return-300 | 520–660 | 300 | 140 | A | upper-1:60, return-360:60 | — |
| return-360 | 580–740 | 360 | 160 | A | canopy:60, outer-catch-420:60 | — |
| return-480 | 580–740 | 480 | 160 | A | return-540:60, outer-catch-540:60 | — |
| return-540 | 520–660 | 540 | 140 | A | return-600:60 | — |
| return-600 | 580–740 | 600 | 160 | A | middle:60, outer-catch-660:60 | — |
| return-720 | 580–740 | 720 | 160 | A | fork-right-2:60, return-780:60, outer-catch-780:60 | — |
| return-780 | 520–660 | 780 | 140 | A | fork-right-1:60, return-840:60 | g015 |
| return-840 | 580–740 | 840 | 160 | A | fork:60, outer-catch-900:60 | — |
| return-960 | 620–740 | 960 | 120 | A | return-1020:60, outer-catch-1020:60 | — |
| return-1020 | 520–660 | 1020 | 140 | A | ground-0:60 | — |
| outer-catch-300 | 700–820 | 300 | 120 | A | return-360:60 | — |
| outer-catch-420 | 700–820 | 420 | 120 | A | return-480:60 | — |
| outer-catch-540 | 700–820 | 540 | 120 | A | return-600:60 | — |
| outer-catch-660 | 700–820 | 660 | 120 | A | return-720:60 | — |
| outer-catch-780 | 700–820 | 780 | 120 | A | return-840:60 | — |
| outer-catch-900 | 700–820 | 900 | 120 | A | return-960:60 | — |
| outer-catch-1020 | 700–820 | 1020 | 120 | A | ground-0:60 | — |
| middle-left-catch | 40–290 | 720 | 250 | A | fork-left-2:60, middle-left-catch-2:60 | — |
| middle-left-catch-2 | 40–250 | 780 | 210 | A | fork-left-1:60, middle-left-catch-3:60 | — |
| middle-left-catch-3 | 40–250 | 840 | 210 | A | fork:60 | g010 |

Preserve all 33 gem IDs/positions, three specials, four TREE letters, the spring, three checkpoints, finish and retrace records. `inventory.json` lists all exact old/proposed positions; proposed positions equal old positions. Preserve counts, kinds, rewards, bounds, route intent, camera, physics, controls, finish re-arm (`belowY240`, `leftX300`) and existing safe catches. No support/pickup exception is proposed.

## Bounded scenery cleanup

The following 11 draws are hard-coded in `drawTimberTrunk`, not authored gameplay entities. Their visible base footprints were measured from atlas rows40–43 at alpha≥128, using the actual manifest anchor and scale. None has a real support covering its substantial base at its current Y. Some also extend beyond the play bounds; large log stacks overlap the visual route. The `bush` slot is visibly a stack of cut logs.

Proposed action for each row: remove that decorative draw, without changing its source atlas or replacing it with generated scenery. These are the only scenery removals proposed. The panorama forest, central trunk, six connecting limbs and ambient leaves remain. Removal requires explicit approval as part of this plan; it is not inferred permission to remove other decorations.

| Inventory key in drawTimberTrunk | Asset | Old X,Y | Old scale | Proposed |
| --- | --- | --- | --- | --- |
| tree:0 | pine | 115,265 | 2.4 | remove draw |
| tree:1 | pine | 650,320 | 2.6 | remove draw |
| tree:2 | pine | 130,390 | 2.2 | remove draw |
| tree:3 | pine | 670,460 | 2.3 | remove draw |
| tree:4 | pine | 95,565 | 1.8 | remove draw |
| bush:0 | log stack | 40,580 | 2.2 | remove draw |
| bush:1 | log stack | 770,620 | 2.2 | remove draw |
| bush:2 | log stack | 60,740 | 2.2 | remove draw |
| bush:3 | log stack | 785,795 | 2.2 | remove draw |
| bush:4 | log stack | 70,930 | 2.2 | remove draw |
| bush:5 | log stack | 780,1030 | 2.2 | remove draw |

## Source roles and generation budget

Proposed hard cap: **five dispatched generation calls total**, including failed/rejected outputs. No calls have been made. The cap counts calls, not an assumed currency price; inspect the configured native workflow and its actual metadata when production is authorized.

| Allocation | Calls | Intended output and fit |
| --- | --- | --- |
| A Ordinary branch source | 1 | Designed whole ends and repeatable centres for widths120–250, nominal18px body, bounded natural taper/bulk; separate source pieces at consistent scale. Covers 40 supports. |
| B Broad bough source | 1 | Matching long-body modules and whole ends for widths340/440/450/580, with the per-X18–28px envelopes. Covers fork/middle/canopy/lookout. |
| C Root ground source | 1 | Flat rooted wood lip, left/right boundary pieces and repeatable bark/root fill for the780×100 ground area. No slope sheet needed. |
| Restricted reserve | 2 | At most one refinement per affected role, only before that role is accepted, within the same approved fit/material/geometry. |

Dispatch A first and inspect actual source scale/alpha before commissioning B; use A's acceptable source as a reference if supported. Check whether A legitimately supplies B's whole ends/centres before using B's allocation. A skipped call stays unused. C can share palette references but may not reuse Cove's stone/sand pixels. Do not allocate a separate image per support.

Reserve calls may correct a recorded output failure such as nontransparent background, unusable modular joins, wrong texture scale, or failure to match the agreed wood direction. Preserve the failed source and executed request first. No automatic retry loop; no more than one reserve call for one role. An unresolved geometry/readability conflict or rejected integrated direction returns to the owner, rather than consuming reserves. Reallocation across roles, additional roles, more than five calls, and edits to an accepted component require a new narrow decision. Unused capacity is not permission for extra variants.

Use the configured native image workflow; keep original files and actual provider/model/request/reference metadata without inventing fields the tool did not return. Record source dimensions, decoded RGBA/alpha, uniform scaling, exact crops of designed modules, preparation commands and output hashes. Preserve defining ends and whole silhouettes. Use deterministic local preparation and exact PNG/RGBA/copy/determinism checks.

## Representative preview and remaining rollout

One integrated Timbers preview revision should cover two short views using the same approved family: the roots establish C, then the middle/spring section and adjacent right return establish A/B. Include Henry standing on the middle, walking beneath the spring, spring ascent/reward landing, clear-catch rest/retry, middle edge before descent, return720 and return780. Show native426×240 and actual320px CSS gameplay with the existing HUD. Keep concepts and any renderer fixtures explicitly labelled apart from real input captures.

Preview target subset: `ground-0`, `timber-middle`, `timber-spring`, `timber-spring-reward`, `timber-spring-catch`, `timber-approach-1`, `timber-approach-2`, `timber-shared`, `timber-return-600`, `timber-return-720`, `timber-return-780`, and `timber-outer-catch-660/780`. Capture surrounding legacy boundaries honestly during the bounded preview. Apply the approved 11-draw cleanup in that candidate so the owner sees its whole effect, including the roots/map frame.

Record preview acceptance against exact source and assets. Then extend the accepted components to every remaining table row, with a target ledger moving from planned to implemented to verified. No target is implemented yet. Keep accepted components frozen; ask only about new out-of-plan conflicts. Final whole-trail owner playthrough follows the completed rollout and automated gates.

## Integration and verification

Runtime consumers to update together:

The broader source/test search is retained in [consumers.txt](evidence/issue-241/consumers.txt); the following are the integration points that need deliberate review, not a mandate to edit every matching file.

- `src/world/renderer.ts`: `drawWorld`, `drawTerrainTiles`, `drawPlatforms`, `drawTimberTrunk`; retain paint order before pickups/Henry. Add a Timbers-only renderer rather than changing shared wood pixels for other trails.
- `src/world/assets.ts` and `public/assets/timbers/manifest.json`: required Timbers kit validation/loading and ordinary error/Retry. Presently Timbers has only its environment atlas, optional shared material/backdrop, and shared gems/slimes; no terrain kit is declared.
- `src/world/trail-presentation.ts`: bypass the legacy Timbers fill/edge where the new kit takes responsibility; preserve other trails and reconcile PR245's shared edits.
- `src/game/adventure-scene.ts` cached map preview, `src/world/preview-scene.ts`, and `src/game/gameplay-preview.ts`: use the same kit/dependency graph, with the real zero-time supports where already applicable.
- `tests/browser.spec.ts` function-string helpers and map/HUD strip-import fixtures; `tests/hud-owner-layout.spec.ts`; `tests/renderer-fixtures.test.ts`. Preserve missing-symbol guards and real helper imports when introducing a renderer module.
- Existing `tests/renderer.test.ts` assertions for roots/lookout/Star3 tops and partial legacy tiles, plus `tests/world-assets.test.ts`. Update only obsolete art witnesses and retain collision/identity meaning; legacy renderer coverage may still apply to other callers.

Focused native verification must include ascent via both forks, all three special routes, optional spring retry, full return/re-ascent with missing TREE letters, wrong-end outer/local catches, finish re-arm, Pause/reduced motion, map preview, required-resource failure followed by ordinary Retry, and asset joins during fractional camera motion. Use authored unique support IDs for expected planes and exact invariants for all unchanged geometry/pickups. Confirm genuine standing/resting clearance separately from intentional one-way flight crossings. Inspect actual PNGs at both sizes; static envelopes are not substitutes for that inspection.

After a stable rollout candidate: applicable units and scripts, typecheck/build, the full configured Chromium/Firefox/WebKit suite with unchanged timeouts/retries/assertions, source/build/served-body/file-backed evidence, fresh Claude whole-PR review, exact-current-head/base CI and artifact readback. Recheck open/draft PRs before creating a PR. Preserve local failures and conditional skips accurately. Owner whole-trail acceptance, merge and issue closure each need their separate authority.

Planning verification: production build/typecheck passed; canonical capture results and hashes are recorded in the linked report. This packet does not claim a full three-engine regression run or final artwork acceptance. The only repository additions are planning documents and evidence utilities/artifacts; game code and assets remain unchanged.

## Approval decision

Approve the unchanged-coordinate terrain/44-branch plan, the exact 11 decorative removals, and the five-call budget/rules above to authorize production of the bounded integrated preview. No route redesign, other-trail artwork changes, additional scenery generation, rollout beyond the representative preview, commit/push, merge, release or deployment is included in this decision. After preview acceptance, the remaining rollout can be authorized explicitly under the issue's workflow.
