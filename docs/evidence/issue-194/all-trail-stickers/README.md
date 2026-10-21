# Generated stickers for all six trails

Completes the remaining #194 artwork on main `51063214cc8e9862b43edb7498108e092fdb1804`.
Plains HILL, Quarry Run ROCK, Treetop Timbers TREE, Frost Ridge SNOW and Sandy
Cove SAND now use generated stickers matching the approved Sunset hard-hat/beam
sticker. Sunset's runtime PNG, the pouch and the tile are byte-identical to main.
No simulation, collection, assembly, missing-letter return, reward, session,
storage, terrain or input rule changes.

## Generation and preparation

Sources, exact prompts, Hermes requests, reported provider metadata and the
chroma-key preparation are documented in the
[sprite provenance](../../../../assets/source/spelling/sprites/PROVENANCE.md).
In short: one fresh Hermes `image_generate` request per sticker (no refinements)
through the `openai-codex` provider, with the Sunset source passed as
`reference_image_urls`. The provider returns **opaque RGB**, so each source
requested a flat magenta background. Edge-connected background removal and
nearest-neighbour sampling produce true RGBA 56 × 56 cells with 2 px clear
padding. The backend reported `quality: low` and `1254x1254` although Hermes
requested `medium` and `1024x1024`.

| Trail | Source SHA-256 | Runtime SHA-256 | Content rect |
| --- | --- | --- | --- |
| Plains | `62299119…fa561f25` | `e3a3e9ce…bcf77f9c` | 2, 10, 52 × 35 |
| Quarry | `1c21bf3f…6350682d` | `5b7a9ec0…ae018592` | 2, 5, 52 × 46 |
| Timbers | `598d7b9e…b154e5ec` | `e8e49bd8…f0931dff` | 3, 2, 50 × 52 |
| Sunset (unchanged) | `b53fac46…153563ca` | `854702e0…7ec7cb01` | 3, 2, 49 × 52 |
| Frost | `af2a5333…22d01ad2` | `efbed841…15fbda62` | 2, 4, 52 × 48 |
| Cove | `3f9adc1f…8981da5d` | `25b50ddc…d144c87b` | 2, 3, 52 × 50 |

Full hashes, including decoded-pixel hashes, are in
[`preparation.json`](../../../../assets/source/spelling/sprites/preparation.json).

## Runtime

`loadSpellingAssets` requires `pouch.png`, `tile.png` and
`<trail id>-sticker.png` for all six trails, checking every native size. A missing
or wrongly sized sticker rejects adventure startup into the existing
error/Retry boundary; there is no code-drawn fallback. The earned screen draws
only the current trail's sticker at `(337, 63, 56, 56)`. The collection draws all
six at the existing 0.55 scale: earned at full opacity, unearned at 0.3.

## Automated checks

| Check | Result |
| --- | --- |
| `npm test` | 961 passed, 52 files (main: 960; +1 loader test) |
| `npm run test:ci` | 30 passed (main: 13; +17 sticker preparation/asset tests) |
| `npm run typecheck`, `npm run build` | Pass |
| `node scripts/prepare-spelling-art.mjs` | Re-derives the five stickers exactly; copies eight files unchanged |

The script tests decode every source and runtime PNG without dependencies. They
check source hashes, opaque RGB/magenta corners, exact pixel reproduction, alpha
values, 2 px clear padding, centering, cream border and dark-outline presence, no
chroma remnants, Frost's white snow surviving, and distinct silhouettes at ~31 px.

**Regression proof.** Before implementation, the new unit tests failed (6 overlay
cases, then 7 including the loader). Deliberate sabotage was detected each time:
keying all near-white pixels (7 failures), keying enclosed pixels (1), the
previous 64 threshold (6), drawing Sunset for every trail (6), skipping sticker
dimension checks (1) and drawing unearned stickers opaque (6). Building main's
runtime with the new tests failed four browser cases: missing and wrong-size
Frost sticker Retry, the Plains route and the six-word fixture.

**Local focused browser run** (Linux, three engines, 4 workers):
`spelling|builder-kit|atlas failure` — 69 cases, **65 passed, 4 failed**. All
four were WebKit routes: three reverse-retrace 35-second deadlines and one
120-second test timeout. Rerun serially, the same four WebKit cases **passed**
(about 75 seconds each). An untouched main archive under the same parallel
filter also failed two WebKit routes (Plains and Quarry) on their 35-second
forward-traversal deadline, before any sticker is drawn: 49 passed, 2 failed of
51. These are WebKit traversal timing under local load, not artwork failures. No
deadline, retry or engine was changed. The full three-engine matrix runs in CI.

## Screenshots

[`capture-manifest.json`](capture-manifest.json) lists source run, case, viewport
and SHA-256 for every file. Screenshots are uncropped full-window captures.

**Live gameplay** (production adventure with its existing input-only pilots;
no scene or session mutation):

| Earned | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| HILL | [Native](chromium-gameplay-plains-earned-426.png) / [Small](chromium-gameplay-plains-earned-320.png) | [Native](firefox-gameplay-plains-earned-426.png) | [Native](webkit-gameplay-plains-earned-426.png) |
| ROCK | [Native](chromium-gameplay-quarry-earned-426.png) / [Small](chromium-gameplay-quarry-earned-320.png) | [Native](firefox-gameplay-quarry-earned-426.png) | [Native](webkit-gameplay-quarry-earned-426.png) |
| TREE | [Native](chromium-gameplay-timbers-earned-426.png) / [Small](chromium-gameplay-timbers-earned-320.png) | [Native](firefox-gameplay-timbers-earned-426.png) | [Native](webkit-gameplay-timbers-earned-426.png) |
| BEAM | [Native](chromium-gameplay-sunset-earned-426.png) / [Small](chromium-gameplay-sunset-earned-320.png) | [Native](firefox-gameplay-sunset-earned-426.png) | [Native](webkit-gameplay-sunset-earned-426.png) |
| SNOW | [Native](chromium-gameplay-frost-earned-426.png) / [Small](chromium-gameplay-frost-earned-320.png) | [Native](firefox-gameplay-frost-earned-426.png) | [Native](webkit-gameplay-frost-earned-426.png) |
| SAND | [Native](chromium-gameplay-cove-earned-426.png) / [Small](chromium-gameplay-cove-earned-320.png) | [Native](firefox-gameplay-cove-earned-426.png) | [Native](webkit-gameplay-cove-earned-426.png) |

WebKit HILL, ROCK, TREE and BEAM come from the passing serial rerun.
Gameplay collection with Plains earned and five unearned:
[native](chromium-gameplay-plains-collection-426.png) /
[small](chromium-gameplay-plains-collection-320.png).

**Renderer fixture, not gameplay:** the existing six-word fixture after earning
all six: [native](chromium-FIXTURE-all-earned-collection-426.png) /
[small](chromium-FIXTURE-all-earned-collection-320.png).

**Asset proof, not gameplay:** [`asset-proof-six-stickers.png`](asset-proof-six-stickers.png)
shows all six runtime PNGs at 4×, native, collection scale, dimmed and 2× on
light and dark backgrounds.

## Review and limits

All screenshots above were inspected. Each trail shows its own sticker, centered
to the right of the tiles, without clipping or overlap; unearned collection
stickers stay distinguishable. The five new stickers share the Sunset sticker's
outline, keyline and cream border, without text or faces. Plains is wider than
the others but recognisable at small size. The new stickers have not yet been
approved by the owner. Owner/child reading comfort and physical-controller
ergonomics remain manual; automated controller input is not a physical-device
test.
