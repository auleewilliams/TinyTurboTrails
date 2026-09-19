# Sunset Site construction art — issue #85

Chromium 1280 × 720 frames from the production build. Compare these with the
reused-Plains frames under `docs/evidence/issue-33/`:

- `chromium-start.png`: dedicated scaffold scenery and transparent construction
  skyline at the Site gate.
- `chromium-hazards.png`: two cone/mixer warning clusters on the girder deck;
  flashing beacons, barricade stripes and cones distinguish them from the low
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
firsthand six-year-old playtest. That manual playtest remains outstanding.

## Validation

Linux, Node 22.22.1, Playwright 1.63.0.

- `npm run typecheck`, `npm test` (319 passed), and `npm run build`: passed.
- Full browser matrix with one worker (`npx playwright test --workers=1`):
  92 passed and 1 skipped (the existing Firefox native-audio probe). This
  serialized run avoids the repository's known parallel-load timeouts; the
  Site picker/loading and gameplay checks passed in Chromium, Firefox and
  WebKit.
