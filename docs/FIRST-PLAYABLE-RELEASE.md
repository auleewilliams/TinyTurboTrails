# Tiny Turbo Trails — first playable release

This document describes the accepted MVP baseline. It is written for someone
returning to the repository or launching it for Henry, without needing to
reconstruct decisions from issue history. The MVP is playable, but it is not a
claim that every bug or release-certification check is complete; defects found
after acceptance should be tracked as follow-up issues.

## Launch

An adult or developer installs Node.js 22.12 or newer, runs `npm ci`, then runs
`npm run play` from the repository. On Windows, macOS and Linux, this starts the
local server and opens `/?scene=adventure` in the default browser for Henry.
Press Space or the controller's primary face button at the title screen to
begin. If the browser does not open, use the local URL printed by Vite and append
`/?scene=adventure`. Use the printed port, since Vite chooses another if the
default is busy. Stop the server with Ctrl+C.

For development, `npm run dev` still starts the server without opening a browser.
The game has no public hosting or backend service; a player who cannot start a
dev server needs an adult to do this launch step. A production bundle can be
served with `npm run build` and `npm run preview`.

## Verification status — 2026-09-15

Issue #9 remains a draft closeout until issue #8 is complete and integrated.
On Ubuntu 26.04.1 LTS (Node 22.22.1, npm 9.2.0), a fresh local clone passed
`npm ci --offline`, `npm run typecheck`, all 48 unit tests, `npm run build`, and
the development adventure launch. Cached installation on this existing host is
not clean-machine verification.

The production browser suite returned exit 1: Chromium 153.0.8010.12 passed all
18 checks; Firefox 155.0 passed 17 with one native-audio skip; all 18 WebKit
checks failed at browser launch because host libraries are absent. Input was
automated keyboard/pointer plus simulated standard gamepads; no physical
controller or audible listening check was performed. Full evidence, earlier
hosted results, and remaining matrix entries are in the
[release verification record](RELEASE-VERIFICATION.md).

## Controls

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Start / replay | Space | Primary face button |
| Move | Left/Right arrows or A/D | D-pad or left stick |
| Jump | Space | Primary face button |
| Pause/resume | Escape | Start equivalent |
| Mute | M or on-screen Mute button | On-screen Mute button |

The adventure title starts with Space or the primary controller face button.
Finish shows the current run's gem total; the same control returns to a fresh title.
Focus loss clears held input, pauses the fixed-step simulation and discards elapsed wall time before resuming. Only standard-mapped
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
project-local; the running game loads assets locally and makes no generation or
external API calls.

Known blocking defect: [#26 — Place checkpoints on the ground](https://github.com/auleewilliams/TinyTurboTrails/issues/26).
The configured marker/recovery coordinates sit above terrain; grounded activation
and ground-aligned recovery need a fix and retest before certification. No open
non-blocking defect was identified in the issue inventory reviewed on 2026-09-15.

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
