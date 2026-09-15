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

Latest run: **2026-09-16** on macOS **26.6.2 (25G83)** arm64, Node **22.23.2** and
npm **10.9.8**, after integrating checkpoint fix
[#41](https://github.com/auleewilliams/TinyTurboTrails/pull/41). Type-checking,
**57 unit tests**, the production build and the browser suite all passed:
**57 browser checks, 0 skipped and 0 failed**, 19 in each of the bundled
Chromium **153.0.8010.12**, Firefox **155.0** and WebKit **26.6**. This was an
isolated checkout using the existing npm cache — not a clean-machine or
network-install verification. A physical Xbox controller over Bluetooth was
reported working in an embedded browser, on the pre-#41 candidate; that is a
user report, not an independently recorded session. The earlier
**2026-09-15** Ubuntu run is retained as history in the reports below.

**Certification is still open.** Playwright's bundled engines are not the
installed browsers the requirements name, and the current/previous-major Chrome,
Firefox and Safari matrix has not been run on either keyboard or a physical
controller. Checkpoint recovery is verified by simulation rather than a real
fall, because the Plains route currently has no pit to fall into.

Open defects, all found during the 2026-09-16 run:

| Issue | Triage | Effect |
| --- | --- | --- |
| [#42](https://github.com/auleewilliams/TinyTurboTrails/issues/42) | **Blocking** | Henry's shipped sprites have a baked gray checkerboard behind every pose. |
| [#45](https://github.com/auleewilliams/TinyTurboTrails/issues/45) | **Blocking** | The route takes about 11 seconds against the agreed 3–5 minutes. |
| [#43](https://github.com/auleewilliams/TinyTurboTrails/issues/43) | Non-blocking | Henry keeps facing right while running left. |
| [#44](https://github.com/auleewilliams/TinyTurboTrails/issues/44) | Non-blocking | Collected gems are still drawn in the world. |
| [#46](https://github.com/auleewilliams/TinyTurboTrails/issues/46) | Non-blocking | HUD text is clipped after pause and resume. |
| [#47](https://github.com/auleewilliams/TinyTurboTrails/issues/47) | Non-blocking | Trees and slimes float above the terrain. |
| [#48](https://github.com/auleewilliams/TinyTurboTrails/issues/48) | Non-blocking | Thin seams appear between terrain polygons while scrolling. |
| [#49](https://github.com/auleewilliams/TinyTurboTrails/issues/49) | Non-blocking | The finish celebration overlaps its own subtitle. |

[#26 — checkpoints sat above the ground](https://github.com/auleewilliams/TinyTurboTrails/issues/26)
is fixed and retested. Certification and issue #9 closeout remain pending the two
blocking defects and the full manual matrix. See the
[2026-09-16 macOS report](docs/RELEASE-VERIFICATION-2026-09-16.md),
[release evidence and limits](docs/RELEASE-VERIFICATION.md) and the
[manual worksheet](docs/RELEASE-MANUAL-CHECKLIST.md).
