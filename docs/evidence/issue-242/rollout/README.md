# Sunset steel whole-trail rollout

Owner approved the integrated preview for rollout using the same components,
after the alpha/contact and mirrored-repeat review findings were presented.
This implements that rollout. It is not final whole-trail owner acceptance.

## Coverage and preservation

- All39fixed supports map exactly once into31complete joined steel runs;
  the existing moving ferry is the40th support. The production
  [manifest](../../../../public/assets/site/steel-v1/manifest.json) lists every
  original support ID, whole-run bounds and image. No run falls back to legacy
  artwork when the production kit is loaded.
- All five terrain segments are covered by `ground-full.png` at3120×1064,
  including both steep gap walls and the below-world pit floor. No material
  crosses above the authored contour or bridges the recovery gap.
- All38approved gems now move down exactly2px. The other24gems stay in their
  original positions. Full level-data equality against the immutable baseline,
  minus this exact38-ID exception, preserves every other field.
- All eight accepted preview PNG files remain byte-identical. The full ground
  bitmap contains the exact RGBA pixels of the980px-wide accepted left bank;
  its original `ground.png` is retained as the frozen acceptance reference.
  Source images, scale, cap/centre cells, faint alpha fringe and mirrored repeats
  are unchanged. No new generation calls: four spent, two reserves unused.
- Thirty-three runtime PNGs and their manifest are required loading resources.
  Every required image has failure/Retry coverage; the retained narrow ground
  reference is evidence, not an additional runtime request.
- Shared assets, other trails, scenery, support/collision geometry, ferry motion,
  checkpoints, BEAM, rewards, physics, camera and controls remain unchanged.

The [acceptance record](../../../../assets/source/site/steel-v1/accepted-preview/acceptance.json)
and frozen preview metadata are separate from the new
[rollout source projection](../../../../assets/source/site/steel-v1/rollout-preservation.json).
Historical preservation records and failed reports are not rewritten.

## Verification

- `npm test`:1,951pass across98files on the final candidate (an earlier rollout
  run passed1,950 before the required-declaration guard test). These passes do not establish a cause,
  fix or waiver for the earlier five local finish-layout deadlines or gem0 repeat.
- `npm run test:ci`:103pass, including a check of every full-ground alpha pixel
  against the original terrain contour, all frozen preview bytes/pixels, exact
  regenerated RGBA/CRC/dimensions, source hashes and same-encoder determinism.
- `npm run typecheck` and `npm run build`:pass.
- Focused affected units:29pass across5files before the complete unit run.
- Three-engine ordinary-input captures and critical existing crane/wall-contact
  cases passed24tests. Another24loading/shared-UI cases passed across all engines.
  The new complete main-route captures include normal426px
  and reduced-motion320px play, real Pause pixel stability, the roof and finish.
- A final loading audit made the production Sunset declaration itself mandatory,
  closing a possible legacy fallback from an old/missing kit field. Missing/invalid
  fields are rejected before images load. Final three-engine complete-route and
  ordinary-Retry witnesses passed all nine cases after that guard; the earlier
  reports remain bound to their original source hashes and are not rewritten.
  [The final Chromium owner gallery](../rollout-capture/gallery.json) contains
  eighteen native/CSS observation pairs from actual complete-route input.
  All three engines' case results are in the separate validation ledger.
- Exact-current-head CI, artifact readback, fresh Claude whole-PR review and final
  owner playtest acceptance remain outstanding.

Logs are retained losslessly with decoded hashes in [logs.json](logs.json).
Native input evidence uses actual rendering and DOM keyboard events, not physical
hardware or owner-enjoyment certification.
