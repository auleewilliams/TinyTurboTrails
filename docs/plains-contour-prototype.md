# Plains contour preview (#239)

Implemented presentation scope is **x580–1060**, aligned to whole existing
segments; this covers the representative x600–1026 area. Continuous terrain is
unchanged. The accepted A centre repeat follows the contour in a cached native
ribbon. Source-ready C2 soil now fills the bounded body beneath contact+8;
original soil remains outside that span. Integrated native/owner acceptance is pending.
Old grass edge is excluded inside the same span. Only the approved bushdeco-002
moves(470,193.5)→(772,206). Flowers remain at240and2530.

Asset/source records and a portable no-network reproduction command are in
[the provenance](../assets/source/plains/contour-prototype-v1/PROVENANCE.md).
PNG bytes and approved one-pixel witness remain exact; rejected B remains
historical. No new generation, crop-based B recovery or whole-trail rollout.

The runtime rounds each authored centre-sampled contact once to the native
pixel grid (≤0.5px), preserving40px repeat grain and all16source rows, then draws
one image at the actual camera offset without smoothing. That avoids seams
between separately antialiased draw strips. Exact integer join-column ownership
is half-open, matching the segment on the right. Original connected soil fill
remains underneath as the base; opaque native C hides its old texture/roots
inside the bounded body and repeats down to the actual viewport bottom. Drawing is isolated to Plains; Quarry shares
the asset bundle but continues its own renderer. Kits without the declared
prototype image retain legacy fixture rendering. Declared-image load/dimension
failures propagate through ordinary accessible Retry loading.

Actual consumers audited: AdventureScene gameplay, `preview()` cached map,
world/gameplay previews, function-string `RENDERER_SOURCE` in browser.spec.ts,
HUD import-stripping fixtures in browser.spec.ts and hud-owner-layout.spec.ts,
map-label stripped fixture, renderer-fixtures unit graphs. New real helpers are
included in those dependency lists. Historical synthetic no-kit seam/material
fixtures remain legacy fixtures; they do not certify new-art raster coverage.
The new focused software test exercises real source pixels/helper; the new
ordinary-input browser pilot separately observes actual cache/image/Henry draws.

`tests/plains-contour-pilot.spec.ts` is a small host-only Chromium journey:
426native then320CSS, actual rest/jump/outward/return crossings, source-bound
observations, whole ribbon alpha coverage, saved canvas and viewport PNGs,
distinct required-grass and required-soil error/Retry journeys. It does not mutate player/world/clock. Dirty evidence
uses sourceRevision:null and exact source/image/served-bundle hashes. No browser
run or visual acceptance is implied by this document. Coordinator owns host
listener/browser execution, publication and fresh whole-PR Claude review.

Current temporary gate exclusions: broad npm test, sprite-processing.test.ts and
finish-grounding.test.ts are not executed by this worker while their Python
invocations are being adjudicated; they are unperformed, not waived or passed.
No script suite is required for this bounded prototype checkpoint.

C2 source/preparation records are in [soil provenance](../assets/source/plains/contour-prototype-v1/soil/PROVENANCE.md); `node scripts/prepare-plains-soil.mjs` verifies the whole1254²→64² source mapping and exact canonical PNG. No C pixel repairs or additional calls; image budget5/5 exhausted. Existing controller jump5s/other20s/case120s/retries0 and all strict route/contact assertions remain. Prior grass-only native passes are historical, not C validation. The unrelated finish-layout full-suite timeout remains open; isolated nonreproduction does not establish cause.
