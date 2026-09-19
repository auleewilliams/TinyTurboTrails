# Gameplay clarity and forgiving recovery — #89, #90, #91

The implementation uses current main `2a52a23` as its base. These screenshots
show the actual scene renderer and shipped assets, inspected at native resolution
and in real native/integer/small browser windows. No production test hooks or new
illustrated assets were added.

## Visual evidence

- [Native HUD](chromium-native-hud.png), [2× integer HUD](webkit-integer-hud.png)
- [Native controller pause](firefox-native-controller-pause.png),
  [360×240 keyboard pause](webkit-small-keyboard-pause.png)
- [Airborne checkpoint, Plains](chromium-level-0-checkpoint.png),
  [Sunset Site](chromium-level-3-checkpoint.png),
  [Frost Ridge](webkit-level-4-checkpoint.png)
- [Gem pickup, Sandy Cove](chromium-level-5-gem.png),
  [landing dust, Sunset Site](chromium-level-3-landing.png),
  [spring release, Quarry](chromium-level-1-spring.png),
  [damage tint, Frost Ridge](chromium-level-4-damage.png)
- [Reduced-motion protection](webkit-reduced-motion.png)

`*-level-N-checkpoint.png` covers all six levels in Chromium, Firefox and WebKit.
N=0 Plains, 1 Quarry Run, 2 Treetop Timbers, 3 Sunset Site, 4 Frost Ridge, 5 Sandy Cove.
`chromium-level-N-{gem,landing,spring,damage}.png` covers every effect/palette;
Firefox and WebKit also cover the four effects on Plains. Checkpoint captures
stage an airborne pass and a double-digit HUD total. Effect captures use real
contacts/landings and assert the corresponding event occurred. The landing fixture
places Henry just above actual terrain with downward velocity 300px/s.

The capture script also verifies checkpoint recovery with gems retained and health
refilled, render-only freeze, replay clearing state, and the reduced-motion spring
branch. Native/controller/small screenshots use the actual application input and
pause flow, including keyboard resume after controller pause.

## Reproduce

With Node 22.12+, install dependencies and Playwright browsers, then run:

```sh
npm run dev -- --port 4174 --strictPort
# In another terminal:
node docs/evidence/issues-89-91/capture.mjs
```

`results.json` records three-browser checks and a 300-render CPU draw-submission
benchmark after warmup, comparing zero effects against the maximum 24 gem effects.
These are host measurements, not GPU frame-time or physical-device guarantees.
The measured added cost is 0.51ms Chromium, 0.82ms Firefox and 1.33ms WebKit
on this host (total render submission at the cap: 1.24–2.62ms); effect counts and lifetimes are bounded regardless of frame rate.

## Validation and review

- `npm test`: 472 passed (27 files).
- `npm run typecheck` and `npm run build`: passed.
- Focused browser validation: 12 passed across Chromium, Firefox and WebKit.
- Complete browser suite and remote CI: final results recorded in the PR.
- Correctness reviewer independently ran 113 focused tests and found no substantive
  implementation issues. Its suggested per-checkpoint position assertion was added.
- UI reviewer inspected all checkpoint palettes, effect captures, native/integer/
  small viewports and pause surfaces. Its evidence findings were resolved by
  capturing actual landing events and expanding effects across all six palettes.

Initial validation exposed outdated square-pip/keyboard-pause assertions, which
were replaced with heart-pixel and active-input assertions. WebKit's unsupported
canvas filter was a real rendering defect: the final implementation uses a cached
alpha-clipped tint canvas instead. Native review also separated status text from
Mute; a follow-up correctness review moved Retry above the status row.

Controllers are exercised through injected standard Gamepad API states, not a
physical controller. The existing native AudioContext test may skip when the host
has no usable audio backend; the final PR reports the exact skips. Browser engines
are Playwright Chromium/Firefox/WebKit on Linux, not physical macOS Safari.
