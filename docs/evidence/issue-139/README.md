# Final three trail backgrounds — issue #139

Implemented locally from `c2ab241` on 2026-09-22, Windows / Node 24.19.0.

Sunset Site, Frost Ridge and Sandy Cove now load dedicated illustrated panoramas.
Each image is 720 x 240; the renderer moves a native-size 426 x 240 crop through
294 pixels over the whole trail. The old enlarged skyline cells and extra sunset
disc are not drawn over the new artwork. The map uses the same world renderer.
The new images total 1,001,189 bytes (about 978 KiB); full-resolution sources are
kept outside `public/`. Broader startup-transfer optimization remains in #124.

## Visual evidence

Each before/after directory contains native start, middle and end captures with
Henry, the HUD and gameplay entities. These are controlled scene renders.

| Trail | Before | Start | Middle | End | Scrolling audit |
| --- | --- | --- | --- | --- | --- |
| Sunset Site | [Before](before/sunset-start.png) | [Start](after/sunset-start.png) | [Middle](after/sunset-middle.png) | [End](after/sunset-end.png) | [Recording](after/sunset-scroll.webm) |
| Frost Ridge | [Before](before/frost-start.png) | [Start](after/frost-start.png) | [Middle](after/frost-middle.png) | [End](after/frost-end.png) | [Recording](after/frost-scroll.webm) |
| Sandy Cove | [Before](before/cove-start.png) | [Start](after/cove-start.png) | [Middle](after/cove-middle.png) | [End](after/cove-end.png) | [Recording](after/cove-scroll.webm) |

The recordings sweep the camera across the entire route; they are rendering
audits, not input-driven playthroughs. Independent browser tests exercise
keyboard play, map selection, gameplay, and failure/retry for each new image.

Actual application map/gameplay captures use 426 x 240, 852 x 480 and 320 x 240
viewports. Their files are `after/{sunset,frost,cove}-{map,play}-{native,2x,small}.png`.
Representative views: [native Sunset map](after/sunset-map-native.png),
[small Frost map](after/frost-map-small.png), [2x Cove map](after/cove-map-2x.png),
[small Sunset gameplay](after/sunset-play-small.png),
[2x Frost gameplay](after/frost-play-2x.png), and
[native Cove gameplay](after/cove-play-native.png).

Native route samples and these representative layouts were visually inspected
for framing, clear terrain edges, HUD weight and sprite/background separation.
Construction silhouettes sit behind the route; snowy ridges have atmospheric
separation; the coastal horizon continues across the full panorama. No visual
correction was required after the initial asset packaging.

## Reproduction

1. `npm ci`
2. `node scripts/prepare-backgrounds.mjs`
3. `npm run dev -- --port 4175 --strictPort`
4. `node scripts/capture-backgrounds.mjs after`

Use `after --layouts-only` to refresh just the real application layouts without
repeating the recordings. The `before` captures were made before renderer edits.
Exact generation prompts and untouched source pixels are under
`assets/source/{site,frost,cove}/background/`, with a provenance file for each.

## Validation

- `npm ci`: passed; lockfile unchanged.
- `npm test`: 539 passed in 31 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Full browser matrix (`npm run test:browser -- --workers=3`, with
  `PLAYWRIGHT_PORT=4189`): 132 passed, one WebKit native-audio skip, 67 Firefox
  launch failures, and one WebKit retry-test synchronization failure (18.6 min).
  Chromium passed all 67 tests; WebKit passed 65 with one skip and that failure.
- The WebKit retry failure was a test race: the helper could inspect the previous
  error document before Retry's reload began, so it failed to dismiss the new
  opening story. The test-only `retryAndDismiss` helper now awaits the new
  document's `load` event before reading status. All asset-retry tests use it.
- Final focused Chromium/WebKit run: **28 passed** (52.9 s), including the
  previously failing Frost atlas retry, every changed retry test, all six new
  panorama cases per engine, and the existing Plains/Quarry background test.
  Command: `npm run test:browser -- --project=chromium --project=webkit --workers=2 --grep 'retry|Retry|art preview|panorama' --output=test-results/issue-139-retry`
  with `PLAYWRIGHT_PORT=4189`.
- Typecheck and production build passed again after the test helper correction.
- `git diff --check`: passed.

Firefox build 1543 cannot launch on this Windows host. Playwright reports
`browserType.launch: spawn UNKNOWN`; launching the same executable directly with
`--version` confirms Windows' "side-by-side configuration is incorrect" error.
This happens before any page or assertion runs. The earlier trail-milestone
evidence records the same host problem. Firefox acceptance requires a working
Firefox runtime (for example the repository's Linux CI matrix).

Focused coverage verifies bounded crops at both ends and fractional camera
positions, return scrolling, no repeated atlas hills or duplicate sun, native
asset dimensions, correct map/gameplay selection, and failed-image recovery.
Human recognition of the landmarks by the intended player is not established by
these automated checks.
