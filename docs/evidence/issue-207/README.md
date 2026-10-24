# Illustrated interface kit (#207)

Replaces flat-colour panels and controls with four generated nine-slice pieces:
a timber-framed panel, normal and selected wooden buttons, and a compact HUD
plaque. This is presentation only. Gameplay, rewards, assembly/retrace,
session-only progress, input/focus, hit targets and the required-asset Retry
flow keep their behaviour. The owner authorized implementation and coordinator
review/merge but has **not** reviewed this artwork. See the
[source provenance](../../../assets/source/interface/PROVENANCE.md).

## Surface inventory

| Surface | Treatment |
| --- | --- |
| Finish/results panel and Replay / Next / Trails | Panel; selected/normal buttons at the existing targets. The panel grows from y 24–220 to 16–228 so the title and control prompt clear its frame. Action labels rise 1 px so the `y` descender clears the plank rim |
| Pause, return-to-Trails confirmation, focus-loss pause | Dim scrim kept; panel `(40, 18, 346, 218)` behind the existing text; buttons at the existing targets |
| Sticker collection | Scrim kept; six plaque cards (card labels move up 1–2 px to clear the border); Return button uses the selected plank |
| Spelling assembly | Empty spaces and Find more / Leave buttons use normal/selected planks; approved tiles, pouch, stickers and separate glyphs unchanged |
| HUD gems / hearts / stars / hint / notice, bag, trail ribbon | Plaques at the original rectangles. The one-line hint uses a text-safe slicing of the same plaque (rim 4 px top, 3 px bottom), so its 10 px glyphs and descenders fit the 18 px height; its width is rounded up from the measured glyph extent (≤1 px wider) |
| Overworld info panel, Play, Stickers, story replay | Plaque panel (the preview fits inside its interior); Play uses the selected plank, corner controls the normal plank. Stickers labels sit inside the plank face at x 288, baselines 20/28. The keyboard hint reads `E/click` (was `E / click`); the controller hint is unchanged |
| Mute, Rumble, Retry (DOM) | CSS `border-image … fill` over the unchanged 1px border box. `:active` shifts 1px. Retry uses the gold plank and keeps gold as its flat fallback so dark text stays legible if the kit fails to load |

Left unchanged: title, map, landmark, story and sticker artwork. Story navigation
buttons are left for #195 (storyboard rework). Map selection rings and the 15 × 14
completion badge are focus/status marks too small for a framed piece. The canvas
`LOADING ERROR` panel is unreachable because `ScreenController.fail` is never
called. `#status` loading/error text must not depend on the art it reports.
Supported states are normal, selected/focused (canvas selection plus the
existing DOM focus outline) and DOM pointer-pressed. No control has a disabled
state, so none was invented.

## Evidence

| File | Kind |
| --- | --- |
| [finish-concept-852.png](finish-concept-852.png) | Actual gameplay capture of the first finish-only concept (Plains, real route) |
| [before-after-426.png](before-after-426.png) | Composed sheet of actual gameplay captures at 426 × 300: base `030e874` vs this branch, covering map, stickers, HUD, pause, confirmation, assembly (held letter + focused space), finish and Retry |
| [before-after-320.png](before-after-320.png) | The same states at 320 × 240 |
| [kit-asset-proof.png](kit-asset-proof.png) | Asset proof, not gameplay: prepared pieces at native size and 4× on dark and light |
| [review-fix-zoom.png](review-fix-zoom.png) | Actual gameplay pixels at 4×: map Stickers/story controls and the HUD move hint, before and after the review fix |

Captures were taken from the production build in Chromium with reduced motion,
using real keyboard/pointer input and an automated route pilot to reach the
finish. They are not an owner/child playtest or a physical-controller test.

## Text clearance

A browser regression (`kit text clears generated rims …`) hooks the real game
canvas in Chromium, Firefox and WebKit. For every glyph drawn over a kit piece,
it compares the `measureText` actual bounding box with that piece's quiet
interior, reconstructed from the corner slices actually drawn in that frame. It
covers keyboard and controller prompts on the map, HUD and pause/confirmation,
the sticker collection, HUD notices, assembly and finish results, with
screenshots at 426 × 300 and 320 × 240. Canvas text is laid out in the 426 × 240
logical space, so glyph clearance does not depend on window size.

## Known limitations

- The panel's right timber edge is slightly less regular than the left (see
  provenance). It tiles consistently.
- At 320 px the canvas is downscaled fractionally. Legibility matches the
  existing text and is no better than before.
