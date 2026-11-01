This namespace records only the owner-authorized shared HUD presentation change,
separately from all Cove B source-art/crop/repair records. No image bytes change.
The two baseline files are exact pre-phase15 current sources at HEADbe0e8ec plus
its already approved water-landing presentation. presentation.json stores only
exact unique literal deltas for src/game/hud.ts and src/game/adventure-scene.ts.
scripts/hud-owner-preservation.mjs pins the record SHA, baseline hashes, current
hashes and exact two-file path set, reconstructs the entire current source, and
returns the baseline only on exact byte equality. Unrelated or missing changes
reject. This reversal runs before the existing bay1/water/material/terrain
historical oracles; none of their catalogs or original records are rewritten.

The scene delta is solely its HUD import and the two letter-flight destination
expressions. The HUD delta removes only the intro legend/scheduler and relocates
the shared bag children/notice through explicit anchors. Existing world/physics,
input, collection timing, art and source pixels remain outside this exception.
Positive and adversarial controls are in scripts/hud-owner-preservation.test.mjs.
