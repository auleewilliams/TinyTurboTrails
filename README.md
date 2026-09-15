# Tiny Turbo Trails

A sidescrolling 16-bit platformer for Henry. The repository currently contains
issue #1's browser foundation: a diagnostic canvas with a moving timing marker,
pause/focus handling, plus original retro music and sound effects from issue #7.
It is not a playable level yet.

## Run locally

Install Node.js 22.12 or newer (Node 22 LTS is used in CI), then:

```sh
git clone https://github.com/auleewilliams/TinyTurboTrails.git
cd TinyTurboTrails
npm ci
npm run dev
```

Open the local URL printed by Vite. Stop the server with Ctrl+C. An adult must
start the server and open the page for Henry; public hosting is out of scope.
No credentials, backend or image-generation service are needed to run the app.

```sh
npm run typecheck     # TypeScript checks
npm test              # Simulation clock and viewport regression tests
npm run build         # Type-check and create dist/
npm run preview       # Serve dist/ locally (build first)
npx playwright install --with-deps chromium firefox webkit
npm run test:browser  # Smoke-test the production build in three engines
```

The lockfile fixes dependency versions. `dist/` is a static build that needs an
HTTP server; opening index.html directly as a file is not supported. CI runs the
same checks on pushes and pull requests.

## Controls

In the foundation preview, **Escape** pauses/resumes and **M** toggles the mute
state. Music unlocks after keyboard, controller or canvas pointer interaction
(subject to browser audio policy). Switching away pauses audio and freezes the
simulation; returning discards elapsed time and preserves a deliberate pause.
Open `/?audio` to preview all six effects and start/stop music. The gameplay
previews at `/?scene=gameplay` and `/?scene=adventure` also connect accepted
gem, checkpoint, spring and damage events to local synthesis; see the [audio
guide](docs/AUDIO.md) for integration and verification details.

Planned release controls (input bindings exist; movement arrives in issue #3):

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Move | Left/Right arrows or A/D | D-pad or left stick |
| Jump | Space | Primary face button |
| Pause/resume | Escape | Start |
| Mute | M | On-screen control in issue #6 |

Only standard-mapped controllers are read. Input clears on focus loss and
controller disconnect; release held controller controls before resuming.

## Foundation layout

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
- `src/foundation-scene.ts`: diagnostic drawing, replaced by later game scenes.

Illustrated assets arrive through the built-in image generator in issues #2/#4.
The diagnostic grid and marker are not final game artwork.

All future run progress must remain in memory: checkpoint retries preserve gems,
while replay, reload or closing the page starts fresh. No browser storage or
server save is used. See [canonical requirements](docs/REQUIREMENTS.md) for scope
and [verification record](docs/VERIFICATION.md) for tested and untested browsers.
