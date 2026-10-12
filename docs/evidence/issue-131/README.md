# Footstep and landing audio — issue #131

All WAVs are offline review evidence generated from the original project-local
oscillator scores. They are not runtime samples. No external audio source is used.

## Review samples

- [Footstep](footstep.wav): one quiet triangle tick.
- [Landing](landing.wav): one soft sine thump.
- [Gem reference](gem.wav): the unchanged reward cue, at the same master gain.
- [Movement alone](movement-only.wav): slow walk until four seconds, then run;
  landings at four and eight seconds.
- [Plains mix](plains-mix.wav) and [Frost mix](frost-mix.wav): the same movement
  with music and a gem at eight seconds, overlapping the landing and a nearby step.

The three isolated clips use equal 0.3-second measurement windows. The mixed
clips use equal twelve-second windows at 22050Hz, mono, PCM16. Measurements are
taken from floating-point OfflineAudioContext output before PCM quantization.
The renderer uses the production effect/score definitions and reproduces
RetroAudio's frequency sweeps and gain envelopes. Regenerate with:

```sh
npx --yes --package=tsx tsx scripts/render-movement-audio-samples.mts
```

A Node build with native TypeScript support can run the `.mts` file directly.
The local Node 22.22.1 build lacks that support, so verification used `tsx`.

## Mix measurements

Full precision results are in [metrics.json](metrics.json). At unchanged master
gain 0.075, isolated peaks are 0.00318 (step), 0.00501 (landing) and 0.03588 (gem).
The step and landing are 21.04dB and 17.09dB below the gem peak, respectively;
equal-window RMS differences are 27.37dB and 18.13dB.

| Music | Movement below music RMS | Mixed peak | Concurrent sounding voices |
| --- | ---: | ---: | ---: |
| Plains | 18.34dB | 0.03726 | 4 |
| Quarry | 19.80dB | 0.03921 | 4 |
| Timbers | 18.23dB | 0.03909 | 5 |
| Sunset | 18.80dB | 0.03909 | 4 |
| Frost | 20.52dB | 0.03823 | 5 |
| Cove | 20.36dB | 0.03873 | 4 |

Concurrent sounding voices count overlapping time intervals in these samples.
Production's voice map also holds queued future notes; unit tests separately
exercise its allocation cap and cleanup over a ten-minute simulated run, plus
rapid effect bursts. Neither new effect raises the maximum gain, so the existing
24 × 0.48 × 0.075 = 0.864 worst-case peak bound still holds. Offline samples do
not establish perceived balance on physical speakers; that listening check has
not been performed.

## Validation

- Focused unit coverage: speed/direction/update-rate cadence, idle, jump, wall
  contact, platform carry (including opposing motion), landing/dust threshold
  and single-fire, pit recovery, title/finish silence, pause/no backlog, unlock,
  mute, focus suspension, long-run node cleanup and voice/amplitude limits.
- Browser integration drives actual gameplay with a deterministic audio probe
  in Chromium, Firefox and WebKit: run, idle, jump, one landing, mute (including
  a muted landing), pause, focus loss and no effect replay on resume.
- `npm test -- --maxWorkers=2`: 611 tests passed across 34 files. The worker cap
  avoids host contention; an uncapped attempt timed out in an unrelated finish
  layout test. `npm run typecheck`, `npm run build`, `npm run test:ci` and
  `git diff --check` passed. Full browser-suite results are recorded in the PR.
- The focused movement-sound browser check passed in all three engines. The
  existing Firefox native-device probe may skip when its independent audio
  clock cannot start; deterministic integration and offline rendering remain
  separate from that hardware check.
- [Grounded gameplay screenshot](grounded.png): Chromium at 1366×768, route `/`,
  Skip story, Space to start, Right for 450ms, a short jump, then settle. The HUD
  stays clear of Henry and the playfield; this change adds no visual overlay.
- An independent subagent reviewed the code and evidence, then rechecked the
  opposing-platform-carry correction: no remaining blockers, 24 focused tests
  passed.
