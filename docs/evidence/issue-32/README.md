# Issue 32 visual evidence

`treetop-timbers.png` is the 426 × 240 logical game canvas captured at 3× display
scale in bundled Chromium after selecting the third title-screen entry and
starting Treetop Timbers.

Command:

```sh
npx playwright test tests/browser.spec.ts --project=chromium --grep "Treetop Timbers"
```

The frame shows the warm sunset sky, textured plank trail, generated timber
props, and Henry approaching the first shallow rope-bridge contour after the
opening crane-hook spring. The same test records the timber atlas source once
and requires the rendered world to use `/assets/timbers/environment.png`.
