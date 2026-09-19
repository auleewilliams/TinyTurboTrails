# Issue #108 soundtrack evidence — 2026-09-20

All six original scores are authored in `src/core/music.ts`. No third-party
recordings or external licenses are involved. These WAVs are review artifacts,
not runtime assets; the game synthesizes its music locally.

| Level | Sample |
| --- | --- |
| Plains | [Meadow morning](plains.wav) |
| Quarry Run | [Pebble parade](quarry.wav) |
| Treetop Timbers | [Canopy caper](timbers.wav) |
| Sunset Site | [Golden girders](sunset.wav) |
| Frost Ridge | [Snowlight glide](frost.wav) |
| Sandy Cove | [Tidepool holiday](cove.wav) |

Run `node scripts/render-music-samples.mts` with Node 22.18+ and installed
Playwright Chromium to reproduce. The script renders three complete loops per
track in a native OfflineAudioContext, using the score reader and the runtime's
oscillator/envelope settings. Each 18-second WAV contains the opening 12 seconds,
then an editorial cut to three seconds before and after the first loop boundary.
The cut at 12 seconds is not a game loop. Samples retain runtime gain and are
not loudness-normalized. Offline rendering does not test real-time scheduling.

[Metrics](metrics.json): peak amplitude 0.026–0.037, RMS 0.00268–0.00348
(approximately 2.3 dB spread). This establishes numeric headroom and rough energy
balance, not perceived loudness, musical quality or effect intelligibility.

Validation:

- `npm run typecheck`, `npm run build`, `git diff --check`: pass.
- `npm run test:browser -- --workers=4`: full run completed, 79 passed / 44
  failed. Of the failures, 41 are Firefox launch failures. The remaining three
  were a native-probe cleanup assumption and a frame-sampled picker test tap;
  both test issues were corrected and the affected tests rerun as described below.
- `npm test`: 472 pass; four pre-existing sprite-processing tests cannot find
  `python3` on this Windows host (`python` is installed). An isolated copied-exe
  alias attempt did not finish and was stopped; no test source was changed for it.
- Focused audio and music browser tests in Chromium/WebKit: five pass, one native
  audio skip (WebKit has no usable native AudioContext on this Windows port).
  Chromium native audio passes; both browsers pass the deterministic integration
  check and unavailable-audio fallback.
- Firefox cannot launch (`spawn UNKNOWN`), including outside the sandbox after
  installing its required Playwright build. This is not an audio compatibility pass.
- Unit tests cover all six registry IDs, scene start, finish, replay/title silence,
  checkpoint continuity, score wrapping, three loops per score, bounded voices,
  muted switches, idempotent selection and stalled-clock recovery.
- Independent subagent review completed; the first-click preview effect and label
  issues it identified were fixed and re-reviewed with no remaining blockers.

## Completed listening and hosted verification

On 2026-09-20, the user confirmed the listening check was complete: "they sound
great." Human listening is approved. Playback hardware, detailed per-track notes
and Henry's individual response were not specified.

[Hosted CI run 35466275592](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/35466275592)
passed the check job for implementation commit `469d7d6`, including unit tests,
build and browser checks: 122 browser tests passed, one native-audio test skipped.
Chromium, Firefox and WebKit ran on the hosted runner, resolving the local Firefox
launch and Python executable limitations for automated verification. Native-audio
skips remain limitations of the affected host, not playback compatibility evidence.
