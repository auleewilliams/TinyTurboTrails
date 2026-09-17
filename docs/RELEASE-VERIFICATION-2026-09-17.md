# Release certification — issue #8 closed

## Result: certified

All defects filed against the release candidate are fixed, closed and
retested, and the automated suite is green end to end. The project owner
reviewed the outstanding manual matrix (physical controller playthroughs,
Safari on macOS, current/previous-major browser pairs, and route/terrain/
animation inspection) and confirmed on **2026-09-17** that automated coverage
is accepted as sufficient for this release; that manual matrix is waived
rather than executed. Issue #8 is closed on this basis. See the
[manual worksheet](RELEASE-MANUAL-CHECKLIST.md) for the waived scenario list.

## Candidate and environment

- Date: **2026-09-17**.
- Candidate commit: `76c7504a97d6dfd4ff030687f9215682f8c84a54`, `origin/main`.
- Host: Ubuntu **26.04.1 LTS** (Resolute Raccoon), x86_64, kernel
  `7.0.0-31-generic`; Node **22.22.1**, npm **9.2.0**.
- This is an isolated checkout using the existing npm cache, not a
  clean-machine or fresh network-install verification.

## Automated results

| Command | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm test` | Pass; **127 tests** in 15 files |
| `npm run build` | Pass; TypeScript and Vite production build |
| `npm run test:browser` | Pass; **74 of 75** checks, 1 documented skip, 0 failed |

| Bundled browser engine | Cases | Input |
| --- | --- | --- |
| Chromium **153.0.8010.12** | 25 passed | Automated keyboard/pointer, simulated standard gamepad |
| Firefox **155.0** | 24 passed, 1 native-audio skip | Automated keyboard/pointer, simulated standard gamepad |
| WebKit **26.6** | 25 passed | Automated keyboard/pointer, simulated standard gamepad |

The new `controller jump works mid-gameplay via any face button` case (one per
engine) regression-tests the #62 fix.

The Firefox skip is the documented native AudioContext probe: this sandbox has
no usable audio backend. It does not indicate a game defect and has been
present in every run on this host. No other skip or failure occurred.

## Defect inventory closed since the last dated report

All findings from the 2026-09-16 macOS run, plus two found afterward, are
fixed, closed and covered by regression tests:

| Issue | Defect | Fixed by |
| --- | --- | --- |
| [#26](https://github.com/auleewilliams/TinyTurboTrails/issues/26) | Checkpoints sat above the ground | #41 |
| [#42](https://github.com/auleewilliams/TinyTurboTrails/issues/42) | Baked checkerboard behind Henry's sprites | #56 |
| [#43](https://github.com/auleewilliams/TinyTurboTrails/issues/43) | Henry kept facing right while running left | #55 |
| [#44](https://github.com/auleewilliams/TinyTurboTrails/issues/44) | Collected gems stayed visible in the world | #54 |
| [#45](https://github.com/auleewilliams/TinyTurboTrails/issues/45) | Route ran ~11 seconds against the 3–5 minute target | #57 |
| [#46](https://github.com/auleewilliams/TinyTurboTrails/issues/46) | HUD lost left alignment after pause | #54 |
| [#47](https://github.com/auleewilliams/TinyTurboTrails/issues/47) | Trees and slimes floated above the terrain | #58 |
| [#48](https://github.com/auleewilliams/TinyTurboTrails/issues/48) | Visible seams between adjacent terrain polygons | #59 |
| [#49](https://github.com/auleewilliams/TinyTurboTrails/issues/49) | Finish celebration overlapped its own subtitle | #60 |
| [#61](https://github.com/auleewilliams/TinyTurboTrails/issues/61) | Spring re-activated repeatedly; camera kept stale position on replay | #63 |
| [#62](https://github.com/auleewilliams/TinyTurboTrails/issues/62) | Xbox controller jump button did not register | #64 (76c7504) |

No open defect is known against this candidate. See
[REQUIREMENTS.md](REQUIREMENTS.md) for the scope this candidate is certified
against and [RELEASE-VERIFICATION.md](RELEASE-VERIFICATION.md) for prior,
superseded run history.

## What remains untested

Manual scenarios in [RELEASE-MANUAL-CHECKLIST.md](RELEASE-MANUAL-CHECKLIST.md)
were waived, not executed: physical standard-controller hardware, audible
speaker output, Safari on macOS, installed current/previous-major Chrome and
Firefox releases (Playwright's bundled engines substitute for these), and
firsthand visual/timing inspection of the route by a human tester. Anyone
finding a defect in one of these areas should file it as a new issue; it does
not reopen #8.
