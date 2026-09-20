# Overworld destination landmarks

Generated on 2026-09-20 using the built-in imagegen tool for issues #94/#87/#92.
The original output is `landmarks.png`; the nearest-neighbor production sheet is
`../../../public/assets/overworld/landmarks.png`. The renderer samples six cells
in reading order. No external stock material or runtime generation is used.
The approved title artwork remains unchanged in its separate title directory.

The layout was prototyped and inspected at 426 × 240 before generation;
see `../../../docs/evidence/trail-milestone/before/map-prototype-426x240.png`.
The exact generation prompt is in `prompt.txt`.

Production sizes are 384 × 256 (landmarks), 576 × 384 (materials), and
1152 × 768 (backdrops). Reproduce with `node scripts/prepare-trail-art.mjs`
from the repository root. Source pixels remain untouched.

The quiet illustrated meadow background is separately generated in
`background.png` with its exact prompt in `background-prompt.txt`, using the
same built-in tool on 2026-09-20. Production normalization is 426 × 240.
