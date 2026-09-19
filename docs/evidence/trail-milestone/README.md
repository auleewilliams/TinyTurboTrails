# Trail presentation milestone — 2026-09-20

Integrated work for [#94](https://github.com/auleewilliams/TinyTurboTrails/issues/94),
[#87](https://github.com/auleewilliams/TinyTurboTrails/issues/87),
[#92](https://github.com/auleewilliams/TinyTurboTrails/issues/92) and
[#95](https://github.com/auleewilliams/TinyTurboTrails/issues/95).
Base: remote main `e04b5e2`, fetched before implementation. Host: Windows,
Node 24.19.0. No merge or deployment is part of this change.

## Evidence

- [426 × 240 layout prototype, before artwork](before/map-prototype-426x240.png)
- [Native map](after/map-native.png), [2× map](after/map-2x.png), [small window](after/map-small.png)
- [Quarry map and preview](after/map-quarry-run.png), [Treetop map](after/map-treetop-timbers.png)
- [Plains before](before/plains-0.png) / [after](after/plains-0.png)
- [Quarry before](before/quarry-5500.png) / [after](after/quarry-5500.png)
- [Treetop before](before/timbers-3700.png) / [after](after/timbers-3700.png)
- [Construction before](before/sunset-1800.png) / [after](after/sunset-1800.png)
- [Frost before](before/frost-1800.png) / [after](after/frost-1800.png)
- [Cove before](before/cove-3700.png) / [after](after/cove-3700.png)

The before/after directories each contain six samples per route at world X
0, 1800, 3700, 5500, 7400 and 9000. Native images were inspected for contour
seams, pit visibility, anchoring, material identity and gameplay contrast.
The map was also inspected at normal integer scaling and 320-pixel width.

Full-route camera audit recordings: [Plains](scroll/plains.webm),
[Quarry](scroll/quarry.webm), [Treetop](scroll/timbers.webm),
[Sunset](scroll/sunset.webm), [Frost](scroll/frost.webm), [Cove](scroll/cove.webm).
These deliberately labeled rendering sweeps are not human playthroughs. Browser
tests separately drive real input and simulation through the finish flows.

## Validation record

- `npm ci`: passed, lockfile unchanged.
- `npm test`: 492 passed in 29 files on this host.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- New Chromium full-route/navigation/retry cohort: 7 passed before the final
  accessibility and additional input-mode assertions.
- Final complete browser matrix and Linux CI: validation in progress; results
  will be updated on this review branch before handoff.

An early browser invocation reused an unrelated preview server and was stopped;
it is not evidence for this milestone. The config now refuses server reuse and
supports `PLAYWRIGHT_PORT` (4177 for the isolated local final run).
An intermediate correct-server run reported 86 passes, one skip, 46 Firefox
launch failures, four obsolete art assertions, and one artifact cleanup conflict
caused by overlapping test invocations. The assertions and output isolation were
corrected; only the final run is acceptance evidence.

Firefox 155.0 from Playwright build 1543 fails before launch on this Windows host
with an incorrect side-by-side configuration, including after a forced browser
reinstall. This is not a game assertion pass. Linux CI runs all three engines.
Physical controllers, installed Safari on macOS and Henry's usability are separate
checks; no historical waiver is silently applied to this milestone.

## Rendering cost

[Raw comparison](render-performance.json) measures 600 full-route camera samples
per trail after 30 warmups, including full 426 × 240 pixel readback, against the
renderer from `e04b5e2` on the same headless Chromium host. This is a deliberately
CPU-heavy rendering probe, not a GPU or end-to-end frame-time guarantee. The
observed p95 remains below 3 ms, within the 16.7 ms frame budget; added mean cost
is roughly 0.4–1.0 ms. Materials and edge detail are viewport bounded, panoramas
never wrap, and map thumbnails are rendered once per destination.

Reproduction: run `npm run dev -- --port 4175`, then
`node scripts/capture-milestone.mjs after`, `node scripts/record-trail-scroll.mjs`
and `node scripts/audit-trail-rendering.mjs`. The last script temporarily loads
the baseline renderer from Git. The `before` captures were made before edits.

## Human check and limitations

The parent was asked to carry out the [Henry worksheet](HENRY-CHECK.md) when the
integrated local build became playable. **Feedback is pending.** Automated input
and visual checks do not establish landmark recognition by the intended player.

The Plains mockup named in #87 was not present in either the initial checkout or
remote main. Its written direction (short irregular turf, dark topsoil, warm
quiet soil, muted stones and sparse roots) was used; no missing mockup is claimed
as reviewed. Approved title pixels and existing asset provenance are preserved.

Current guidance formerly found in superseded plans has been migrated into the
world, movement, interactions and art guides. Dated certification evidence and
waivers remain intact and are explicitly marked historical.
