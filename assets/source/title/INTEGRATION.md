# Issue #106 integration

The PNG, prompt-v2.txt and PROVENANCE.md in this directory are preserved unchanged
from approved commit b5fa561117c5e3ef2f44c1e29a52f97134b97ccb.

Source and runtime PNG SHA-256:
`6d5f4feba06ad2a765c92181a12b7267731a6b7677f826d3ba59e0e144893b75`.

The runtime asset at public/assets/title/tiny-turbo-trails-v2.png is a byte-for-byte
copy (1699 × 926 RGBA, about 1.1 MB). Keeping the original avoids another lossy
resampling step and preserves every transparent pixel. Reproduce with:

```sh
cp assets/source/title/tiny-turbo-trails-v2.png public/assets/title/tiny-turbo-trails-v2.png
```

The canvas draws the complete image at 280 logical pixels wide, with proportional
height and smoothing disabled. The existing canvas CSS scales with crisp edges.
The separate menu below the image preserves space for the viewport status bar.
