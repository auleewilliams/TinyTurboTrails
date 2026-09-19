# Sunset Site construction art — issue #85

## Acceptance reconciliation — 2026-09-19

Reviewed main `93e7b45b36dd377b4a4b0bb4aac11dd97ffe71a8` against
[issue #85](https://github.com/auleewilliams/TinyTurboTrails/issues/85) and its
2026-09-19 follow-up. The implementation shipped in
[PR #84](https://github.com/auleewilliams/TinyTurboTrails/pull/84), commit
`c88fd61af4f69c932225a54ae6c52f1b27f21073`. The original issue description is
historical: Sunset Site no longer reuses Plains artwork. Keep #85 open until
the pending acceptance below is recorded or explicitly moved to a follow-up.

| Acceptance item | Status and evidence |
| --- | --- |
| Dedicated Site world atlas | Complete. [Level data](../../../src/world/sunset-site.ts) selects `site`, textured girders and `hills` parallax. [Manifest](../../../public/assets/site/manifest.json) defines all 16 shared roles. Henry and the HUD remain shared; terrain fill and the sun are drawn by the renderer. |
| Plains and Quarry remain pixel-identical | Code/asset review supports preservation: PR #84 changed no Plains assets or existing Plains/Quarry definitions, and its renderer addition is conditional on `theme.sun`. No matched before/after pixel comparison for these two routes is recorded here, so the strict visual claim remains unverified. |
| Hazard, jack and safe scenery readable to a six-year-old | **Complete by owner confirmation, 2026-09-19:** “playtest complete, looking good,” in response to the explicit hazard/jack/safe-scenery question. See the [playtest record](playtest.md); detailed session observations were not supplied. |
| Sprites sit on terrain | Implementation and existing screenshots checked. [Asset tests](../../../tests/world-assets.test.ts) verify anchors; [processor tests](../../../tests/sprite-processing.test.ts) verify visible bases on row 43; [level tests](../../../tests/sunset-site.test.ts) verify surface placement and jack ledge clearance. Site deliberately uses checkpoint anchor `{ x: 24, y: 44 }`, matching its own centered artwork, rather than Plains' x=20. The owner has confirmed the associated child-readability playtest; see the record above. |
| Source, provenance, requirements and docs committed | Complete. [Provenance](../../../assets/source/site/PROVENANCE.md), [requirements](../../REQUIREMENTS.md), [art guide](../../art/README.md), [adventure guide](../../plains-adventure.md) and [original level evidence](../issue-33/README.md) already describe the shipped art. |
| Automated checks and before/after evidence | Implementation-run results and screenshots are preserved below. These are historical results, not a fresh full-matrix certification of current main. |

The loading work is also complete: `src/main.ts` preloads the unique registered
atlases through `loadWorldAssetMap`, exposes loading/error/reload UI, and passes
the map to `AdventureScene`, which selects by `level.atlas`. Loading happens
before the picker; selecting a level does not perform another network load.
The fixed 16-name tuple is intentionally retained as a role contract; Site's
`stone` is the cone/mixer cluster and `spring` is the pneumatic jack. Adding
names is unnecessary for this biome.

Remaining terrain treatment belongs to
[#87](https://github.com/auleewilliams/TinyTurboTrails/issues/87), deployed
asset-cache correctness to
[#99](https://github.com/auleewilliams/TinyTurboTrails/issues/99), and broader
current-versus-historical documentation cleanup to
[#95](https://github.com/auleewilliams/TinyTurboTrails/issues/95). This record
reconciles #85 without claiming those tasks are complete.

### Reconciliation validation

- Focused current-main checks: `npm test -- tests/world-assets.test.ts tests/sprite-processing.test.ts tests/sunset-site.test.ts tests/renderer.test.ts` — 111 passed across four files. The initial sandbox run blocked Python subprocesses with `EPERM`; the unrestricted rerun passed.
- Reprocessed the committed Site source using the provenance command with a temporary destination; `cmp` confirmed byte-identical runtime PNG output.
- Checked relative Markdown links in the reconciliation documents and ran `git diff --check`; passed.
- Independent subagent review found no blocking issues in the reconciliation.
- This follow-up changes documentation only. No new artwork, runtime changes, screenshots or full browser-matrix results are claimed.

## Historical implementation screenshots (PR #84)

Chromium 1280 × 720 frames from the production build. Compare these with the
reused-Plains frames under `docs/evidence/issue-33/`:

- `chromium-start.png`: dedicated scaffold scenery and transparent construction
  skyline at the Site gate.
- `chromium-hazards.png`: two cone/mixer warning clusters on the girder deck;
  bright beacons, barricade stripes and cones distinguish them from the low
  bush scenery.
- `chromium-jacks.png`: pneumatic jack at the trench lip, with a large upward
  arrow, piston and hazard-striped base communicating its bounce role.
- `chromium-scaffold.png`: planted checkpoint, harmless scrub and scaffold
  scenery in the climb section.
- `chromium-finish-arch.png`: meaningful-alpha grounding for the cement slime
  and 2× finish arch after fringe-alpha normalization.

The source sheet, both exact built-in-generator prompts and processing record
are under `assets/source/site/`. The 192 × 192 runtime atlas and manifest are
under `public/assets/site/`; bottom-planted sprites use `{ x: 24, y: 44 }` so
their meaningful-alpha row-43 base meets the terrain. The processor discards
generated alpha below 128 so invisible fringe cannot falsify this check.

Automated/native-scale review confirms separate hazard, jack and scenery
silhouettes, but it is not a substitute for the acceptance criterion's
firsthand six-year-old playtest. That playtest was outstanding at implementation
time; the owner subsequently confirmed completion in the [playtest record](playtest.md).

## Historical implementation validation (PR #84)

Linux, Node 22.22.1, Playwright 1.63.0.

- `npm run typecheck`, `npm test` (385 passed), and `npm run build`: passed.
- Full browser matrix with one worker (`npx playwright test --workers=1`):
  104 passed and 1 skipped (the existing Firefox native-audio probe). This
  serialized run avoids the repository's known parallel-load timeouts; the
  Site picker/loading, terrain-atlas and gameplay checks passed in Chromium, Firefox and
  WebKit.
- After review enabled the previously omitted girder terrain layer, the focused
  Site terrain-atlas regression passed in Chromium, Firefox and WebKit; all five
  screenshots above were recaptured from that corrected production build.
