# Issue #106 title artwork integration

Approved source, prompt and provenance are preserved under `assets/source/title/`.
The runtime PNG is an unchanged local copy, verified against the issue's SHA-256.

Screenshots cover Chromium, Firefox and WebKit at 1366 × 768 (3× canvas),
426 × 240 (logical size), and 320 × 240 (fractional downscale). Each shows the
keyboard-selected Quarry Run before starting. Capture is part of the focused
`approved title artwork and menu fit` tests in `tests/browser.spec.ts`.

Visual review checks the full artwork, transparent silhouette, proportional
scaling, crisp edges, legible menu and clearance above the status/mute controls.
The menu was raised two logical pixels to clear Firefox's taller status strip;
the start prompt was increased from 10 to 12 logical pixels for small viewports.

| Browser | Desktop | Logical size | Small viewport |
| --- | --- | --- | --- |
| Chromium | [1366 × 768](chromium-1366x768.png) | [426 × 240](chromium-426x240.png) | [320 × 240](chromium-320x240.png) |
| Firefox | [1366 × 768](firefox-1366x768.png) | [426 × 240](firefox-426x240.png) | [320 × 240](firefox-320x240.png) |
| WebKit | [1366 × 768](webkit-1366x768.png) | [426 × 240](webkit-426x240.png) | [320 × 240](webkit-320x240.png) |

The unchanged source costs approximately 1.1 MB at runtime. Below the logical
resolution the existing viewport scales fractionally, so individual pixel widths
can vary. No changes to the overworld (#94) or broad documentation cleanup (#95).

Validation (Node 22.22.1):

- `npm test`: 478 passed in 28 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test:browser -- --workers=2`: 137 passed, 1 skipped (17.1 minutes).
  The existing Firefox native-audio test skips without a working host audio clock.
- Browsers: Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6.
- All nine screenshots inspected; no cropping, distortion, blur or control overlap
  found. Existing full-route replay tests pass in all three browsers and compare
  the returned title canvas with its initial image.
