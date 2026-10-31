This is the separately versioned, owner-authorized ONE-platform B pilot for
`cove-bay-ledge-1` (world x2960, top272, collision width140). The old terrain kit,
source sheets, PNGs, preparation records and historical rejected proofs remain
unchanged. This is not approval of any other platform.

`source.png` is the unmodified actual isolated image, not the requested guide:
SHA256 2602a27083566049e701104c27534d7426b7a601e8f37e0e4921aba460346d93,
1536×1024 RGB. The original provider/tool response, actual reported low quality,
requested medium quality, literal prompt and original reference hashes are retained
in `generation-record.json` and `executed-generation-prompt.txt`. Local copies of
the exact technical guide, isolated B style crop and original pilot contract are
in `references/`; original absolute evidence references remain historical.

Preparation: edge-connected chroma key, established mode downsampling of fixed
source rectangle x208,y437,w1120,h240 at **8× isotropic** into140×30. This is the
explicitly authorized change from requested4×. The crop trims22painted-source
columns at each end:1469opaque source pixels (0.8718204370378283%), with no top
or depth trim. It is not source-pixel-lossless. `raw-native.png` preserves the
previous rejected diagnostic pixels; historical rejection is not retroactively
passed. Owner authorization is copied verbatim in `owner-authorization.json`.

Exactly two raw-alpha-zero top endpoints are filled from existing source-derived
adjacent native pixels: (0,0)←(1,0), RGBA254,221,140,255; (139,0)←(138,0),
RGBA253,217,135,255. No pinholes beyond these two exist. Every already opaque
raw native pixel remains unchanged. No new colours, replacement boulders,
stretching, filler strips, extra clipping or geometry changes are used.
`preparation.json` records the before/after pixel hashes and individual donors.
`caps.json` preserves all140 inherited per-column depth caps15..30. The prepared
image has an entirely opaque first row, no internal column gaps and no cap
exceedance. Maximum actual painted depth is27px; intentional underside alpha
remains transparent. The PNG box itself prevents above-top/side alpha.

Reproduce from repo root: `node scripts/prepare-cove-bay1.mjs`.
Prepared and runtime PNG bytes must equal SHA256
e1809f4f247e693c96968ce7661e2e2126d46d28567b032e534634ee6a2b94cc;
RGBA SHA25652ee522781185b896c09302377b99cf9d16c0aaf0db73dc5d1239821b38fb1a6.
Tests retain adversarial source, top, hole, depth and exact-presentation-delta
controls. `presentation-delta.json` and the immutable HEAD baseline copy allow
only the recorded Cove terrain loader/ID dispatch delta to reverse before the
existing historical byte oracle. No old pin catalog is edited or exempted.

Static alpha and software compositions do not certify gameplay. The actual-input
426px/320px Chromium pilot and accessible Retry check must complete before owner
visual acceptance. At this worker checkpoint the sandbox denied Vite's existing
127.0.0.1:4173 listener; no gameplay capture has been produced. Dirty reports have
sourceRevision:null, and previous-head CI is historical evidence only.
