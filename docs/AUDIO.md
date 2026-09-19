# Retro audio

All music and effects are original project-local Web Audio oscillator synthesis.
No recordings, borrowed melodies, external services, credentials or persistence
are used. Scores live in `src/core/music.ts`; scheduling lives in `retro-audio.ts`.

| Level ID | Composition | BPM | Character |
| --- | --- | --- | --- |
| plains | Meadow morning | 132 | Bouncy square lead, light triangle bass |
| quarry | Pebble parade | 108 | Rounded triangle lead, syncopated low stone pulse |
| timbers | Canopy caper | 120 | Short woody plucks, grouped canopy runs |
| sunset | Golden girders | 126 | Warm sawtooth groove, quiet metallic sine accents |
| frost | Snowlight glide | 92 | Long clear sine phrases, spacious low accompaniment |
| cove | Tidepool holiday | 100 | Sunny sine melody, buoyant offbeat bass/percussion |

Each score has four independently authored two-bar phrases and a second pass
with quiet answering plucks: sixteen bars total (29–42 seconds). Melodies,
rests, bass progressions, percussion patterns and lead envelopes vary by level.
The score reader wraps exactly at 128 eighth-note steps. Oscillators fade to zero
before stopping; scheduling uses the audio clock through loop boundaries.

## Preview

Run `npm run dev` and open `/?audio`. Choose a Level soundtrack, then click Start music or any effect button.
Changing the selection auditions it immediately; Start music restarts that score.
M mutes/unmutes all audio. Escape pauses/resumes; leaving the window also pauses.
Stop audio cancels the loop and every scheduled voice; Start music restarts it.
The regular foundation preview also starts music after a supported keyboard,
controller or canvas pointer interaction. Browser policy may require a keyboard
or pointer interaction even when playing with a controller.

## Gameplay integration

`RetroAudio` implements `GameAudio` in `src/core/audio.ts`. `unlock()` must be
called directly from an interaction handler; construction never creates an
AudioContext. `startMusic(trackId)` records intent and can precede unlocking. Call
`play(effect)` only when the corresponding gameplay event is accepted.

The foundation already owns focus/pause/mute and calls `stop()` before scene
changes. Adventure starts the selected level ID only when leaving the title. Replay returns
to a silent title; starting again resets the selected track. Checkpoint recovery
does not change music. Unknown custom level IDs fall back to Plains; unit tests
require explicit score coverage for every registered playable level.
Stop old scene audio before playing the completion cue. Dispose on teardown.
Mute and pause clear active/future notes; resume starts scheduling again without
replaying effects or catching up an old backlog. Voices have short envelopes and
are capped at 24 (oldest voice is removed when full). The master gain is 0.075;
with maximum voice gain 0.48, even 24 aligned peaks sum to 0.864, below clipping. Natural completion releases
both oscillator and gain nodes.

The `/?scene=gameplay` and `/?scene=adventure` previews now wire accepted jump,
gem, checkpoint, spring and damage events to these effects. Title screens have no composition. Finish stops music before its one-shot cue. Reaching the finish plays the `complete` effect once;
the effect also remains available through the preview and interface.

## Verification (2026-09-14)

- `npm test`: 48 tests pass, including 9 audio tests for lazy unlock, rejected API
  operations, mute, pause, bounded voices, maximum burst amplitude, looping, scene stop and disposal races.
- `npm run build`: typecheck and production bundle pass.
- Hosted browser audio and adventure-fallback checks pass in Chromium, Firefox and
  WebKit; the full hosted suite reports 53 of 54 checks passed in run
  [34902763600](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/34902763600).
  Firefox real audio is skipped
  when a separate native-context probe cannot start its clock; this host also
  reproduced the failure on a minimal button-only page, outside the game.
- WebKit could not launch locally because required shared libraries are absent.
  No actual macOS Safari, prior major versions, speakers/headphones or physical
  controller listening checks have been performed. Musical balance and hardware
  listening review remain pending.

The browser lifecycle test uses real AudioContext with a test-only oscillator
counter. It explicitly reports a skip when the independent native audio-device
probe cannot run; that skip is not evidence of audio playback compatibility.

## Issue #108 validation

See [evidence and listening notes](evidence/issue-108/README.md). Unit coverage
checks all registry IDs, exact score wrapping, repeated transitions, three loops
per score, replay/title silence, checkpoint continuity and no catch-up burst.
Browser integration checks preview selection, first-click effects, selected-level
start and pause/resume; native device tests remain separate.

Music voice gain is at most 0.25 versus effect gain 0.48. The unchanged 24-voice
cap and 0.075 master bound summed peaks below 0.864, including busy effects.
This is a numerical headroom guarantee, not proof of perceived loudness or
intelligibility. On 2026-09-20 the user confirmed the listening check was complete
and reported that the tracks "sound great." Hardware and Henry's individual
response were not specified. Hosted CI passed with 122 browser checks and one
native-audio skip; see the evidence notes for details.
