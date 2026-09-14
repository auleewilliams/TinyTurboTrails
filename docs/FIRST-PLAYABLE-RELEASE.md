# Tiny Turbo Trails — first playable release

This document describes the current first-playable candidate. It is written for
someone returning to the repository or launching it for Henry, without needing
to reconstruct decisions from issue history.

## Launch

An adult or developer installs Node.js 22.12 or newer, runs `npm ci`, then runs
`npm run dev` from the repository. Open the local Vite URL in a desktop browser.
For Henry, an adult starts the server and opens the adventure URL:
`http://localhost:5173/?scene=adventure`. The game has no public hosting or
backend service; a player who cannot start a dev server needs an adult to do
this launch step. A production bundle can be served with `npm run build` and
`npm run preview`.

The checked commands are `npm run typecheck`, `npm test`, `npm run build` and
`npm run test:browser`. `npm test` currently covers 44 unit tests in 10 files.
The hosted run [34887106613](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/34887106613)
passed the build and 26 browser checks across Chromium 153.0.8010.12, Firefox
155.0 and WebKit 26.6, with one explicit Firefox native-audio skip because the
runner had no usable audio backend.

## Controls

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Move | Left/Right arrows or A/D | D-pad or left stick |
| Jump | Space | Primary face button |
| Pause/resume | Escape | Start equivalent |
| Mute | M or on-screen Mute button | On-screen Mute button |

The adventure title starts with Space. Finish shows the current run's gem total;
Space starts a fresh replay. Focus loss clears held input, pauses the fixed-step
simulation and discards elapsed wall time before resuming. Only standard-mapped
controllers are read. Touch input is out of scope.

## Progress and behavior

Run progress exists in memory only. Collected gems survive a checkpoint recovery
within the current run. Replay, reload and closing the page clear gems,
checkpoints, velocity and entity state. No localStorage, IndexedDB, cookies or
server save is used. The main route is forgiving and uses three safe checkpoints;
optional gem routes, springs, slimes and hazards are defined by local level data.

Music and effects are synthesized locally after browser interaction. Mute and
pause cover music and effects; audio remains optional, so gameplay continues if
Web Audio cannot start. `/?audio` previews the six effects and the music loop.

## Scope and limitations

The release scope is one desktop-browser Plains route with meadow, wooded
hillside and cave-themed scenery. Mining, building, crafting, loops, charged
dashes, touch controls, extra biomes, public hosting and persistent progress are
deliberately out of scope. The generated source art and processed atlases are
project-local; the running game makes no generation or network calls.

Automated Linux browser checks do not replace physical speakers, a controller,
Safari on macOS or every current/previous-major browser pair. Those checks,
maximum-speed traversal, every checkpoint recovery, easy-route completion,
finish/replay inspection, terrain seam review and final contrast review remain
the manual evidence required before issue #8 and this release documentation can
be closed as certified. Any defect found there must be filed separately with
reproduction steps, browser/OS and blocking triage.

See [canonical requirements](REQUIREMENTS.md), [release verification](RELEASE-VERIFICATION.md),
[movement tuning](gameplay-movement.md), [interaction behavior](gameplay-interactions.md),
[adventure screens](plains-adventure.md) and [audio evidence](AUDIO.md).
