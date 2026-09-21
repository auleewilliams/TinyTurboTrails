# Shared trail material and scenery artwork

Generated 2026-09-20 with the built-in imagegen tool for #87 and #92.
Original, unmodified outputs are `materials.png` and `backdrops.png`; exact
prompts are `materials-prompt.txt` and `backdrops-prompt.txt`. Offline-resampled production copies
ship under `../../../public/assets/trails/`. No model version is asserted.

Materials uses a 3 × 2 grid in soil, stone, wood, gravel, frost, sand order.
The renderer samples the cells into world-anchored fills, clipped to connected
collision contours, at restrained opacity. Separate code-drawn contour edges
and authored grip indicators remain above the texture. Material metadata is
cosmetic and does not assign friction.

Backdrops contains two equal panorama rows: Quarry above Treetop. Each is panned
within source bounds over its route rather than repeated. Foreground entity
positions and collision geometry are unchanged. Distant structures are part of
the background artwork, not extra platforms.

Production sizes are 288 × 192 (landmarks), 576 × 384 (materials), and
720 × 480 WebP (backdrops, quality 0.86). Reproduce with `node scripts/prepare-trail-art.mjs`
from the repository root. Source pixels remain untouched.

Neighbouring material samples mirror at their shared edge, preserving matching
boundary pixels without requiring the generated swatches to be seamless.
