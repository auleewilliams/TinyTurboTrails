# Issue #106 integration

The PNG, prompt-v2.txt and PROVENANCE.md in this directory are preserved unchanged
from approved commit b5fa561117c5e3ef2f44c1e29a52f97134b97ccb.

Source PNG SHA-256:
`6d5f4feba06ad2a765c92181a12b7267731a6b7677f826d3ba59e0e144893b75`.

The runtime asset at public/assets/title/tiny-turbo-trails-v2.png is a
high-quality 282 × 154 RGBA resample with ample headroom over its 94-pixel map
draw. The transparent original remains untouched. Reproduce with:

```sh
node scripts/prepare-trail-art.mjs
```

The canvas draws the complete image at 94 logical pixels wide on the overworld,
with proportional height and smoothing disabled.
