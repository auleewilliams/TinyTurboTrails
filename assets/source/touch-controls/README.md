# Tablet control provenance

Issue [#251](https://github.com/auleewilliams/TinyTurboTrails/issues/251) authorizes
the tablet prototype. The initial physical target is a 13-inch iPad Air, using
landscape orientation and Safari as the proposed browser.

No new raster artwork was generated, modified or downloaded. The DOM controls
reuse `public/assets/interface/button.png` and `button-selected.png`, prepared
from the existing illustrated interface kit. Direction and jump symbols are text.
The original interface provenance remains in `assets/source/interface/`.

`presentation.json` records the exact input, layout and instruction changes
against revision `b67369e7c2c0b488c096d5933b1df8a9024d4ee9`. Historical artwork
checks project only those exact complete file identities back through the recorded
reversible changes. Existing asset, physics and world pins remain unchanged;
corrupt or unrelated source changes reach their original oracles unchanged.

The new touch adapter and its input/browser tests verify the new behavior
separately. Physical-device usability and performance are not inferred from
automated browser coverage. See `docs/evidence/issue-251/` for captures and results.

## Bottom-corner overlay revision (2026-11-16)

The owner-approved follow-up fits the largest complete camera inside the existing
safe area without reserving a footer. Left/right overlay its bottom-left corner;
Jump overlays its bottom-right. The original button assets are used on translucent
pseudo-element backgrounds so icons remain opaque. Held backgrounds are stronger.
The bottom-centre stays unobstructed by utility buttons or a full-width panel.
Pause and Touch use the natural lower-right letterbox when the stack fits;
otherwise an upper-right dock stays below the HUD during play and uses the top
strip during menus/activities.

`overlay-presentation.json` records only the exact layout and browser-observer
changes against shipped v0.2.0 (`ee0708f3fe4cad519b4143b7ef8379ccb9b35516`).
The separate pinned overlay layer reverses to those shipped bytes before the
unchanged original `presentation.json` layer runs. Historical source pins and
dated mockups, failed runs and authentication receipts retain their original meaning.

This deliberately permits corner occlusion. At the implementation checkpoint,
native captures were pending and the original whole-change review was BLOCKED
on utility placement; the correction and strengthened native geometry/style checks
then awaited coordinator review and browser execution. This describes that
historical checkpoint. Historical footer captures do not depict this revision.
Native screenshots do not establish physical iPad or real-thumb acceptance,
which remains unverified. For current results, scope and acceptance, see
[issue #251](https://github.com/auleewilliams/TinyTurboTrails/issues/251).
