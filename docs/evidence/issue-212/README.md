# Compact gameplay HUD — issue #212

Baseline: `ce658d9f45ccde74245b474f587c06da6662d1d8` (merged #211).
Capture date: 25 October 2026. Source hashes and capture origins are recorded in
`provenance.json`; the worker handoff identifies the published head.

## Presentation

The bag shrinks from 127 × 34 to 96 × 28 logical pixels (38% less backing area).
It reuses the approved pouch at 24 × 24 and shows four 8 × 8 outlined marks,
with 6 × 6 filled or empty interiors. Each mark queries its pickup ID, so
repeated E/L identities, wrong placements and completed assembly cannot change
collection history. No target word or pickup letter is typeset in the bag.
The existing 0.65-second pickup letter flight remains separate.

Gem and star labels become pixel icons with 10px bold monospace counts. The
diamond follows the existing code-authored pixel treatment; the star uses the
world star's silhouette and palette at HUD scale. Hearts keep their existing
positions, outlines and full/empty/hit colours. Counter backings are 20px high;
the existing generated plaque and `PLAQUE_TEXT_SLICE` provide the shorter rims.
No generated artwork, dependency or asset file changes. The 28px bag height
was chosen after a browser alpha-mask regression exposed a one-pixel pouch/rim
collision at 26px; the final opaque sprite fits the quiet interior.

The introduction uses the existing hint lane at y=31. It explains the ribbon's
Henry marker, checkpoint posts and finish flag after teaching and important
feedback clear. Only eligible simulation steps spend its four-second budget.
New runs reset it; pause, activities and results freeze it. The ribbon's
`x=285,y=221,width=136,height=14` and mapping remain unchanged.

## Evidence types

`fixture-*` images are explicit renderer fixtures, **not gameplay**. The browser
test concatenates the actual TypeScript HUD, education, kit, world, asset and
scenery modules after import stripping, checks every runtime imported symbol,
and uses actual decoded project images. There are no no-op renderer helpers.
Every trail is drawn at each bag count 0–4, with this state matrix:

| Bag marks | Gems | Stars | Health | Hint / notice |
| --- | --- | --- | --- | --- |
| 0 | 0 | absent | 3 full | keyboard movement / trail name |
| 1 | 1 | 1/3 | 2 full + hit | controller jump / checkpoint reached |
| 2 | 10 | 10/12 | 1 full | ribbon introduction |
| 3 | 99 | 3/3 | all empty | keyboard jump / final friendly area name |
| 4 | 44 | 3/3 | 3 full | completed collection, quiet HUD |

Health zero and 12-star totals are layout stress fixtures, not authored run
outcomes. Production lethal damage still refills health and authored totals
remain unchanged. Unit checks additionally cover 9 gems and all health states.

`*-logical.png` captures the actual 426 × 240 canvas bitmap at 1:1. Full-window
426 × 240 and 320 × 240 screenshots retain the existing feedback-control rail
and fractional canvas fit; desktop captures use 1366 × 768. All screenshots are
unmodified browser output. JSON records actual glyph bounding boxes against
the generated art's quiet interior, decoded asset URLs, marks, counter/icon
clearance, hint/notice separation, and Henry/ribbon separation.

`gameplay-*` captures come from real input through the shipped game. The ribbon
introduction case uses ordinary keyboard input and wall time, including a
4.3-second pause, without scene/run mutation or clock acceleration. The Timbers
bag/pickup captures use the existing synthetic keyboard pilot and accelerated
presentation clock, with freezes for capture; simulation still runs through
real input. They are not physical-controller or child usability acceptance.

## Selected captures

Ordinary keyboard gameplay: [native window](gameplay-ribbon-intro-426.png),
[small window](gameplay-ribbon-intro-320.png),
[desktop](gameplay-ribbon-intro-1366.png).
Input-driven Timbers pickup: [letter flight](gameplay-timbers-pickup-flight-native.png)
and [four collected identities](gameplay-timbers-word-two-es.png).

The following are renderer fixtures, with separate 1:1 native captures for
all five collection states:

| Trail | Native bag 0–4 | Small: empty hearts | Desktop: full bag |
| --- | --- | --- | --- |
| Plains | [0](fixture-plains-bag0-logical.png) · [1](fixture-plains-bag1-logical.png) · [2](fixture-plains-bag2-logical.png) · [3](fixture-plains-bag3-logical.png) · [4](fixture-plains-bag4-logical.png) | [320 × 240](fixture-plains-bag3-320.png) | [1366 × 768](fixture-plains-bag4-1366.png) |
| Quarry | [0](fixture-quarry-bag0-logical.png) · [1](fixture-quarry-bag1-logical.png) · [2](fixture-quarry-bag2-logical.png) · [3](fixture-quarry-bag3-logical.png) · [4](fixture-quarry-bag4-logical.png) | [320 × 240](fixture-quarry-bag3-320.png) | [1366 × 768](fixture-quarry-bag4-1366.png) |
| Timbers | [0](fixture-timbers-bag0-logical.png) · [1](fixture-timbers-bag1-logical.png) · [2](fixture-timbers-bag2-logical.png) · [3](fixture-timbers-bag3-logical.png) · [4](fixture-timbers-bag4-logical.png) | [320 × 240](fixture-timbers-bag3-320.png) | [1366 × 768](fixture-timbers-bag4-1366.png) |
| Sunset | [0](fixture-sunset-bag0-logical.png) · [1](fixture-sunset-bag1-logical.png) · [2](fixture-sunset-bag2-logical.png) · [3](fixture-sunset-bag3-logical.png) · [4](fixture-sunset-bag4-logical.png) | [320 × 240](fixture-sunset-bag3-320.png) | [1366 × 768](fixture-sunset-bag4-1366.png) |
| Frost | [0](fixture-frost-bag0-logical.png) · [1](fixture-frost-bag1-logical.png) · [2](fixture-frost-bag2-logical.png) · [3](fixture-frost-bag3-logical.png) · [4](fixture-frost-bag4-logical.png) | [320 × 240](fixture-frost-bag3-320.png) | [1366 × 768](fixture-frost-bag4-1366.png) |
| Cove | [0](fixture-cove-bag0-logical.png) · [1](fixture-cove-bag1-logical.png) · [2](fixture-cove-bag2-logical.png) · [3](fixture-cove-bag3-logical.png) · [4](fixture-cove-bag4-logical.png) | [320 × 240](fixture-cove-bag3-320.png) | [1366 × 768](fixture-cove-bag4-1366.png) |

## Validation and limits

The focused unit regressions were RED against unchanged production: 13 failed.
The first GREEN cohort passed 130 tests. Existing teaching-expiration coverage
now also witnesses the following ribbon cue and its later expiry; input-source,
health, collection and native-focus guards remain.

The initial sandboxed browser attempt executed zero tests because preview
binding failed with `listen EPERM`. A command-scoped escalated Chromium fixture
run passed 6/6. The first whole-unit run had 1,022 passing and 6 failing tests,
plus one suite import failure: existing Python subprocesses hit `EPERM`, and
two unchanged finish-layout cases exceeded their existing 5s deadlines. A
single-worker diagnostic passed all 26 affected-file tests without changing
deadlines. Initial script checks also hit child-process `EPERM`; the diagnostic
preserves those failures. No assertion, timeout, retry or engine was removed.

Final command results and selected capture inventory are recorded alongside
the handoff. The complete three-engine browser matrix remains a PR CI gate
owned by the coordinator, as does fresh Claude review and merge. These captures
do not certify native Safari, assistive technology, physical controllers or
owner/child acceptance.

Final validation after the measured pouch correction:

| Command / cohort | Result |
| --- | --- |
| `npm test -- --maxWorkers=1` | 1,035 passed, 57 files |
| `npm run test:ci` | 57 passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; `index-BUvLy2x3.js` |
| Focused final three-engine browser cohort | 30 passed: 10 per engine, zero skips/retries |
| Browser configured/executed reconciliation | 30 configured = 30 executed, zero report errors |

Before the correction, a broader 48-case three-engine cohort also passed,
including the representative Plains star/ribbon routes, collected-gem drawing,
alignment and builder-kit assembly fixture. That result is historical coverage
of the preceding geometry, not final-head approval. The added opaque-pouch
regression then failed one Chromium fixture specifically on `pouch: false`;
all other clearance assertions stayed true. The final 30-case cohort includes
that assertion across all six trails and three engines, plus real pickup,
input-source/glyph and pause/intro checks. Deadlines, retries and engine coverage
were unchanged.

The retained 59 PNGs are byte-identical selections from that final cohort.
`layout-chromium.json`, `layout-firefox.json` and `layout-webkit.json` each record
90 layout states (six trails × five bag counts × three viewport sizes), decoded
assets, glyph checks and opaque-pouch clearance. `tested-source.json` pins the
exact local sources and production bundle; the local browser run happened before
commit, so its report revision field is null. Those hashes were rechecked after
the final build. All logs and the complete capture cohorts remain in the scratch
evidence directory identified by `provenance.json`.
