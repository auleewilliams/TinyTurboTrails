# Integrated Plains scenery

Captured from the production build in Chromium on 2026-09-18, with a
1366 × 768 browser viewport and the game's 426 × 240 logical canvas.

- [Starting meadow](start.png): generated panorama, transparent foreground
  daisies, original Henry/gem/slime artwork and unobstructed route.
- [First tree and checkpoint](meadow.png): Henry at X 469; the generated oak
  is anchored to the ledge and drawn behind him. The checkpoint, gem and slime
  retain their gameplay artwork.

Review checked background framing, transparency, ground contact and gameplay
readability. A read-only subagent review found no remaining defects after
preserving Quarry's draw order and enabling foreground in gameplay preview.

The scenery source files, exact prompts and model disclosure are documented in
[provenance](../../../assets/source/plains/scenery/PROVENANCE.md).
