# Release verification — issue #8 (closed)

> Historical record: results, blockers and waivers below apply only to the dated
> release/commit described here. They do not certify the current game. For
> current play and development guidance, see [the docs index](README.md).

**Certified:** [2026-09-17 certification report](RELEASE-VERIFICATION-2026-09-17.md)
records 74/75 passing browser checks (1 documented Firefox native-audio skip),
127 unit tests, typecheck and build all green, and every known defect fixed and
closed. The project owner waived the remaining manual matrix (physical
controller, Safari on macOS, previous-major browsers, human route inspection)
as sufficiently covered by automated testing. Issue #8 is closed on this basis.

This certification record predates the multi-level picker and describes the
Plains candidate tested for issue #8. Current product scope and the Quarry Run
route are documented in the README, canonical requirements and adventure guide;
the dated counts below remain historical evidence.

Everything below this point is **historical evidence from superseded runs**,
kept for the record of how certification was reached. The
[2026-09-16 macOS report](RELEASE-VERIFICATION-2026-09-16.md) records 57/57
passing browser checks after checkpoint fix #41 and the defects found that day
(#42–#49), all since fixed. The status section immediately below describes the
**2026-09-15 Linux run**, whose environment limitations and issue inventory
(centered on #26, since fixed) describe that earlier, no-longer-current
candidate.

## Status: certification blocked (historical — 2026-09-15 run)

Run date: **2026-09-15 UTC**. Branch: `release/issues-8-9-verification`.
Tested game commit: `94a35a63575b5205c45b4d2810f0de75efd9d27d`.
This branch updates documentation only; the tested runtime is unchanged.
Prerequisites #6 and #7 were closed when checked on the run date.

Issue #8 remains open: the target manual matrix is incomplete and checkpoint
placement defect [#26](https://github.com/auleewilliams/TinyTurboTrails/issues/26)
is triaged below as blocking certification. Issue #9's documentation is updated
as a draft closeout; its dependency on completed, integrated #8 remains unmet.

## Fresh-clone checks

Environment: Ubuntu 26.04.1 LTS, x86_64, Linux 7.0.0-31-generic,
Node 22.22.1, npm 9.2.0. A new local clone was created with
`git clone --no-hardlinks /home/leew/code/TinyTurboTrails /tmp/ttt-release-issues-8-9`.
It had no installed dependencies or build output. Installation used the existing
npm cache; this verifies a fresh checkout on this host, **not a clean machine**
or a fresh download from GitHub/npm.

| Command/check | Actual result |
| --- | --- |
| `npm ci --offline` | Passed; 46 packages installed from cache |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 48 tests in 10 files |
| `npm run build` | Passed: TypeScript and Vite production build |
| `npm run dev -- --port 5173 --strictPort` | Started successfully; adventure title and Space-to-play checked in Chromium |
| `npm run test:browser -- --workers=2 --reporter=json` | Exit 1: 35 passed, 1 skipped, 18 failed at WebKit launch |

The browser suite starts `npm run preview -- --port 4173 --strictPort` against
the fresh production build. Per-test outcomes are retained in the
[compact browser report](evidence/2026-09-15-browser-results.json).

| Browser engine on this Linux host | Result | Input |
| --- | --- | --- |
| Chromium 153.0.8010.12 | 18/18 passed | Automated keyboard, pointer, simulated standard gamepad |
| Firefox 155.0 | 17 passed, 1 native-audio skip | Automated keyboard, pointer, simulated standard gamepad |
| WebKit | All 18 cases failed before execution: missing host libraries including GTK, GStreamer, libopus and libsoup | None; browser could not launch |

The Firefox skip is the native AudioContext probe: no usable audio backend.
Audio tests do not establish audible speaker output. WebKit launch failures are
environment blockers, not observed game failures; none are counted as passing.
No physical controller was available or tested.

### Earlier hosted evidence

[Run 34901386427](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/34901386427)
was successful on 2026-09-14 at commit
`13515c8dd0e80ddac303016f26f3da10319f94d2`. The prior verification record reports
53/54 browser checks passing with one Firefox native-audio skip across Chromium
153.0.8010.12, Firefox 155.0 and WebKit 26.6 on hosted Ubuntu CI. The run's success
and commit were checked through GitHub on 2026-09-15; these historical counts
are not a fresh WebKit result for this candidate.

## Coverage and limits

The automated suite covers asset loading/transparency/frame bounds, keyboard
input, simulated controller pause/disconnect recovery, resizing/letterboxing,
focus recovery, pause freeze/resume, mute, unavailable audio, and a scripted
keyboard title-to-finish-to-replay route. Reload coverage checks a return to the
title; it does not inspect collected gem/checkpoint state after a new page load.
Unit tests cover new-run reset and preservation of collected gems on recovery.

The checkpoint tests call activation directly and assert recovery against the
configured checkpoint coordinates. They do **not** establish that a grounded
player can activate a marker or that recovery feet align with actual terrain.
Source inspection found only local manifest/asset loading, with no browser
storage, backend, API-key dependency or runtime generation call. This is static
evidence, not a complete network/error audit of every manual route.

## Known defect and release triage

| Issue | Triage for this candidate | Evidence and required retest |
| --- | --- | --- |
| [#26 — Place checkpoints on the ground](https://github.com/auleewilliams/TinyTurboTrails/issues/26) | **Blocking certification**: grounded checkpoint activation and safe ground placement are required. This is not evidence that the finish is unreachable. | Marker/recovery foot Y is 124/108/164; terrain Y at the three checkpoint X positions is 158/163/198. Meadow and cave stay 34 px above the flat ground, beyond the adventure's 28 px vertical activation tolerance. Hillside placement is also above its slope. |

Reproduce #26 on the adventure route: walk without jumping through the meadow
marker at X=570 and cave marker at X=1780; inspect the checkpoint HUD for a
failure to activate. Inspect the hillside marker at X=1220 and compare all
marker bases to the terrain. The triage above is based on source geometry on
Ubuntu; a browser-specific visual reproduction and physical-input test remain
pending. Recovery uses the same elevated Y coordinates despite setting
`onGround = true`; existing passing tests do not rule out this defect.

No new game defect was observed by this automated run. #26 already tracks the
checkpoint problem, so no duplicate was filed and no fix was made here. No open
non-blocking defect was identified in the issue inventory checked on 2026-09-15;
#27–#39 describe future functionality/documentation, not certified release fixes.
After #26 is fixed and integrated, rerun grounded activation and recovery at all
three checkpoints, gem preservation, route completion, and the automated suite.
Record the fix commit, browser/OS/input, date and actual outcomes before closing #8.

## Target matrix and remaining manual work

The canonical requirement is current stable desktop Chrome, Firefox and Safari
(on macOS), plus each immediately preceding major. Playwright engine versions
are not substitutes for those installed browser releases. Exact target versions
must be recorded at execution time; no current-version claim is made here.

| Required browser | Exact version / OS | Keyboard | Physical standard controller |
| --- | --- | --- | --- |
| Chrome current stable | Not recorded | Not run | Not run |
| Chrome preceding major | Not recorded | Not run | Not run |
| Firefox current stable | Not recorded | Not run | Not run |
| Firefox preceding major | Not recorded | Not run | Not run |
| Safari current stable | Not recorded / macOS required | Not run | Not run |
| Safari preceding major | Not recorded / macOS required | Not run | Not run |

Use the [manual scenario worksheet](RELEASE-MANUAL-CHECKLIST.md) for each row and
input device. Remaining checks include physical controller behavior, audible
output, every animation, terrain/collision/camera inspection, hidden routes,
maximum-speed traversal, all checkpoint recoveries, fresh-page progress reset,
and age-appropriate clarity/timing. Untested combinations must remain marked
not run. File each new defect separately with reproduction, browser/OS/input,
and blocking/non-blocking triage; keep fixes outside this verification issue.
