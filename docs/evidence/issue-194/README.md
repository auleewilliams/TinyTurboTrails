# Approved builder-kit artwork integration

Integrates the owner-approved canvas pouch, reusable blank wooden tile and
Sunset Site hard-hat/beam sticker on merged PR #190,
`bee0f7d402395af8d9ed7a4693e6739d9f905607`.

The shared artwork covers the HUD, pickups, pickup flights, mixed pile, placed
letters and dragged tiles across all six words. Glyphs remain separately
rendered. Sunset alone receives a generated sticker. Other stickers and broader
assembly artwork remain in #194. No simulation, collection, assembly,
missing-letter return, reward, session/reload, terrain or storage rules change.

## Assets and presentation

[Source/provenance and exact prompts](../../../assets/source/spelling/sprites/PROVENANCE.md)
preserve the approved concept, untouched generated images, corrected tile
lineage and reviewed native-size PNGs. Three runtime RGBA files total **11,524
bytes**. `node scripts/prepare-spelling-art.mjs` copies them byte-for-byte after
validating hashes, dimensions and RGBA headers. High-resolution source images
are not loaded by the game.

The pouch is a 28 × 28 cell at `(384, 33)`. Tiles retain the existing 42 × 32
assembly and 22 × 24 pickup/flight footprints. The Sunset sticker is 56 × 56,
centered at the existing reward position, with the existing 0.55 collection
scale. Images are required at startup and use the existing error/Retry boundary.
Focus has an outer frame and caret; a tile in hand retains an inset frame after
focus moves to a space. Empty spaces, native targets, labels, status messages,
flight timing/fade and reduced-motion placement retain their existing behavior.

## Validation and outstanding failures

| Check | Actual result |
| --- | --- |
| `npm ci` | Exact lockfile dependencies; no package changes |
| `npm test` | **870 passed**, 51 files |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm run test:ci` | **8 passed** |
| Asset copy, hashes and dimensions | Pass |
| Required image failure/retry, wrong dimensions, alpha borders and reduced motion | **18/18 passed**, all three engines |
| Six live trail routes, corrected observer, Chromium/Firefox | **12/12 passed**, two workers |
| Six-word renderer/native-control fixture, native/small | **3/3 passed**, all three engines |
| Initial full browser suite | **341 passed / 13 failed**, no skips, 354 cases, 28.6 minutes |
| WebKit serial follow-up | **2 passed / 7 failed**; Timbers' live retrace/assembly passes |

**No clean complete local browser matrix is claimed.** The current catalog has
357 cases, including three visual fixtures added after the broad run. The
runtime JS remained identical across the broad run and follow-ups; its filename
and SHA-256, all browser outcomes and failure messages are in
[`verification.json`](verification.json).

Five Firefox failures in the broad run came from this change's new observer
comparing Canvas opacity with exact equality: Firefox reads 0.3 back as
0.30000001192092896. The assertion now uses a seven-decimal precision tolerance;
all twelve Chromium/Firefox trail routes then pass without changing deadlines,
retries, input or gameplay. The transient Firefox story-controller failure
passes unchanged on both baseline and integrated-build standalone reruns.

The untouched merged baseline was archived into a separate temporary folder,
built with the same lockfile dependencies, and tested with the original tests.
It reproduces the WebKit replay, pause-Tab focus and keyboard-assembly failures
with the same assertions. The pause/keyboard failures also reproduce without
the Firefox environment workaround. A separate unchanged-baseline Sunset run
reproduces the same 35-second reverse-route deadline. Other WebKit trail timing
failures remain unresolved; they are not presented as passing or all attributed
to a proven baseline cause. All original traces and logs are retained.

Browser versions: Chromium 153.0.8010.12, Firefox 155.0 and WebKit 26.6 on macOS
27.0.1. Firefox initially could not select its app-data profile before any page
opened. An isolated temporary app-data root allows the same binary to launch,
consistent with the documented [upstream macOS issue](https://github.com/microsoft/playwright/issues/42768).
No binary, personal profile, repository browser configuration, deadline or retry
was changed for that workaround.

Representative reproduction commands (after building):

```sh
mkdir -p /private/tmp/ttt-194-firefox-data
env CFFIXED_USER_HOME=/private/tmp/ttt-194-firefox-data \
  npm run test:browser -- --workers=2
npm run test:browser -- --workers=1 --project=chromium --project=webkit \
  --grep 'builder-kit visual fixture'
env CFFIXED_USER_HOME=/private/tmp/ttt-194-firefox-data \
  npm run test:browser -- --workers=1 --project=firefox \
  --grep 'builder-kit visual fixture'
```

Full JSON reports, logs and traces are under `/private/tmp/ttt-194-browser-*`,
`/private/tmp/ttt-194-baseline-*` and `/private/tmp/ttt-194-story-head*`.

## Screenshot review

[`capture-manifest.json`](capture-manifest.json) identifies **78 full-window
screenshots**, including source run, case, capture kind, viewport and SHA-256.
Native captures are 426 × 300 (a 426 × 240 logical game plus control space);
small captures are 320 × 240. No screenshots were cropped or retouched.

**Renderer fixtures:** 54 captures use the shipped `EducationSession`,
`EducationOverlay`, tile renderer and `MenuOverlay` source, mechanically stripped
of imports/types for an isolated browser fixture over the normal app host.
Only collected pickup identities are supplied as fixtures; native focus/Enter
places each tile and earns the reward through the actual activity code. No
production hook or copied assembly logic ships. These certify rendering/native
control behavior, not traversal, controller hardware or missing-letter retraces.
They cover all six earned words, TREE's two independent Es, the held B tile after
focus moves to a space, and the collection at both sizes in every engine.

All six words were visually inspected at native and small sizes in every engine.
The shared tile has clear glyph space and consistent scale; repeated letters
remain separate. The Sunset sticker's hat/beam/cream border are recognizable;
no tile, reward or controls overlap or clip. Instruction text at small sizes
still needs owner/child reading-comfort feedback.

| Renderer fixture | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| HILL | [Native](chromium-fixture-plains-earned-426.png) / [Small](chromium-fixture-plains-earned-320.png) | [Native](firefox-fixture-plains-earned-426.png) / [Small](firefox-fixture-plains-earned-320.png) | [Native](webkit-fixture-plains-earned-426.png) / [Small](webkit-fixture-plains-earned-320.png) |
| ROCK | [Native](chromium-fixture-quarry-earned-426.png) / [Small](chromium-fixture-quarry-earned-320.png) | [Native](firefox-fixture-quarry-earned-426.png) / [Small](firefox-fixture-quarry-earned-320.png) | [Native](webkit-fixture-quarry-earned-426.png) / [Small](webkit-fixture-quarry-earned-320.png) |
| TREE | [Native](chromium-fixture-timbers-earned-426.png) / [Small](chromium-fixture-timbers-earned-320.png) | [Native](firefox-fixture-timbers-earned-426.png) / [Small](firefox-fixture-timbers-earned-320.png) | [Native](webkit-fixture-timbers-earned-426.png) / [Small](webkit-fixture-timbers-earned-320.png) |
| BEAM | [Native](chromium-fixture-sunset-earned-426.png) / [Small](chromium-fixture-sunset-earned-320.png) | [Native](firefox-fixture-sunset-earned-426.png) / [Small](firefox-fixture-sunset-earned-320.png) | [Native](webkit-fixture-sunset-earned-426.png) / [Small](webkit-fixture-sunset-earned-320.png) |
| SNOW | [Native](chromium-fixture-frost-earned-426.png) / [Small](chromium-fixture-frost-earned-320.png) | [Native](firefox-fixture-frost-earned-426.png) / [Small](firefox-fixture-frost-earned-320.png) | [Native](webkit-fixture-frost-earned-426.png) / [Small](webkit-fixture-frost-earned-320.png) |
| SAND | [Native](chromium-fixture-cove-earned-426.png) / [Small](chromium-fixture-cove-earned-320.png) | [Native](firefox-fixture-cove-earned-426.png) / [Small](firefox-fixture-cove-earned-320.png) | [Native](webkit-fixture-cove-earned-426.png) / [Small](webkit-fixture-cove-earned-320.png) |
| TREE mixed pile | [Native](chromium-fixture-timbers-mixed-pile-426.png) / [Small](chromium-fixture-timbers-mixed-pile-320.png) | [Native](firefox-fixture-timbers-mixed-pile-426.png) / [Small](firefox-fixture-timbers-mixed-pile-320.png) | [Native](webkit-fixture-timbers-mixed-pile-426.png) / [Small](webkit-fixture-timbers-mixed-pile-320.png) |
| Held B / focused space | [Native](chromium-fixture-sunset-held-426.png) / [Small](chromium-fixture-sunset-held-320.png) | [Native](firefox-fixture-sunset-held-426.png) / [Small](firefox-fixture-sunset-held-320.png) | [Native](webkit-fixture-sunset-held-426.png) / [Small](webkit-fixture-sunset-held-320.png) |
| Collection | [Native](chromium-fixture-all-collection-426.png) / [Small](chromium-fixture-all-collection-320.png) | [Native](firefox-fixture-all-collection-426.png) / [Small](firefox-fixture-all-collection-320.png) | [Native](webkit-fixture-all-collection-426.png) / [Small](webkit-fixture-all-collection-320.png) |

**Live input:** 24 captures come from the actual production adventure using its
existing input-only pilots, without scene/player/session mutation: the HUD,
ordinary flight and reduced-motion cue in every engine; earned Sunset in
Chromium/Firefox; and earned TREE in WebKit. Passing Chromium/Firefox routes
also verify partial-work return, independent stickers, replay retention,
reload reset and no page errors. WebKit's successful Timbers route uses the
standard Gamepad API. Existing WebKit pointer/controller TREE cases also pass
in the broad run; the keyboard case remains a baseline-reproduced failure.

| Live production capture | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| HUD pouch | [Native](chromium-timbers-bag-426.png) / [Small](chromium-timbers-bag-320.png) | [Native](firefox-timbers-bag-426.png) / [Small](firefox-timbers-bag-320.png) | [Native](webkit-timbers-bag-426.png) / [Small](webkit-timbers-bag-320.png) |
| Pickup flight | [Native](chromium-timbers-pickup-flight-426.png) / [Small](chromium-timbers-pickup-flight-320.png) | [Native](firefox-timbers-pickup-flight-426.png) / [Small](firefox-timbers-pickup-flight-320.png) | [Native](webkit-timbers-pickup-flight-426.png) / [Small](webkit-timbers-pickup-flight-320.png) |
| Reduced-motion cue | [Native](chromium-timbers-reduced-motion-426.png) / [Small](chromium-timbers-reduced-motion-320.png) | [Native](firefox-timbers-reduced-motion-426.png) / [Small](firefox-timbers-reduced-motion-320.png) | [Native](webkit-timbers-reduced-motion-426.png) / [Small](webkit-timbers-reduced-motion-320.png) |
| Earned reward | [Sunset native](chromium-sunset-earned-426.png) / [Small](chromium-sunset-earned-320.png) | [Sunset native](firefox-sunset-earned-426.png) / [Small](firefox-sunset-earned-320.png) | [TREE native](webkit-timbers-earned-426.png) / [Small](webkit-timbers-earned-320.png) |

## Acceptance boundary

The concept and prepared sprites were owner-approved before integration. The
implementation is reviewable, but the draft PR retains the outstanding WebKit
regression results for triage and CI. These checks do not replace owner/child
in-game reading comfort, enjoyment or physical-controller ergonomics. Issue
#194 remains open for that feedback and the remaining artwork discussion.
No merge or deployment was performed. Three unrelated issue #162 screenshots
rewritten by existing tests were restored and are excluded from this change.
