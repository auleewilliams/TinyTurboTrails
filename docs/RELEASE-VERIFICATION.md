# Release verification — issue #8

Run date: 2026-09-14. Candidate branch: `test-controller-adventure-smoke`, based on
the integrated first-playable release branch. This record separates automated evidence
from manual checks that still require a desktop host and a physical controller.

## Automated checks

| Check | Result |
| --- | --- |
| `npm ci --offline` from a fresh worktree | Passed on Ubuntu 26.04.1, Node 22.22.1 |
| `npm test` | Passed: 47 tests in 10 files |
| `npm run build` | Passed: TypeScript and Vite production build |
| Chromium 153.0.8010.12 on Linux | Passed: foundation, assets, movement, world, interactions, adventure and audio checks |
| Firefox 155.0 on Linux | Passed: all non-native-audio checks; native AudioContext check explicitly skipped because the host has no usable audio backend |
| WebKit 26.6 on hosted Ubuntu CI | Passed: hosted candidate run 34898451770 |
| WebKit 26.6 in this local container | Cannot launch: required GTK/GStreamer/libopus/libsoup libraries are absent |
| Standard-controller adventure smoke test | Passed in hosted Chromium, Firefox and WebKit with a standard-mapped controller fixture; physical-controller behavior remains manual |

The hosted candidate run [34898451770](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/34898451770)
passed 44 of 45 browser tests with one explicit Firefox native-audio skip across
Chromium 153.0.8010.12, Firefox 155.0 and WebKit 26.6. The browser suite checks
asset loading and transparency, manifest frame bounds,
keyboard and standard-controller movement/pause input, world/camera preview,
interaction preview, title/start/pause/finish/replay screen flow, mute/unavailable-audio
behavior, and audio effect lifecycle. It does
not prove audible output on speakers when the host has no audio device.

## Target matrix

The release requirement is current stable plus the immediately preceding major
for desktop Chrome, Firefox and Safari on macOS. Exact browser release pairs
were not available in this Linux environment. The hosted CI job uses the current
Playwright Chromium 153, Firefox 155 and WebKit 26.6 binaries only; it is useful
engine coverage, not evidence for both major versions or Safari on macOS.

## Manual scenarios still required

On macOS and a Linux/Windows desktop with a standard controller, complete the
title-to-finish-to-replay route in each target browser. Record browser version,
OS, controller model and date for: resize/letterboxing, focus recovery, pause,
mute, finish celebration, replay reset, maximum-speed traversal, all three
checkpoint recoveries, hidden gems, easy main route, terrain seams, animation
anchors, foreground/background contrast and readable hazards. Reload and close
the page to confirm gems/checkpoints do not return.

No runtime generation call, backend, credential dependency or browser storage is
present in the candidate. No blocking defect was discovered by the automated
checks. A release claim remains intentionally open until the manual matrix and
previous-major/Safari checks are run; any defect found there must be filed as a
separate issue with reproduction steps and blocking triage before #8 can close.
