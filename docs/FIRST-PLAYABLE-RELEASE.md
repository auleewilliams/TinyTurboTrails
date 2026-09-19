# Tiny Turbo Trails — first playable release

> Historical record: results, blockers and waivers below apply only to the dated
> release/commit described here. They do not certify the current game. For
> current play and development guidance, see [the docs index](README.md).

This document describes the **certified first playable release**. It is
written for someone returning to the repository or launching it for Henry,
without needing to reconstruct decisions from issue history. Certification
(issue #8) is closed and this release documentation (issue #9) reflects that
closeout. Any defect found after this point should be tracked as a new
follow-up issue; it does not reopen this release.

## Launch

Current launch, controls and LAN guidance live in [the root README](../README.md).
The certification below covers the original dated release only.

## Verification status — certified 2026-09-17

The [2026-09-17 certification report](RELEASE-VERIFICATION-2026-09-17.md)
records, on Ubuntu 26.04.1 LTS (Node 22.22.1, npm 9.2.0) at commit
`76c7504`: `npm run typecheck` passing, **127 unit tests** passing, `npm run
build` passing, and the browser suite passing **74 of 75 checks** (25 each in
Chromium 153.0.8010.12, Firefox 155.0 and WebKit 26.6), with one documented
Firefox native-audio skip and zero failures. This was an isolated checkout
using the existing npm cache, not a clean-machine or network-install
verification.

Every defect found across all prior verification runs is fixed, closed and
covered by a regression test — see the
[defect inventory](RELEASE-VERIFICATION-2026-09-17.md#defect-inventory-closed-since-the-last-dated-report)
for the full list and fixing PRs. No open defect is known against this
candidate.

**The remaining manual matrix was waived, not run.** Physical
standard-controller hardware, audible speaker output, Safari on macOS,
installed current/previous-major Chrome and Firefox releases, and firsthand
human inspection of the route and animations are all untested. The project
owner reviewed this gap on 2026-09-17 and decided automated coverage was
sufficient for this release rather than executing the
[manual worksheet](RELEASE-MANUAL-CHECKLIST.md). Anyone who finds a defect in
one of these untested areas should file it as a new issue.

Superseded historical runs (2026-09-15 Linux, 2026-09-16 macOS) and their
now-fixed defect findings are preserved in
[release verification](RELEASE-VERIFICATION.md) and
[RELEASE-VERIFICATION-2026-09-16.md](RELEASE-VERIFICATION-2026-09-16.md).

## Controls

| Action | Keyboard | Standard controller |
| --- | --- | --- |
| Select level | Left/Right arrows | D-pad or left stick |
| Start / replay | Space | Any face button (A/B/X/Y) |
| Move | Left/Right arrows or A/D | D-pad or left stick |
| Jump | Space | Any face button (A/B/X/Y) |
| Pause/resume | Escape | Start |
| Mute | M or on-screen Mute button | On-screen Mute button |

The adventure title selects Plains, Quarry Run, Treetop Timbers, Sunset Site, Frost Ridge or Sandy Cove with Left/Right, then starts
with Space or any standard controller face button (A/B/X/Y).
Jump accepts any standard-mapping face button, not only the primary one, as a
compatibility hedge across controller/browser combinations (see
[#62](https://github.com/auleewilliams/TinyTurboTrails/issues/62)). Finish
shows the current run's gem total; the same control returns to a fresh picker.
Focus loss clears held input, pauses the fixed-step simulation and discards
elapsed wall time before resuming. Only standard-mapped controllers are read.
Touch input is out of scope.

## Progress and behavior

Run progress exists in memory only and does not survive a reload — this is
deliberate behavior, not a bug. Collected gems survive a checkpoint recovery
within the current run. Replay, reload and closing the page clear gems,
checkpoints, velocity and entity state. No localStorage, IndexedDB, cookies or
server save is used, and the last selected level is not remembered. The Plains
route is forgiving and uses six safe checkpoints;
optional gem routes, springs, slimes and hazards are defined by local level data.

Music and effects are synthesized locally after browser interaction. Mute and
pause cover music and effects; audio remains optional, so gameplay continues if
Web Audio cannot start. `/?audio` previews the six effects and the music loop.

## Scope and limitations

The certified release documented here covered one desktop-browser Plains route
with meadow, wooded hillside and cave-themed scenery. The current build also
offers Quarry Run, Treetop Timbers, Sunset Site, Frost Ridge and Sandy Cove through the title picker. Quarry Run reuses
the Plains atlas, while Treetop Timbers, Sunset Site, Frost Ridge and Sandy Cove have dedicated atlases.
Mining, building, crafting, loops, charged dashes, touch
controls, public hosting and persistent progress remain deliberately out of
scope. The generated source art and processed atlases are project-local; the
running game loads assets locally and makes no generation or external API calls.

Known, deliberately untested combinations (not defects — see Verification
status above): physical controller hardware, audible speaker output, Safari on
macOS, installed current/previous-major Chrome and Firefox releases, and
firsthand human route/animation inspection.

See [canonical requirements](REQUIREMENTS.md), [release verification](RELEASE-VERIFICATION.md),
[movement tuning](gameplay-movement.md), [interaction behavior](gameplay-interactions.md),
[adventure screens](plains-adventure.md) and [audio evidence](AUDIO.md).
