# Tiny Turbo Trails

A sidescrolling 16-bit platformer for Henry. The current build is the accepted
MVP baseline: it includes the Plains world, Henry's starter art, movement, gems,
hazards, checkpoints, local music/effects and a title-to-adventure shell.
Known defects and polish work continue as follow-up issues. Release
certification remains open until the manual browser/controller matrix in
`docs/RELEASE-VERIFICATION.md` is completed.

## Run locally

Install Node.js 22.12 or newer (Node 22 LTS is used in CI), then:

```sh
git clone https://github.com/auleewilliams/TinyTurboTrails.git
cd TinyTurboTrails
npm ci
npm run dev
```

Open the URL printed by Vite with `?scene=adventure` appended (normally
`http://127.0.0.1:5173/?scene=adventure`). Press **Space** or the controller’s
**primary face button** to start. The bare `/` URL opens a diagnostic screen.
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
| Start / replay | Space | Primary face button |
| Move | Left/Right arrows or A/D | D-pad or left stick |
| Jump | Space | Primary face button |
| Pause/resume | Escape | Start |
| Mute | M or on-screen Mute button | On-screen Mute button |

Only standard-mapped controllers are read. Input clears on focus loss and
controller disconnect; release held controller controls before resuming.

Progress is in memory only. Checkpoint retries preserve collected gems; replay,
reload or closing the page starts a fresh run. No browser storage, server save,
public hosting or runtime generation call is used.

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
- `src/world/`: level data, camera, asset manifest and renderer.
- `src/foundation-scene.ts`: diagnostic drawing for the foundation screen.

Illustrated assets were generated with the built-in image generator and processed
into project-local atlases. See [Henry art](docs/art/README.md) and [Plains world](docs/plains-world.md).

Known limitations and out of scope: public hosting, touch controls, extra biomes,
mining/building/crafting and persistent saves. The full current/previous-major
browser matrix, Safari on macOS, physical controller listening and final manual
route certification remain pending; see [release verification](docs/RELEASE-VERIFICATION.md).

## Verification and known defects

On **2026-09-15**, a fresh local clone on **Ubuntu 26.04.1 LTS**, Node **22.22.1**
and npm **9.2.0** passed cached dependency installation, type-checking, **48 unit
tests**, production build and a development-server adventure launch. Production
browser results: **Chromium 153.0.8010.12: 18 passed**; **Firefox 155.0: 17 passed,
1 native-audio skip**; **WebKit: all 18 cases blocked at launch by missing host
libraries**. Keyboard/pointer and simulated standard-controller inputs were used;
no physical controller was tested. This was not a clean-machine installation.

Known blocking defect: [#26 — checkpoints sit above the ground](https://github.com/auleewilliams/TinyTurboTrails/issues/26),
affecting grounded activation and recovery placement. No open non-blocking
defect was identified in the issue inventory reviewed on 2026-09-15. Certification
and issue #9 closeout remain pending the checkpoint fix and full manual matrix.
See [release evidence and limits](docs/RELEASE-VERIFICATION.md) and the
[manual worksheet](docs/RELEASE-MANUAL-CHECKLIST.md).
