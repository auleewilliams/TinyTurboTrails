# Retro audio

Issue #7 provides original local Web Audio synthesis with no external files,
network requests or audio dependencies. The 132 BPM, four-bar C-major loop has a
square lead and triangle bass. Six effects use distinct pitch contours, timbres
or note sequences: jump, gem, spring, damage, checkpoint and completion.

## Preview

Run `npm run dev` and open `/?audio`. Click Start music or any effect button.
M mutes/unmutes all audio. Escape pauses/resumes; leaving the window also pauses.
Stop audio cancels the loop and every scheduled voice; Start music restarts it.
The regular foundation preview also starts music after a supported keyboard,
controller or canvas pointer interaction. Browser policy may require a keyboard
or pointer interaction even when playing with a controller.

## Gameplay integration

`RetroAudio` implements `GameAudio` in `src/core/audio.ts`. `unlock()` must be
called directly from an interaction handler; construction never creates an
AudioContext. `startMusic()` records intent and can precede unlocking. Call
`play(effect)` only when the corresponding gameplay event is accepted.

The foundation already owns focus/pause/mute and calls `stop()` before scene
changes. A new scene/replay must call `startMusic()` after changing scenes.
Stop old scene audio before playing the completion cue. Dispose on teardown.
Mute and pause clear active/future notes; resume starts scheduling again without
replaying effects or catching up an old backlog. Voices have short envelopes and
are capped at 24 (oldest voice is removed when full). The master gain is 0.075;
with maximum voice gain 0.48, even 24 aligned peaks sum to 0.864, below clipping. Natural completion releases
both oscillator and gain nodes.

The `/?scene=gameplay` and `/?scene=adventure` previews now wire accepted gem,
checkpoint, spring and damage events to these effects. Title and finish screens
remain silent until a user interaction unlocks the context, as required by
browser autoplay policy. Reaching the finish plays the `complete` effect once;
the effect also remains available through the preview and interface.

## Verification (2026-09-14)

- `npm test`: 17 tests pass, including 9 audio tests for lazy unlock, rejected API
  operations, mute, pause, bounded voices, maximum burst amplitude, looping, scene stop and disposal races.
- `npm run build`: typecheck and production bundle pass.
- Browser audio tests: Chromium real Web Audio lifecycle passes. Chromium and
  Firefox unavailable-API interaction checks pass. Firefox real audio is skipped
  when a separate native-context probe cannot start its clock; this host also
  reproduced the failure on a minimal button-only page, outside the game.
- WebKit could not launch locally because required shared libraries are absent.
  No actual macOS Safari, prior major versions, speakers/headphones or physical
  controller listening checks have been performed. Musical balance and hardware
  listening review remain pending.

The browser lifecycle test uses real AudioContext with a test-only oscillator
counter. It explicitly reports a skip when the independent native audio-device
probe cannot run; that skip is not evidence of audio playback compatibility.
