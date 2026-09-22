# Shared ordinary gem

Created for issue #145, 2026-09-22. The runtime geometry is original code-authored
art in `src/world/renderer.ts` (`drawGem`), following the existing code-native
special-star approach. It uses no generated or downloaded runtime artwork and no
runtime service.

The first implementation used an elongated 24 x 32 diamond. After visual review,
three richer directions were explored with OpenAI ImageGen; the user selected
the broad brilliant-cut direction shown in `cut-diamond-concepts.png` (column C).
That board is concept reference only, not a runtime asset.

All trails now use one code-authored 32 x 28 logical-pixel brilliant-cut gem,
bottom-centered on the rounded entity position. Its wide crown, pointed pavilion,
selective dark rim, hard highlight and nine interior facets retain detail at 1x.
Amber/orange is the default, Frost retains gold, and Cove retains cyan. Biome
colors affect only the interior; geometry and anchoring never depend on an atlas
cell's padding.

Original atlas gem cells remain preserved with their existing provenance but
are no longer used for ordinary world collectibles. Counts, positions, pickup
rules, feedback, and separate special stars are unchanged.
