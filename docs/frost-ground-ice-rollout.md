# Frost Ridge continuous ground and ice rollout — 2026-11-08

The owner directed: “Great, keep going with the rest on the trail.” The separately retained owner-direction receipt authorizes the remaining ground and ice using the approved terrain440 direct and ice8/mirror16 sources. It does not report a device/SHA-specific slime playtest or final visual acceptance. The dated `frost-ground-ice-pilot.md` remains an immutable historical record.

The current renderer covers the continuous half-open [0,5600) trail: 35 production surfaces and 34 internal joins. The two accepted pilots covered 880 columns; this rollout adds the remaining 4,720. All 5,600 columns receive terrain backing through world Y680. Physical ice remains exactly [160,360), [1550,2350), [3450,3650): 1,200 columns across six production surface records. The old pilots included 490 of these ice columns. No moving supports exist or are introduced.

Terrain samples worldColumn modulo 440 directly from its whole 440px source, beginning at source row zero at the conservative contour-column origin, without vertical repeat. Ice retains its whole eight rows and world-space mirrored sixteen-column cadence, clipped to the unchanged physical slopes. The accepted pilot output regions retain their original source phase. The legacy material, edge and grip layers are excluded over every illustrated column, including the first slide and start floor. One 5600×440 cached ribbon replaces the two pilot ribbons; its raw RGBA allocation is 9,856,000 bytes.

All paid/prepared/public PNGs, manifests, old seals and dated approvals remain byte-identical. The full `src/world/frost-ridge.ts`, ten ledges including return10 X3416, three slime patrols, all rewards/checkpoints/spring/finish/retrace, other trails, physics, inputs, camera and dependencies remain at 77ae8532ecf9b5d946daf4e781a10dd8d91b32f4. Spending remains 4/10 with all six reserves held.

The new `ground-rollout-v1/presentation-delta.json` seals exact presentation and test changes and projects only those complete bytes to 77 before the existing pilot/ledge/slime preservation chain. Old hashes are not refreshed. Corruptions and unrelated gameplay edits continue to reach the historical guards unchanged.

Verification uses the actual production renderer, source-column sampler, ribbon/cache and ordinary loader Retry paths with shipped PNG texels. It includes every terrain column and world-bottom backing, every physical ice column and slope-band polygon, all joins and half-open endpoints, fractional camera offsets, cache invalidation and all three serialized renderer fixtures. The two original pilot helper executions are compared byte-for-byte against the corresponding output regions of the larger ribbon, independently of canvas width. These are software raster/fixture checks, not browser compositor or human gameplay evidence.

At implementation checkpoint58, the complete selected safe 15-file family passes 199/199 cases; this is not a full-suite result. The fixture-only correction in `tests/slime-squash-scenes.test.ts` uses a legal 12px rightward stomp on the original first Frost slime, clearing nearby gem1460 while still squashing the actual target. Every configured level and both AdventureScene and GameplayPreviewScene consumers retain the exact squash-only audio, no-reward, no-damage and feedback expectations, plus the bounded 75-frame delayed check. Explicit per-frame checks verify no active collectible contact. A separate centered-stomp positive case requires exact squash-plus-gem audio and the genuine gem1460 reward in both scenes. No production, entity, gem or physics code changed.

The initial centered-stomp failure and its isolated exact77 reproduction remain historical evidence, alongside all prior failed/intermediate commands and source pins; they are not current failing results. All five held tests remain UNRUN: `tests/sprite-processing.test.ts`, `tests/finish-grounding.test.ts`, `scripts/prepare-timbers-art.test.mjs`, `scripts/prepare-timbers-tree.test.mjs` and `tests/specials.test.ts`. No browser/server/listener/native checks, installs, commits or publication ran. The earlier native51 ACTUAL_ATLAS_PIXELS FAIL remains unresolved evidence.

Implementation-checkpoint limits: a separately authorized bounded native visual pass (first slide, start floor, all joins/slopes and original pilots at existing viewports), owner visual acknowledgment and coordinator publication remain pending. Independent code review does not certify native visuals, full-suite/CI results, owner acceptance or publication.

| Target | Bounds | Y contour | Material | Original pilot | Remaining integrated | Check |
|---|---|---|---|---|---|---|
| surfaces[0] | [0,160) | 500→500 | snow | — | [0,160) | software pass; native pending |
| surfaces[1] | [160,360) | 500→560 | ice | — | [160,360) | software pass; native pending |
| surfaces[2] | [360,700) | 560→560 | snow | — | [360,700) | software pass; native pending |
| surfaces[3] | [700,780) | 560→500 | snow | — | [700,780) | software pass; native pending |
| surfaces[4] | [780,880) | 500→500 | snow | — | [780,880) | software pass; native pending |
| surfaces[5] | [880,960) | 500→440 | snow | — | [880,960) | software pass; native pending |
| surfaces[6] | [960,1060) | 440→440 | snow | — | [960,1060) | software pass; native pending |
| surfaces[7] | [1060,1140) | 440→380 | snow | — | [1060,1140) | software pass; native pending |
| surfaces[8] | [1140,1400) | 380→380 | snow | — | [1140,1400) | software pass; native pending |
| surfaces[9] | [1400,1550) | 380→380 | snow | — | [1400,1550) | software pass; native pending |
| surfaces[10] | [1550,1750) | 380→450 | ice | — | [1550,1750) | software pass; native pending |
| surfaces[11] | [1750,1970) | 450→520 | ice | — | [1750,1970) | software pass; native pending |
| surfaces[12] | [1970,2190) | 520→560 | ice | [2060,2190) | [1970,2060) | software pass; native pending |
| surfaces[13] | [2190,2350) | 560→560 | ice | [2190,2350) | — | software pass; native pending |
| surfaces[14] | [2350,2500) | 560→560 | snow | [2350,2490) | [2490,2500) | software pass; native pending |
| surfaces[15] | [2500,2600) | 560→540 | snow | — | [2500,2600) | software pass; native pending |
| surfaces[16] | [2600,2800) | 540→540 | snow | — | [2600,2800) | software pass; native pending |
| surfaces[17] | [2800,3000) | 540→540 | snow | — | [2800,3000) | software pass; native pending |
| surfaces[18] | [3000,3080) | 540→492 | snow | — | [3000,3080) | software pass; native pending |
| surfaces[19] | [3080,3220) | 492→492 | snow | — | [3080,3220) | software pass; native pending |
| surfaces[20] | [3220,3300) | 492→444 | snow | — | [3220,3300) | software pass; native pending |
| surfaces[21] | [3300,3450) | 444→444 | snow | [3380,3450) | [3300,3380) | software pass; native pending |
| surfaces[22] | [3450,3650) | 444→480 | ice | [3450,3650) | — | software pass; native pending |
| surfaces[23] | [3650,4200) | 480→480 | snow | [3650,3830) | [3830,4200) | software pass; native pending |
| surfaces[24] | [4200,4380) | 480→480 | snow | — | [4200,4380) | software pass; native pending |
| surfaces[25] | [4380,4460) | 480→432 | snow | — | [4380,4460) | software pass; native pending |
| surfaces[26] | [4460,4580) | 432→432 | snow | — | [4460,4580) | software pass; native pending |
| surfaces[27] | [4580,4660) | 432→384 | snow | — | [4580,4660) | software pass; native pending |
| surfaces[28] | [4660,4780) | 384→384 | snow | — | [4660,4780) | software pass; native pending |
| surfaces[29] | [4780,4860) | 384→336 | snow | — | [4780,4860) | software pass; native pending |
| surfaces[30] | [4860,4980) | 336→336 | snow | — | [4860,4980) | software pass; native pending |
| surfaces[31] | [4980,5060) | 336→288 | snow | — | [4980,5060) | software pass; native pending |
| surfaces[32] | [5060,5180) | 288→288 | snow | — | [5060,5180) | software pass; native pending |
| surfaces[33] | [5180,5260) | 288→240 | snow | — | [5180,5260) | software pass; native pending |
| surfaces[34] | [5260,5600) | 240→240 | snow | — | [5260,5600) | software pass; native pending |
