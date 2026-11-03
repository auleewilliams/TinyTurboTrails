# Timbers connected tree source provenance

The owner added the central trunk and six connecting limbs to the same #241 work, then explicitly approved a separate two-call budget while preserving the original unused allocations. [Authorization](authorization-and-budget.json) and [measured addition](../../../../docs/timbers-tree-addendum-241.md) retain both decisions. Two tree calls are spent; combined with the three earlier ground/branch calls, five of the combined seven are spent. The original B call and A refinement remain unused and retain their original restrictions. No further tree refinement is authorized.

Both calls used the built-in `image_gen.imagegen` tool. The tool returned local output paths but no provider/model version or request ID; those fields are null. The `t-01-request.json` and `t-02-request.json` files contain the exact executed arguments and input roles. Result files preserve the actual returned hints and tool paths. Original returned PNGs were copied byte-for-byte into this directory and left at their original tool locations.

T-01 used the code-derived transparent `layout-guide.png` for composition and the unchanged original A-01 branch image for bark style. The guide is an SVG of the existing tree polygon/limb coordinates, rasterized by Playwright Chromium at 2×; it is not generated artwork or gameplay evidence. T-01 had the connected structure but its golden edge/top highlights made background limbs too platform-like. It is preserved as an unselected output, including its diagnostic uniform native reduction.

T-02 was the single allowed refinement, with only T-01 as its edit target. The executed request sought quieter/darker diffuse bark lighting while retaining the tree. The returned source keeps six connected limbs and is selected for integration, not yet owner-accepted. Output shape is assessed as artwork, not claimed pixel-identical to the guide or T-01. [Source/reference bindings](source-bindings.json) pin all originals and executed requests.

## Actual preparation and grounding

Both original PNGs are 971×1620 RGBA. `scripts/prepare-timbers-tree.mjs` applies the existing whole-image integer-weight premultiplied box filter at the same 960/1620 ratio on both axes. The native result is 576×960: the final fractional column is ceil padding, not width stretching. The complete source region is retained, with no crop, key, alpha threshold, tint, pixel repair, mask, or anisotropic scale. The production bitmap is `public/assets/timbers/tree-v1/tree.png`; its required metadata and exact source/PNG/RGBA/alpha-bounds records accompany it. The source copy of [preparation.json](preparation.json) is identical to the production preparation record.

The selected source's native substantial base is 210 contiguous pixels on row939, columns277–486 inclusive, each alpha≥128. That threshold measures support; it does not edit pixels. Rendering at world (32,140) puts the entire base edge at the real ground y1080, spanning x309–519 inside the unchanged x40–820 ground. The faint original fringe below the substantial base remains in the bitmap and is naturally occluded by the existing foreground ground draw. The tree's naturalized root flare is wider than the old polygon, within the planned scenic frame and the real ground; no collision support is widened. The six background connectors have rounded joins and ends, with four outer left regions and two right regions verified from native source alpha. They add no collision or walking surface.

All existing ground/platform kit files are pinned and remain byte-identical. `baseline/` and `presentation-delta.json` record only the exact tree addition on top of the earlier uncommitted preview. `scripts/timbers-tree-preservation.mjs` reverses only those pinned changes before the older unchanged terrain-preview/Cove oracles; unrelated edits still fail. Older generation ledgers, presentation records and screenshot reports are not rewritten to claim the new tree.

Reproduction:

```sh
node scripts/prepare-timbers-tree.mjs /tmp/timbers-tree-reproduction
node --test scripts/prepare-timbers-tree.test.mjs
```

Generated source views and the layout guide are separate from the actual input-driven native/small gameplay captures under `docs/evidence/issue-241/tree-preview/`.
