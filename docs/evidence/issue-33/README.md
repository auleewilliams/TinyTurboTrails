# Sunset Site — issue #33

Chromium 1280×720 frames from the built game (`npm run build`, `vite preview`), each taken while
holding Right on the Sunset Site route, after choosing it with Left from the Plains title.

- `chromium-title-picker.png`: the title picker reading SUNSET SITE (the title still draws the
  level the scene was constructed with, as it does for Quarry Run).
- `chromium-start.png`, `-girders`, `-yard`, `-trench`, `-scaffold`, `-summit`: one frame per
  section. The yard frame shows the crane ferry's dotted path above the paired hazards.

## Known limitations

- These screenshots preserve the original issue #33 state. Issue #85 supersedes
  their reused-Plains artwork with a dedicated construction atlas containing
  girders, a cone-and-cement-mixer hazard and pneumatic jacks. Current evidence
  lives under `docs/evidence/issue-85/`.
- Long shadows are not drawn; the low sun and warm palette carry the sunset feel.
- Firsthand six-year-old hazard/readability playtesting was outstanding at
  implementation time. The owner subsequently confirmed completion; see the
  [issue #85 playtest record](../issue-85/playtest.md).

## Validation

Linux, Node 22.22.1, Playwright 1.63.0 (Chromium, Firefox, WebKit).

- `npm run typecheck`, `npm test` (316 passed) and `npm run build`: passed.
- Browser suite against this build on a private port (another checkout held 4173): 91 passed,
  1 skipped (the existing Firefox native-audio probe), 1 failed — the WebKit terrain-join pixel
  test hit its 30 s timeout under parallel load and passed alone in 18 s on rerun.
- Independent review found the last summit slime landing inside the second pit's spring landing
  zone (a knockback sent Henry back into the pit). The slime now patrols 9740–9800, and the
  hold-Right and bonus-gem tests fail on any respawn, which caught the old placement.
