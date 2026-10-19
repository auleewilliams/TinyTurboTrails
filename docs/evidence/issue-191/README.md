# Interim pass-through obstacle props — #191 / PR #190

## Agreed behaviour

The owner explicitly chose an interim rule: static obstacle props behave like
trees and other pass-through scenery throughout all six trails. They do not
cause damage, knockback, a damage flash, invulnerability, damage sound/rumble,
blocking or a standable top. Keep every prop's artwork, placement, ID and render
layer. The original sawhorse's yellow/black stripes are unchanged.

All added ground brackets/striped footprints were removed in `5d3dcaf`, including
their addition-specific tests, documentation and rejected captures. They remain
absent. Finish grounding from the [separate root-cause audit](../issue-189/visual-clarity/README.md)
is retained. Slime contact damage and top-squash rules, pits, terrain, springs,
checkpoints, crumbling ledges and moving platforms are unchanged.

Solid/jump-required/standable obstacles are **not** implemented or agreed.
Issue #191 is deliberately left open for the future owner-led design review.

## Exact inventory and implementation seam

The shared `stepEntities` contact resolver was the only damage path for static
props. The `hazard` authoring tag remains for stable IDs/art/layers, but no longer
enters the damage branch; only unsquashed slimes do. Terrain/platform collision
never used these props, so no collision bodies or geometry needed modification.
Keeping the authoring tag also avoids accidentally routing existing stone props
through decoration-specific sprite substitution.

| Trail | Legacy `hazard` obstacle props | Existing decorative props |
| --- | ---: | ---: |
| Plains | 6 | 12 |
| Quarry | 9 | 13 |
| Timbers | 7 | 11 |
| Sunset | 8 | 12 |
| Frost | 6 | 12 |
| Cove | 0 (already scenery-only) | 12 |
| Total | 36 | 72 |

[Machine-collected IDs](static-prop-inventory.json) come from the actual `LEVELS`
import used by the browser suite. Cove's coverage is not a vacuous empty loop:
its twelve scenery props are tested and its three slimes remain independently
subject to the same slime rules.

## Executed verification

- Test-first static contact: the five trails containing legacy obstacle tags
  failed on actual unwanted `damage` events before the fix; Cove already passed.
  The minimal shared resolver change made all six pass. Restoring the exact old
  damage condition made **10 of 18** contact/movement/positive-control cases fail;
  the six slime controls and two already-safe Cove cases still passed. Restoring
  the fix returned all eighteen to green.
- Eighteen new unit cases cover every actual static obstacle **and** scenery prop
  in every trail, sustained frame-by-frame movement versus the same terrain with
  no props, and positive slime-side damage/knockback/flash/protection controls in
  every trail. These use isolated local entity lists to attribute contact effects;
  the movement comparison retains the original terrain. The Sunset end-of-world
  prop is correctly bounded by the unchanged world clamp, not a fabricated exit.
- Existing last-heart recovery cases in both gameplay scenes now use a real slime
  instead of a newly harmless prop. Damage sound/rumble pairing likewise remains
  named slime coverage; a separate static-prop case asserts no damage output.
  Existing squash suites remain intact.
- Sunset's scripted run became 45.6167 seconds when prop damage disappeared.
  Its obsolete 50-second punishment-dependent minimum was replaced by the actual
  route distance / maximum-speed lower bound. Finish, checkpoints, springs,
  remaining slime damage, recovery bounds, gem reachability and totals stay
  asserted; no gameplay speed or layout was changed to satisfy a test.
- `npm test`: **833 passed**, 48 files. Typecheck/build passed; script tests **8 passed**.
- New/focused Chromium/Firefox/WebKit checks: **9/9 passed**, zero skips/failures:
  three finish-pixel ground checks, three real-keyboard static-passage/slime-damage
  checks, and three existing standard-controller damage-rumble cases. The
  passage test first failed against the pre-change production build because a
  heart was lost at the sawhorse, then passed against the new build in all engines.
- The browser passage test sends no jump input: it walks across Timbers x=750
  and beyond x=820 with three full hearts, then observes loss/flash of a heart
  on the first slime-side encounter. It uses the existing accelerated-clock
  input pilot, **not** a native-time human playtest or scene teleport.
- Independent final review and full final-head CI are reported live in PR #190.
  Superseded marker/removal-only head results are not current-head acceptance.

## Genuine native/small evidence

- Chromium: [426px](chromium-static-prop-passage-426.png),
  [320px](chromium-static-prop-passage-320.png).
- Firefox: [426px](firefox-static-prop-passage-426.png),
  [320px](firefox-static-prop-passage-320.png).
- WebKit: [426px](webkit-static-prop-passage-426.png),
  [320px](webkit-static-prop-passage-320.png).

All are actual gameplay captures, inspected for original sprite preservation,
absence of rejected additions, and full hearts during passage. Artwork remains
visually ambiguous by design pending #191; these images do not establish child
comprehension or endorse any future solid-obstacle design.

Complete logs and diagnostics are outside the repository at
`/home/leew/.hermes/cache/scratch/issue189-visual-fixes`. No merge or deployment.
