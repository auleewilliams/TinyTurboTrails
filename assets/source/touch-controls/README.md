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
