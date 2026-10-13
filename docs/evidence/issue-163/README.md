# Plains trail preview

Issue: https://github.com/auleewilliams/TinyTurboTrails/issues/163

Route: `/?scene=adventure`, viewport: 426 × 240. Skip the opening story, then
select each landmark. The preview regression also opens Replay story and skips
back to Plains.

- `plains-before.png`: Chromium screenshot from the regression's expected
  failure before removing the story overlay.
- `plains-map.png`: Chromium after the fix; the panel shows the cached gameplay
  preview with no story illustration layered over it.
- `quarry-map.png`, `timbers-map.png`, `sunset-map.png`, `frost-map.png`,
  `cove-map.png`: the other five trail panels in Chromium.
- `plains-firefox.png`, `plains-webkit.png`: Plains after the fix in the other
  browser engines.

The focused Playwright regression passed in Chromium, Firefox and WebKit. It
checks all six landmark thumbnails, compares the final preview pixels with the
actual cached-canvas draw, rejects story artwork on the map, and verifies that
Replay story still draws the opening picture and returns to the map.

Screenshots were captured from the local production bundle by Playwright; no
game artwork or generated assets changed.
