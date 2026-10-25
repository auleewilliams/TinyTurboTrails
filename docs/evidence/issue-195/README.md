# Issue #195 — exploration premise and direct-map startup

Captured 2026-10-25 from the production build (`npm run build`, `vite preview`)
in bundled Playwright Chromium, before the PR was opened. Viewports: native
426×240, desktop 1366×768 and small 320×240. The page loaded `/?debug=1`, with
no page errors and no request under `/assets/story/`.

| File | Shows |
| --- | --- |
| `map-plains-{native,desktop,small}.png` | First screen after load: trail map with Plains selected, **Over grassy hills**, Stickers and Play only (no story control) |
| `plains-finish-{native,desktop,small}.png` | Real Plains run reached by keyboard input: Plains landmark, Henry's cheer, **Another trail explored!**, ordinary results and Replay / Next / Trails, prompt without a picture hint |

The finish is the held victory pose, about 2.5 seconds after completion.
Adult inspection found the text and buttons clear of the timber frame at all
three sizes. Gem and star counts are from that one keyboard run.

Automated checks and adult inspection are the only evidence here. Owner-led
playtesting, any child's understanding or enjoyment, and physical-controller
use were **not** performed and remain pending (see
[the owner checklist](../../patchwork-vale-story.md)).
