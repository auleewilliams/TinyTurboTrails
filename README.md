<p align="center"><img src="assets/source/title/tiny-turbo-trails-v2.png" alt="Tiny Turbo Trails: Henry in his hard hat beside a grassy trail, with gold and blue title lettering" width="640"></p>

# Tiny Turbo Trails

A forgiving, illustrated platform game for Henry. Explore six open trails:
Plains, Quarry Run, Treetop Timbers, Sunset Site, Frost Ridge and Sandy Cove.
Choose a landmark on the overworld, collect gems and reach the finish.
Plains, Quarry Run and Treetop Timbers also offer three optional gold stars each;
follow the slope, lift and spring signs to explore their signature challenges.

## Play locally

Install Node.js 22.12 or newer, then run:

```sh
npm ci
npm run play
```

This starts Vite and opens the game. Use the URL it prints if the browser does
not open. Both `/` and `/?scene=adventure` open a short picture story, then the playable map.
Skip or advance at your own pace; retries do not repeat the opening.
Stop the local server with Ctrl+C. An adult sets this up for local play.

For an already configured home server, open its LAN address instead; no local
development server is needed. [LAN setup and updates](docs/DEPLOYMENT.md) cover
Docker/nginx deployment and rollback. Public internet hosting is outside scope.

## Controls

| Action | Keyboard | Standard controller | Pointer |
| --- | --- | --- | --- |
| Choose trail / finish action | Left/Right or A/D | D-pad / left stick | Click landmark / action |
| Play / confirm | Space; Tab and Enter on buttons | Any face button | Play / action button |
| Replay story / enlarge Plains reunion | R; Tab and Space/Enter on the picture button | View (button 8) | Rewind / reunion picture |
| Move | Left/Right or A/D | D-pad / left stick | Not supported |
| Jump | Space | Any face button | Not supported |
| Pause / resume | Escape | Start | — |
| Mute | M | — | Mute button |

Henry celebrates each finish with a jump and cheer (a still pose with reduced motion).
The finish buttons show Replay, Next and Trails with large symbols; their accessible
names remain Replay, Next trail and Choose trail. Replay starts the same trail fresh. Next trail starts the next registered trail;
Choose trail returns to the map. Checkpoint recovery retains gems and special
stars; replay, changing trails and reload clear the run's stars. Completion
badges last for this page session only; reloading clears them. Nothing is saved
to browser storage or a server. See the [adventure guide](docs/plains-adventure.md).

## Develop

```sh
npm run dev           # Local server without opening a browser
npm test              # Vitest regression suite
npm run typecheck
npm run build         # Production bundle in dist/
npm run preview       # Serve the production bundle after building
npx playwright install --with-deps chromium firefox webkit
npm run test:browser  # Production-build browser checks
```

Asset-processing tests also require Python 3 (`python` on Windows, `python3`
elsewhere). The static bundle needs an HTTP server; opening `index.html` as a
local file is unsupported. No credentials or runtime generation are needed.

[Documentation index](docs/README.md) · [Requirements](docs/REQUIREMENTS.md) ·
[Art and provenance](docs/art/README.md) · [Audio](docs/AUDIO.md)

The [2026-09-17 certification](docs/RELEASE-VERIFICATION-2026-09-17.md) is historical
and does not certify later features. The [trail milestone record](docs/evidence/trail-milestone/README.md)
retains its earlier scope. The [Henry / Patchwork Vale milestone](docs/evidence/henry-patchwork-vale/README.md)
records the celebration and illustrated story, with a [parent-led checklist](docs/patchwork-vale-story.md).
