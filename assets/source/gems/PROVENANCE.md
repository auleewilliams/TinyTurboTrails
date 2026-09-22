# Shared ordinary gem

Created for issue #145, 2026-09-22. Original code-authored geometry in
`src/world/renderer.ts` (`drawGem`), following the existing code-native special
star approach. No image generation, downloaded artwork or runtime service.

All trails use one stepped diamond outline and faceted interior, 24 x 32 logical
pixels, bottom-centered on the rounded entity position. Amber/orange is the
default, Frost retains gold, and Cove retains cyan. The dark rim is #10252c,
matching the shared star and gameplay cue palette. Biome colors affect only the
interior; geometry and anchoring never depend on an atlas cell's padding.

Original atlas gem cells remain preserved with their existing provenance but
are no longer used for ordinary world collectibles. Counts, positions, pickup
rules, feedback, and separate special stars are unchanged.
