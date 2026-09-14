# Henry image provenance

Generated on 2026-09-14 with the built-in `image_gen` tool. The tool did not
report an underlying model version; none is claimed. No API key or fallback API
workflow was used. The game never calls the generator.

- `reference.png`: selected character reference and Plains palette/style sheet.
  Exact request: `reference-prompt.txt`.
- `starter-atlas.png`: original 16-pose atlas generated using `reference.png` as
  the identity reference. Exact request: `starter-atlas-prompt.txt`.
- `transparency-attempt.png`: rejected background-removal attempt, retained to
  explain the processing decision. Exact request: `transparency-attempt-prompt.txt`.

Both atlas outputs have RGB color type 2, not RGBA, and contain a baked gray
checkerboard. They are source material only and must not be shipped directly as
transparent sprites. Local background removal/packing is pending user approval.

The reference includes a detailed human child (brown hair, yellow hard hat,
orange reflective vest, blue clothing, brown boots) and a chunky Plains vignette.
The vignette is concept/reference material; full environment assets are issue #4.
