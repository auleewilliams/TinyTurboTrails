# Tiny Turbo Trails

A sidescrolling 16-bit platformer for Henry. This is the **certified first
playable release**: it includes the Plains and Quarry Run worlds, Henry's
starter art, movement, gems, hazards, checkpoints, local music/effects and a
title-to-adventure shell with a level picker. Release certification (issue #8) is closed; see
[Verification](#verification) below for what was checked and what was
deliberately waived.

## Run locally

Install Node.js 22.12 or newer (Node 22 LTS is used in CI), then:

```sh
git clone https://github.com/auleewilliams/TinyTurboTrails.git
cd TinyTurboTrails
npm ci
npm run dev
```

Open the URL printed by Vite with `?scene=adventure` appended (normally
`http://127.0.0.1:5173/?scene=adventure`). Use **Left/Right** to choose Plains
or Quarry Run, then press **Space** or the controller’s **primary face button**
to start. The bare `/` URL opens a diagnostic screen.
Stop the server with Ctrl+C. An adult must start the server and open the adventure
page for Henry; public hosting is out of scope.
No credentials, backend or image-generation service are needed to run the app.

```sh
npm run typecheck     # TypeScript checks
npm test              # Unit tests for runtime, movement, world and interactions
npm run build         # Type-check and create dist/
npm run preview       # Serve dist/ locally (build first)
npx playwright install --with-deps chromium firefox webkit
npm run test:browser  # Smoke-test the production build in installed engines
```

The lockfile fixes dependency versions. `dist/` is a static build that needs an
HTTP server; opening index.html directly as a file is not supported. CI runs the
same checks on pushes and pull requests.

## Controls

Open `/` for the foundation screen or `/?scene=adventure` for the title,
gameplay, pause, finish and replay shell. Music unlocks after keyboard,
controller or canvas pointer interaction (subject to browser audio policy).
Switching away pauses audio and freezes the simulation; returning discards
elapsed time and preserves a deliberate pause. `/?audio` previews all six
effects and start/stop music. `/?scene=gameplay` exercises interaction events.
See the [audio guide](docs/AUDIO.md) and [adventure guide](docs/plains-adventure.md).

Current release controls:

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Select level | Left/Right arrows | D-pad or left stick |
| Start / replay | Space | Primary face button |
| Move | Left/Right arrows or A/D | D-pad or left stick |
| Jump | Space | Any face button (A/B/X/Y) |
| Pause/resume | Escape | Start |
| Mute | M or on-screen Mute button | On-screen Mute button |

Only standard-mapped controllers are read. Input clears on focus loss and
controller disconnect; release held controller controls before resuming.

Progress is in memory only. Checkpoint retries preserve collected gems; replay,
reload or closing the page starts a fresh run. The last selected level is not
remembered. No browser storage, server save, public hosting or runtime
generation call is used.

## Project layout

- `src/core/clock.ts`: 60 Hz simulation, at most six catch-up updates per frame.
  Pausing clears both the timestamp and partial-step remainder. Updates receive
  seconds; rendering uses requestAnimationFrame timestamps in milliseconds.
- `src/core/input.ts`: keyboard/controller polling remains active during pause.
  Jump edges are retained until a simulation step, then consumed once.
- `src/core/viewport.ts`: 426 × 240 logical canvas with integer scaling and
  centered letterboxing. Windows smaller than the logical canvas shrink to fit;
  fractional downscaling cannot preserve uniform physical pixel sizes.
- `src/core/scene.ts`: enter/exit/update/render lifecycle. Scene changes stop audio.
- `src/core/audio.ts`: shared audio interface and silent fallback.
- `src/core/retro-audio.ts`: local music/effect synthesis with bounded voices.
- `src/main.ts`: browser focus, sizing and animation lifecycle, including HMR cleanup.
- `src/game/`: movement, interactions, screen state and adventure previews.
- `src/world/`: level registry and data, camera, asset manifests and renderer.
- `src/foundation-scene.ts`: diagnostic drawing for the foundation screen.

Illustrated assets were generated with the built-in image generator and processed
into project-local atlases. See [Henry art](docs/art/README.md) and [Plains world](docs/plains-world.md).

Known limitations and out of scope: public hosting, touch controls, new biome artwork,
mining/building/crafting and persistent saves. The full current/previous-major
browser matrix, Safari on macOS and physical-controller listening were waived
rather than run; see [Verification](#verification) below.

## Verification

Latest run: **2026-09-17** on Ubuntu **26.04.1 LTS** x86_64, Node **22.22.1**
and npm **9.2.0**, at commit
[`76c7504`](https://github.com/auleewilliams/TinyTurboTrails/commit/76c7504a97d6dfd4ff030687f9215682f8c84a54).
Type-checking, **127 unit tests**, the production build and the browser suite
all passed: **74 of 75 browser checks**, 1 documented skip and 0 failed,
25 in each of the bundled Chromium **153.0.8010.12**, Firefox **155.0** and
WebKit **26.6**. The one skip is the documented Firefox native-audio probe
(this sandbox has no usable audio backend). This was an isolated checkout
using the existing npm cache, not a clean-machine or network-install
verification.

**Issue #8 is closed and this release is certified.** Every defect found
during prior verification runs (checkpoints off the ground, sprite
checkerboard, facing direction, gem/HUD rendering, route duration, terrain
seams/scenery anchoring, finish-screen overlap, spring/camera state on
replay, and the Xbox controller jump button) is fixed, closed and covered by
a regression test — see the [defect inventory](docs/RELEASE-VERIFICATION-2026-09-17.md#defect-inventory-closed-since-the-last-dated-report).
No open defect is known against this candidate.

The remaining manual matrix — physical standard-controller hardware, audible
speaker output, Safari on macOS, installed current/previous-major Chrome and
Firefox releases, and firsthand human inspection of the route — was
**explicitly waived by the project owner** rather than executed; automated
coverage was accepted as sufficient for this release. See the
[2026-09-17 certification report](docs/RELEASE-VERIFICATION-2026-09-17.md),
[release evidence and history](docs/RELEASE-VERIFICATION.md) and the
[manual worksheet](docs/RELEASE-MANUAL-CHECKLIST.md) (kept for reference; its
scenarios were waived, not run).
