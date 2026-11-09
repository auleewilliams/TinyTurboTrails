# L02 actual-source diagnosis — FAIL retained

No pixels changed and no image/native/game/network action performed. Raw source, current request/key contract/inspector, original failed report and diagnostic PNG/changed-set hashes are identical before and after. Spent **2/10**; the one retry grant is consumed. Terrain/ice and all other reserves remain STOPPED. L01 rejection and existing bounded pilot/style approvals are preserved.

Independent verification confirms RGB equality for **every** raw/diagnostic pixel, all non-key/enclosed-key RGBA byte-exact, and **1,289,061** changed alpha pixels matching both the declared exact changed set and an independently recomputed four-neighbour frozen-predicate border flood. Remaining **284,291** pixels are fully accounted for: six whole connected objects (**284,290** pixels) plus one isolated retained pixel. Both four- and eight-neighbour inventories contain seven components; JSON enumerates every one, no fragments dropped.

The offending border pixel is **(0,940), RGB(240,36,240)**: G36 exceeds G31 by5. It is a one-pixel component at the bottom-left image corner, spatially separate from all six objects; it explains the extra occupied row that defeated the worker's grouping assumption. That assumption is not an owner shape constraint. The pixel remains failure evidence, untouched. Exact border color counts/ranges and complete heuristic near-magenta color histogram are in JSON. Border RGB ranges: R240..253, G2..36, B240..251.

The 3,019 heuristic near-magenta pixels span R192..255, G0..63, B192..255. **3,018 are linked to the six objects**, one is the corner residue. This heuristic does not distinguish deliberate foreground color from blended matte and is not evidence that all such pixels are damaged paint. No removal or classifier widening was tried.

## Whole actual source objects

All linked retained paint is included in each exclusive bbox, with no end/body crop or alpha editing. These are measurements, not extracted production sprites. Six cohesive chunky objects and flatter snow tops retain the liked visual direction. Intended foreground versus boundary-matte meaning remains unresolved. Original requested target association is retained.

| Role | Whole bbox [x0,y0,x1,y1) | Source dimensions | Width-scaled depth / maxD | Source envelope overrun columns | Opaque pixels on global top row |
| --- | --- | --- | --- | --- | --- |
| V1 | [187, 116, 643, 194] | 456×78 | 23.9474 / 18 | 456 | 424/456 |
| V2 | [951, 116, 1547, 194] | 596×78 | 23.5570 / 18 | 596 | 567/596 |
| V3 | [102, 425, 730, 532] | 628×107 | 32.3726 / 28 | 592 | 610/628 |
| V4 | [897, 425, 1597, 532] | 700×107 | 32.1000 / 28 | 597 | 678/700 |
| V5 | [86, 739, 747, 847] | 661×108 | 32.6778 / 28 | 661 | 384/661 |
| V6 | [913, 739, 1582, 847] | 669×108 | 32.2870 / 27 | 669 | 384/669 |

**All six fail their original exact source envelope and full-width flat opaque top requirements.** Top-column variation is9px (V1–4/V6),13px (V5), including integral rounded/sloped ends; none has a full native opaque standing row under the unchanged whole-isotropic transform. This is not only the isolated background issue. The bounded36 pairwise whole-object/approved-target checks produce **no exact envelope-plus-top numeric fit**, even allowing exploratory reassociation; no reassociation is accepted or implemented. JSON retains each target, exact scale, source/native overrun columns and source top/bottom profiles. No canvas/cell/common4x requirement was used as an owner prohibition.

## Source-bound static evidence, distinct from design fit

Pinned retained easy5 actor manifest/atlas and frost gem alpha were verified against input-bindings hashes. Proposed B positions came from retained measurements, without running routes/models. Actual source alpha rectangles were compared at only six finite static witnesses (all idle/run frames and both facings). Same x/y scale, whole bboxes anchored at support x,y; no physical geometry edits. Positive cell counts mean positive source-space alpha rectangle intersections, not native compositor pixels or rendered unreadability.

| Static witness | Minimum actor-column/body-bottom gap | Max intersecting actor alpha cells |
| --- | --- | --- |
| frost-return-1 retained envelope worst full-foot witness | -0.2866 | 2 |
| frost-return-4 retained envelope worst full-foot witness | -2.2000 | 13 |
| frost-return-9 retained envelope worst full-foot witness | -0.7489 | 1 |
| return9 historical left-facing static witness | no horizontal upper-body overlap | 0 |
| return9 left partial-foot diagnostic pose | -10.7746 | 137 |
| ground retained worst static witness | -2.1053 | 12 |

These show that design-envelope overruns are not uniformly physical occlusion: the historical return9 witness has no horizontal alpha overlap, while other bounded full-foot, ground and partial-foot witnesses do intersect actual alpha. The partial-foot center3612 is a static diagnostic pose, not a witnessed input/recovery state. Required standing margins therefore cannot be waived from source appearance alone.

Actual frost-gem alpha also intersects requested-role body art: return1/gem6 **61** cells (minimum below-body gap−4.4123), return4/gem17 **101** (−4.0470), return9/gem26 **109** (−4.2870). Other associations in this bounded check have zero intersecting gem cells; positive gaps and exact associations are in JSON. These are actual source-alpha/anchor comparisons, separate from source envelope failures and required native raster margin checks. Terrain coverage was limited to the retained center517/feet560 ground witness; no new contour or movement sweep.

## Smallest supported next decision

Maintain source FAIL and spending STOP. A separately approved classifier revision could address the corner key residue without another image call, but would not fix the six whole-body/top failures or static actor/gem intersections. Current evidence does not support an envelope exception that preserves the required margins. Parent should resolve the whole-object/top constraints before selecting a further remedy; do not request a background-only third call. No revision, repair, waiver, third call or reserve use is authorized here. Parent owns disposition and owner communication.

Native raster/subpixel readability, ordinary-input resting feasibility, jump/fall, all-standing/all-edge-hang clearance and human ease remain unknown. No source or integrated acceptance is claimed.

Executed diagnosis and static scripts each exit0, with exact command arguments and stdout/stderr/exit files referenced in JSON; the original immutable inspector remains exit2. An initial new-script syntax error exited1 before analysis, then was corrected; no frozen artifact was changed. No synthetic reruns. PNG remains actual1672×941 RGB; provider requested1536×1024medium, returned/reported1672×941medium, modelgpt-image-2-medium, while prompt canvas2048×1152 was a design request.
