# Sunset Site panorama

Created for issue #139 on 2026-09-22 using the built-in imagegen tool.
No specific model version is asserted. The exact generation request is in
[`prompt.txt`](prompt.txt). No input or reference image was supplied.

`panorama.png` is the untouched generated output (2172 x 724 pixels, 3:1).
The prompt requested 1536 x 512; the tool returned the same aspect ratio at a
larger size. The source is retained here, outside the public asset directory.

Run `node scripts/prepare-backgrounds.mjs` from the repository root to produce
`public/assets/site/background.png`. This uses Chromium canvas with
nearest-neighbor sampling to match the game's existing pixel-art pipeline.
The shipped image is 720 x 240; gameplay displays a moving 426 x 240 crop at
native pixel height. There is no runtime source-image download or generation.

The renderer pans once across the bounded image from route start to finish;
the edges are not claimed to tile seamlessly. All depicted landmarks are distant
scenery and introduce no collision surfaces. Source prompts and pixels are
preserved independently of the production resize.
