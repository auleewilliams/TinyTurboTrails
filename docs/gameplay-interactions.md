# Run interactions — issue #5

`src/game/interactions.ts` owns the first release's in-memory run state. Stable
level entity IDs are the identity boundary: each gem is collected once, the
entity is inactive for the remainder of the run, and checkpoint recovery keeps
the collected-gem set. `startNewRun` restores every entity and clears the
checkpoint, protection timer and collected set; nothing is written to browser
storage or a server.

Damage gives Henry a short knockback and one second of invulnerability. Repeated
contact during that window is ignored, so a slime cannot create a
damage trap. Spring activation delegates to the movement launch response and
preserves horizontal speed. Each continuous contact emits one launch/event; both
gameplay scenes report separation to rearm the spring. Contact state is per spring
and clears on recovery or a new run. Replay resets the camera and immediately starts the same trail. Fall recovery places Henry at the latest checkpoint
or the start, clears both velocities and gives a short safe-protection window.

All six trails use the same lavender slime body, contact damage and speed
(36 world pixels per second). The theme selects only an accessory: Plains straw
hat, Quarry miner helmet, Timbers leaf cap, Sunset hard hat, Frost bobble hat,
and Cove snorkel mask. Sandy Cove no longer uses bouncing jellyfish.

`withSlimePatrols` authors a short route for every slime (at most 120 pixels).
It clips routes to connected walkable terrain, with a 20-pixel edge clearance
for the whole 32-pixel body, and keeps them clear of checkpoints, springs and
marked landing bands. `validateLevel` rejects routes that cross cliffs or lack
edge clearance. Some narrow routes are shorter to preserve safe landings.

The run owns each slime's position and direction. `advancePatrols` walks between
its bounds, reverses at each end, and grounds it on the current terrain. The
per-frame delta is clamped so a long frame cannot teleport a slime past Henry.
Both gameplay scenes use `stepEntities`: patrols move before contact resolution.
Pausing freezes movement; `startNewRun` restores authored positions and directions.

### Slime squash (#142)

Falling feet sweep across the slime's top before ordinary damage resolves. Both
scenes pass the movement integrator's resolved substep trajectory, so a terrain
or platform stop cannot turn a missed top into a false squash later in the step.
The same post-patrol live position is used for rendering, tops and ordinary contacts.
Top-edge overlap includes Henry's 9px half-width, the 16px body half-width and
4px extra horizontal forgiveness (29px centre separation). The top is 20px above
the ground anchor; the legacy damage window's 8px overlap above that plane does
not hurt descending feet before they can land. Side/underneath contacts still
use ordinary damage. High-speed falls that terrain has already stopped can still
squash when the pre-movement feet crossed the top.

First swept impact wins; tied tops (within 1e-8 of the step fraction) squash
together, ordered by stable entity ID. One fixed 260px/s upward impulse is applied,
with no horizontal velocity write. Any successful squash suppresses damage for
that simulation step only, including mixed unsquashed contacts; there is no new
invulnerability timer. Sequential squashes reset to the same impulse. Unlike
normal jumps, automatic squash arcs ignore jump-release extra gravity. Launch
clears coyote time, buffered jump and platform carry; landing, ordinary jumps,
springs, damage and recovery leave the automatic-bounce mode.

Flattened state is separate from `active`: the sprite stays visible while contacts
and patrols ignore it. Run-owned presentation reaches the final pose in 0.16s,
compressing the existing complete costume to 40% height and 120% width at its
ground anchor. Reduced motion shows the final pose immediately. Rendering never
advances timers. Both scenes emit one quiet squish per successful step (not per
tied slime), with no repeat sound, popup or reward. Pit and health recovery keep
flattened state; every fresh run recreates all entities.

These numeric values are provisional, not owner-approved tuning. The continuous
physics apex is about 22.5px above contact, versus 86.7px for a held normal jump;
fixed-step integration is slightly lower. Owner playtesting must judge bounce
feel, edge forgiveness, accessory readability and sound balance. No physical
controller or child playtest is claimed by automated coverage. Tools belong to
separate #186; Explore mode is not a dependency. Artwork provenance and the
reproducible atlas processor remain in `assets/source/slimes/PROVENANCE.md`.

Every accepted interaction emits a small event (`gem`, `special`, `checkpoint`, `damage`,
`spring`, `squash` or `recover`). The `/?scene=gameplay` preview consumes those events to
exercise the HUD-facing path and maps them to local synthesized audio. The
preview uses the Plains level and generated atlases; the complete map, pause/result screens and finish handling are available at `/`.

Unit tests cover stable identity, checkpoint preservation, reset semantics,
invulnerability, knockback, spring momentum, patrol bounds and safe recovery.
Chromium and Firefox smoke checks exercise the local gameplay preview; physical
controller and full manual route checks remain release verification.

## Interim static obstacle props (#191)

Static obstacle props use the legacy `hazard` authoring tag but, like decorative
trees and bushes, have no contact effect. They do not damage, knock back, flash,
start protection, play damage sound/rumble, block Henry or provide standable tops.
Their IDs, coordinates, artwork, layer and availability remain unchanged. The
shared `stepEntities` resolver is the only former static-prop damage path; terrain
and platform collision never used these props. All six trails share this rule.
Slimes retain side/underneath damage, invulnerability and top squash/bounce rules.
No solid-obstacle design is implemented; #191 holds the deferred discussion.

## Clarity and recovery (#89–#91)

Finish sprite anchors exclude measured transparent/fringe padding; on Cove's
sloped exit only finish artwork follows the terrain plane, with upright pillars.
See the [PR #190 finish-grounding evidence](evidence/issue-189/visual-clarity/README.md).

Checkpoint contact is separate from pickup contact: sweep Henry's feet from the
pre-movement to post-movement position against ±28px horizontally and from 192px
above to 28px below the planted flag. The 192px allowance covers the 128px spring
apex plus nearby terrain rises. Segment clipping rejects diagonal near misses;
recovery teleports are never swept. The active flag gains a checked gold pennant,
a short burst and a two-second message only when the checkpoint changes. Health
is not refilled on activation. All six registered levels use this rule.

`Feedback` owns presentation lifetimes (at most 24 effects): gem sparkles/+1 last
0.65s, checkpoint bursts 0.8s, spring compression/release and dust 0.3s. Dust only
starts when an airborne player lands with prior downward velocity above 180px/s.
The shipped level dust cell is reused. Damage uses the existing health flash and
one-second invulnerability timers; brightness is clipped to sprite alpha and the
protection pulse never fully hides Henry. Reduced motion removes dust expansion,
sparkle travel and spring deformation and uses steady translucent protection.
No new illustrated assets, audio triggers or collision behavior are introduced.

`HudPresentation` tracks area approach labels separately from checkpoint activation.
Movement teaching lasts at most three seconds; jump teaching lasts at most four
seconds after moving, ending immediately on a jump. Device labels follow standard
controller actions or keyboard presses, with a keyboard fallback on disconnect.
Pause exposes all movement/jump/resume/mute controls. Render calls alone cannot
advance any effect, teaching timer or location label.

## Crumbling ledges

Quarry's three 72-pixel ledges are one-way platforms above safe ordinary terrain.
First landing starts a deterministic 0.75-second warning; leaving does not stop
the countdown. Warning shake/cracks increase before collision and visibility
disappear. Recovery restores ledges while retaining gems; a fresh run resets all
entity state. Decorative material markings never use these warning animations.
Validation checks positive width, full-span in-bounds ground and at least 36px
clearance at left/center/right, with no checkpoint or required spring overlap.
Rendering reads run-owned phases and never advances timers.

## Optional special stars (#93)

[Signature challenges](signature-challenges.md) documents the three trails,
approaches, safe returns, separate once-only star counter, checkpoint retention
and fresh-run resets. `special` is an additional pickup event; its bounded 0.65s
sparkle uses `+1 STAR` and the existing pickup sound. Stars never gate the finish.

## Optional Timbers educational pilot (#189)

`EducationSession` belongs to `AdventureScene`, outside `RunState`. Its four
pickup IDs and matching slots survive every run reset and both checkpoint
recovery paths. A new scene/page session starts empty. TREE and its filled slots
remain visible; a completed word says “TREE complete!” and shows its earned
sticker. Both rewards are separate from gems/stars and cannot duplicate.

The authored letter blocks sit at world x=360 (T), 1300 (R), 3600 (E), 7100 (E),
32px above ordinary terrain. Contact accepts ±22px horizontally and ±24px
between Henry's centre and a point 20px above ground. Each stable ID fills the
first unfilled matching TREE slot, so either E can be first. These are separate
optional objects; existing level entities, totals and physics are unchanged.

An optional wooden maths sign stands at x=2350 beside ordinary trail ground,
after the old-bridge checkpoint. Enter within ±64px horizontally and ±48px of
its ground height using **E**, **standard D-pad Up (button 12)**, or its native
**Open optional maths** button. Walking past never opens it. The overworld's
**STICKERS** button, E or D-pad Up opens the two-sticker collection. These
bindings/coordinates are implementation choices, not owner-approved tuning.

Activity controls reuse `MenuOverlay` native buttons and the rendered-frame
input pattern from `PauseMenu`: Left/Right or A/D/stick/D-pad chooses; Space,
Enter on a focused button, a standard face button, or pointer confirms. Native
focus and the selected outline agree. Tab can visit the native controls.
**Escape, Start, E or D-pad Up** leaves either overlay; its Leave/Return button
also works. Leaving maths never requires an answer. Normal Escape/Start pause,
T/Return to Trails confirmation and story/navigation behavior remain intact.
Focus loss hides activity targets and preserves the question, then clears held
input on return. No answer is submitted by restoring focus.

The first maths question is fixed for the session on first maths access, using
index `220 + collectedLetterCount * 151`. This deterministic choice can produce
addition or subtraction depending on exploration order. The generator alternates
operations and enumerates all 1,326 valid operand pairs per operation; it wraps
after 2,652 questions. Choices are distinct integers in 0–50, rotated by index,
with one correct answer. Wrong choices retain the question and all gameplay
state. A single correct choice earns the number-leaf sticker immediately;
revisiting says “Already complete” and offers Leave. No quiz length is required.

Entry is checked before `SimulationClock.advance`, with a scene guard as a
second boundary. While open, the clock, elapsed animation, run/hazard/platform
and protection timers, feedback, HUD timers, weather and camera remain frozen.
Audio and rumble suspend. Closing resets clock accumulation and pending actions,
and the existing input release guard blocks held controller actions. A revision
counts every entry/exit, even a pointer exit and keyboard re-entry between two
rendered frames, so clearing input and restoring native selection cannot miss it.
Rendering reads state without advancing it. The tree and number-leaf sticker
shapes are small code-native canvas drawings; no new raster assets are needed.

Automated checks cover permutations/repeated Es, retention/reset, every question
pair, deliberate entry, no-penalty retries, full-state/pixel freeze, three input
methods, native focus, focus loss, pause transitions and controller release.
They do not establish child comprehension, enjoyment, suitable difficulty, sign
readability while moving, or physical-controller ergonomics. Those remain
parent/child and owner-led playtests before any expansion.
