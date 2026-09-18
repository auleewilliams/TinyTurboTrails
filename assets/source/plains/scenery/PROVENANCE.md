# Plains scenery asset pack

Generated on 2026-09-18 using the built-in `image_gen` tool. The user approved
this generator after being informed that its underlying model cannot be selected
or verified. These assets are **not claimed to be GPT Image 2.5 output**.

## Sources and prompts

- `background.png`: opaque 1536 × 1024 plains panorama with clouds, layered
  teal/sage hills and distant woodland; exact prompt in `background-prompt.txt`.
- `foreground.png`: 1536 × 1024 RGBA sheet with two oaks, two bushes, grass,
  daisies, a mossy rock and pebbles; exact prompt in `foreground-prompt.txt`.

The existing environment sheet and `docs/art/README.md` informed the palette
and prompt descriptions. No reference image was passed to either generation
call. Original built-in output IDs:

- Background: `exec-8ad56cc1-83e1-4c2c-9597-f57860efdbe4.png`
- Foreground: `exec-e5512d77-53e8-4a05-80b4-1eb72cb89bb5.png`

The PNGs in `public/assets/plains/scenery/` are byte-for-byte copies of these
sources. No background removal, resampling or color conversion was applied;
the generated alpha is preserved. The foreground contains 1,068,776 completely
transparent pixels. Both images were visually inspected.

## Integration contract

`public/assets/plains/scenery/manifest.json` describes the images and eight
sprite rectangles. Generation did not obey the requested uniform grid, so the
manifest records measured bounds instead. Bounds include pixels with alpha
at least 16/255; the original file retains all softer edge pixels. Every measured
sprite is contained within its own non-overlapping region. Anchors are relative
to the source rectangles, at their bottom center; `logicalSize` gives suggested
gameplay drawing dimensions. Disable canvas image smoothing when drawing.

The background is one flattened panorama, not separate parallax layers. It is
not certified seamless; `seamless: false` prevents assuming direct horizontal
tiling. Preserve its aspect ratio and crop as needed for the 426 × 240 viewport.

The Plains theme enables this pack in adventure, world preview and gameplay
preview. The original atlas remains in use for gameplay objects and cave props.
`public/assets/plains/manifest.json` references this pack's metadata, and the
loader passes image or metadata failures through the existing Retry loading UI.

The renderer pans one aspect-correct crop across the panorama over the whole
route. Generated trees, bushes, flowers and rocks replace decorative atlas
sprites, behind all interactives and Henry. Low grass and daisies render after
Henry on flat ledges with clearance from gameplay objects, the start and finish.
Ground anchors remain tied to existing terrain. The new scenery is decorative
and carries no collision behavior. Quarry retains its original rendering and
draw order, although both levels share the same loaded world asset bundle.
