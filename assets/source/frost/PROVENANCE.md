# Frost environment provenance

Generated 2026-09-19 with the built-in image generator. No underlying model
version was reported. Exact request: `environment-prompt.txt`. Original RGBA
source: `environment-sheet.png`. No runtime generation or external asset fetch.

Processed with the repository's standard-library atlas pipeline:

```sh
python3 scripts/process_sprite_atlas.py assets/source/frost/environment-sheet.png public/assets/frost/environment.png
```

The processor now accepts RGB and RGBA sources and preserves existing alpha,
including white snow and translucent edges. The original source remains intact.
Runtime output is 192 × 192 pixels: sixteen 48px cells in WORLD_ASSETS order.
Visible bases and terrain top samples were inspected on the processed atlas;
manifest anchors use the normalized 44px base and checkpoint post alignment.
Material bands are deterministic canvas overlays aligned to the ground contour.
