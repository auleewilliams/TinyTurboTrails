# Issue 210 evidence: results before optional word building

Captured on 25 October 2026 in Playwright Chromium (Linux, headless) from the production
preview build of branch `feat/finish-first-210`, after commit `0419a73`. The images come from
the existing input-driven browser tests, run with `--output` into a scratch directory and then
copied here unchanged:

| File | Test | State |
| --- | --- | --- |
| `plains-results-426x240.png`, `plains-results-320x240.png` | milestone PLAINS | First trail results: Next trail selected, no activity |
| `plains-results-1366x768.png` | uniform viewport fit | Same results on a 1366×768 desktop viewport |
| `cove-final-results-426x240.png`, `cove-final-results-320x240.png` | milestone SANDY COVE | Final trail: no Next trail, Map selected |
| `plains-activity-426x300.png`, `plains-activity-320x240.png` | kit text clearance | Build HILL opened by Build your word |
| `plains-after-activity-426x300.png`, `plains-after-activity-320x240.png` | kit text clearance | After Leave activity: results with Next trail selected again |

The kit text clearance test also checks that every label, including `Next trail`, `Map`,
`Build your word` and `Replay`, stays inside its button's quiet interior. It passed in Chromium,
Firefox and WebKit. These are automated observations. They do not show that a child, a
physical controller or a manual reviewer has accepted the change.
