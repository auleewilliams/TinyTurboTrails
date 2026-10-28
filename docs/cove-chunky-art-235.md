# Sandy Cove illustrated terrain pilot (#235)

This pilot replaces Cove's sandy terrain and seven fixed stone-platform visuals with a modular kit derived from two original generated sheets. Terrain, collision tops/widths, movement, camera, water, gems, letters, checkpoints, spring and finish/session behavior are unchanged. It references [issue #235](https://github.com/auleewilliams/TinyTurboTrails/issues/235); owner visual acceptance remains open. This is not approval to roll the kit out to other trails or merge it.

## Source and preparation

Canonical originals, the verbatim actual generation record, measured crops and prepared atlas live in `assets/source/cove/terrain-kit/`. The record contains the executed prompts, provider/model/request IDs and both actual references. The earlier `ground-generation-prompt.txt` draft was not the executed prompt and is not copied as provenance.

| Source | Original SHA256 | Dimensions and provider discrepancies |
| --- | --- | --- |
| Ground | `d61a31eae616e347ba0e10182d37355d16b39733db93bdd077cc64a795825bb2` | Actual 1536×1024; requested quality medium, reported low |
| Platform | `ed16a3fbdfe9ece989c83a1c1f1eb2c9eeb47499150ce43335660575650e1f96` | Prompt says 1024×512; tool requested_size says 1536×1024; actual/reported 1774×887, quality medium |

The opaque magenta originals are not transparent assets. Preparation removes only edge-connected chroma using the established `removeEdgeKey` primitive, then downsamples explicit measured crops with `modeDownsample`. Pale cream/sand is retained; no white/luminance key, painted replacement texture or auto-fit/centering is used. Native caps are cropped inward past rounded unsupported top corners. Thin pieces come from the independently painted top row, not squeezed regular rocks. All sources and every crop are checked before writes; source/output/pixel hashes and removal counts are recorded. Existing artwork and its provenance remain byte-for-byte pinned in `preserved-files.json`.

```sh
# Reproduce/verify existing pixels and write runtime copies.
node scripts/prepare-cove-terrain.mjs

# Independently reproduce in the task's assigned scratch root.
node scripts/prepare-cove-terrain.mjs --output-dir "$TMPDIR/cove-reproduction"

# Only after intentionally changing measured preparation data:
node scripts/prepare-cove-terrain.mjs --regenerate

# Actual prepared-pixel, source hash, geometry and metadata regressions.
node scripts/prepare-cove-terrain.test.mjs

# Native/small light/dark asset and contour/underpass unit compositions.
node scripts/prove-cove-terrain.mjs "$TMPDIR/cove-unit-proofs"
```

The proof command emits PNGs plus a hash ledger using actual production-helper draw operations and a small software rasterizer. They are labeled **asset/unit compositions**, not browser screenshots, played routes, browser antialiasing certification or owner acceptance. It draws no replacement texture. Background colors and composition placement are diagnostic only.

## Rendering and constraints

`public/assets/cove/manifest.json` declares a required `terrain-kit/manifest.json`. The loader checks version, native piece dimensions, bounds/non-overlap and actual atlas dimensions. A failed metadata/image load or validation exposes the existing Retry flow; no failed kit promise is cached. Other world manifests do not declare or load this kit; optional shared material/backdrop loading remains optional.

Continuous ground keeps its original connected contour clip. A world-anchored 64px material repeat fills it; mirrored neighbours share exact original boundary pixels. Lip columns and junctions shear to the actual slope. Cliff/end pieces remain inward of world bounds. The existing 8px sand/water cues still render above the art with unchanged extents and mechanics. Ordinary sandy-looking terrain does not gain sand slowdown.

Platform caps stay inside supported X. Native 16px caps and 32px centres repeat/crop in columns; no full block is stretched. Top row zero matches the collision Y with complete opaque top coverage. Maximum total depth is 6px for the hollow and first two pool stones, 12px for the other pool stone and three bay ledges. These budgets include the top rim and underside; they do not change the nominal 10px one-way collision slabs.

The hollow's right slope tapers art by `min(6,max(1,floor(groundY-platformY-42)))`. Henry's actual idle/run pixels reach about 40px above his feet, versus his 34px collision body. At the shelf tip there is already no separate visual head gap: the remaining one-pixel rim can meet his silhouette, and Henry continues to paint over it. This does not claim nonexistent clearance. The bay's second ledge stays at 12px to leave the low gem and lower shoreline visible. All kit art paints before entities and Henry, never as a new foreground occluder.

## Entry points and checks

The shared renderer/loader serves gameplay, the cached map preview and diagnostic world/gameplay previews. The cached preview retains zero-time platform bodies, initial camera framing, its actual source canvas and cache equality. Its observer now detects real kit columns and all seven support positions, replacing the retired rectangle-color assumption. Case titles, route assertions, clocks, frame budgets, timeouts, retries and engines are retained.

Manual function-string renderer fixtures include the real Cove helper graph and loader, including the finish-art and weather compositions. HUD/map strip-import bundles include the actual module, with their missing-symbol guards retained. The builder-kit bundle does not use the terrain renderer; its dependency checks remain intact. Added native/narrow input tests capture the underpass, shelf tip, stones, upper landing before stepping off and reverse bank, and assert kit art stays before Henry. Added browser cases exercise required kit metadata/image Retry. These additions still need actual browser execution.

The coordinator's unchanged-base Chromium cohort at `bd43c7b43a58864e4a277c4298ae168567a6611e` passed the two lower-route widths and all-42/upper-return/spring case: three expected passes, one attempt each, no retries/skips/flaky results, 35 decoded PNGs and 120 observed HTTP bodies bound to the actual build. Native captures are 426×240; narrow locator images are 320×181 at browser 320×240, with the logical canvas still 426×240. These certify only the baseline, not this candidate.

Local candidate browser execution is restricted and was not retried through another route. Full Chromium/Firefox/WebKit route, preview, fixture, seam/occlusion and Retry validation belongs to exact-candidate CI. Broad local unit/script commands must be reported with their actual outcomes: in the implementation environment existing synchronous child-process tests can fail with EPERM. A passing build or asset proof does not replace those gates. Fresh opposite-family review and owner inspection of actual candidate gameplay remain required before acceptance.
