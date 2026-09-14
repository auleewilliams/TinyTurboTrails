# Foundation verification — issue #1

Run date: 2026-09-14. Host: Ubuntu 26.04.1 LTS, Node 22.22.1, npm 9.2.0.
These results cover the foundation preview, not the future playable release.

| Check | Result |
| --- | --- |
| Lockfile reinstall (`npm ci --offline`, populated local cache) | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 8 passed: clock, sizing, controller focus recovery |
| `npm run build` | Passed, Vite 8.3.0 / TypeScript 7.0.2 |
| Playwright Chromium 153.0.8010.12, Linux | Passed |
| Playwright Firefox 155.0, Linux | Passed |
| Playwright WebKit 26.6, Linux | Launch blocked by missing host libraries |
| Stable Chrome and immediately preceding major | Not verified as a release pair |
| Stable Firefox and immediately preceding major | Not verified as a release pair |
| Stable Safari and immediately preceding major, macOS | Not run; no macOS host |
| Physical standard controller | Not run; synthetic input regression only |
| GitHub Actions, Ubuntu 24.04 | Passed: eight unit tests, type-check, build and all three browser smoke tests |

The production browser smoke test checks canvas backing dimensions, integer
scaling at 1366 × 768 and 900 × 600, keyboard pause/resume, unchanged canvas pixels
across paused frames, synthetic blur/focus events, preservation of manual pause,
mute-state toggling, reload reset and absence of console/page errors. Browser
screenshots are written under `test-results/`; CI uploads that directory.

Clock tests compare one second of simulation at 30, 60 and 144 Hz rendering,
bound long-frame catch-up, and prove both partial-step and wall-time debt are
cleared after focus pause. Input regression checks controls held while unfocused
remain blocked until released after recovery.

The initial three-engine smoke run passed Chromium and Firefox but failed before
launching WebKit. Missing libraries include GTK 4, GStreamer, libopus and libsoup.
Run `npx playwright install --with-deps chromium firefox webkit` on a supported
host to install the required system dependencies. The final build was rerun in
Chromium and Firefox successfully. Playwright WebKit on Linux would still not
constitute verification of Safari on macOS.

## Build target and remaining manual checks

Hosted CI subsequently passed on 2026-09-14: [run 34819773465](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/34819773465).
Its Playwright engines reported Chromium 153.0.8010.12, Firefox 155.0 and WebKit
26.6, with all three production smoke tests passing. This resolves the missing
Linux WebKit smoke evidence; actual Safari on macOS and the complete stable/
previous-major release pairs remain unverified.

`vite.config.ts` explicitly targets Chrome 107, Firefox 104 and Safari 16 for
syntax transformation, conservatively below the requested current/previous
release matrix. A build target is not evidence of runtime compatibility.
See [Vite's production build documentation](https://vite.dev/guide/build).
No engine-specific application workaround has been needed in the tested engines.

Before closing #1, record the exact current and preceding
stable browser versions on the required platforms. In each, open the production
preview, resize, inspect pixel sharpness, switch applications/tabs for at least
30 seconds and return, and verify no timing-marker catch-up jump. Check manual
pause survives switching away. Exercise a physical standard controller's Start
button and release-after-focus behavior. Record failures and workarounds here.

The checks above used a lockfile reinstall in the working directory, not a fresh
clone on a separate clean machine. A fresh-checkout setup check remains pending.
Issue #1 stays open until its remaining acceptance checks pass; #2 depends on
completion and integration of #1.
