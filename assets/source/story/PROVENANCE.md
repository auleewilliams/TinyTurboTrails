# Patchwork Vale story artwork

Generated 2026-09-21 with the built-in image generator (no API key or runtime
dependency). `prompt.txt` is the exact submitted prompt. The identity reference
was `public/assets/henry/starter.png`, the unchanged shipped 16-frame atlas at
the milestone base. `generated-panels.png` is the unmodified 1536×1024 output.

Four equal 768×512 panels, reading left to right, top to bottom: picnic,
storm-damaged bridge, hill journey, reunion. Shared purple neighbour, sandwich,
arch and red/yellow/blue bunting bind them together. No embedded text. Henry
retains brown hair, yellow hat, orange reflective vest, blue clothes, brown
boots and a human silhouette. Story art is an illustration, not a gameplay
animation replacement.

`scripts/prepare-story-celebration.py` (Python + Pillow) resizes the sheet once
with nearest-neighbour to 768×512 under `public/assets/story/patchwork-vale.png`.
Runtime takes equal quadrants; no semantic editing or runtime generation.
Run from the repository root:

```sh
python scripts/prepare-story-celebration.py
```

Adult visual inspection checks identity, simple visual cause/effect, native
and small layouts. The parent-led child-comprehension follow-up is explicitly
pending; see `docs/patchwork-vale-story.md`. The story does not depict a completed
repair as a reward for simply reaching the trail finish.
