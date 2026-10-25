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

## Optional six-trail spelling (#189)

Maths is deferred to [issue #193](https://github.com/auleewilliams/TinyTurboTrails/issues/193).
There is no activity sign/spot at the former x=2350 location, no in-trail activity
entry route, question generator, answer control or number-leaf sticker artwork.
E / standard D-pad Up has no activity effect while playing.

`EducationSession` belongs to `AdventureScene`, outside `RunState`. Its collected
IDs, correct placements and earned stickers are independent for each trail and
survive recovery, replay, map return and trail switching. Reload starts empty,
with no browser storage.

Shared `TRAIL_WORDS` configuration assigns Plains HILL, Quarry ROCK, Timbers TREE,
Sunset BEAM, Frost SNOW and Cove SAND. Each trail has four blocks at x=360,
1300, 3600 and 7100, 32px above ordinary terrain. Contact accepts ±22px
horizontally and ±24px between Henry's
centre and a point 20px above ground. The bag count increases once per stable ID,
with a 0.65-second letter flight toward the bag (a brief local cue with reduced
motion). Collection never writes word spaces or earns rewards. These optional
objects do not alter level entities, totals or physics.

The compact gameplay pouch has four hollow/filled marks, one per pickup ID.
Marks use collected identities, including separate Es and Ls, and remain filled
after manual placement. The target word and letter glyphs stay out of this HUD;
the existing brief pickup flight still identifies a letter just collected.
Gem and optional-star pixel icons sit beside numeric counts; hearts retain
their full, empty and recently-hit colours. These shorter plaques reuse the
existing interface image and its text-safe slices, without new generated art.

Once per run, the existing hint lane briefly introduces the bottom ribbon:
“Trail: Henry = you; posts = saves; flag = end”. Movement/jump teaching,
location/checkpoint notices, damage recovery and pickup feedback take priority.
The cue receives four seconds of unobstructed active presentation time; pause,
activities and results do not spend it. Replay or starting another trail resets
the cue. The ribbon remains at (285, 221), 136 × 14, with unchanged position,
checkpoint and finish-boundary mapping. See [#212 evidence](evidence/issue-212/README.md).

Finishing any of the six trails marks completion and opens results. Build your word
deliberately opens the optional assembly.
The target appears above four spaces; a deterministic pile ordered by original
slots 4, 2, 1, 3 includes only collected, unplaced identities. Repeated Es and Ls
remain separate. Native labels number repeated letters 1 and 2. Drag a tile into
a matching space, or select a letter and then a space with Tab + Enter/Space or
left/right + standard face button. Native buttons mirror canvas targets and
report selection/placement through accessible labels and the status region.
Wrong/occupied/outside drops leave letters safe; cancelled drags and switching
input methods cannot commit a placement. Correct spaces persist forgivingly.
Only manual completion earns the trail sticker once per session: a hill, rock,
tree, hard hat on a steel beam, snow-capped mountain or sandcastle. Each is a
generated 56 × 56 sticker in one matching style (#194), dimmed in the collection
until earned. The approved builder-kit pouch and blank wooden tile are shared
across all trails, with letters drawn separately. Eight small local images load
through the adventure's existing required-artwork/Retry flow; a missing sticker
shows Retry rather than a fallback. Focus uses an outer frame and caret; the
tile in hand retains an inset frame after focus moves to a space.

Correct manual completion switches to WORD COMPLETE!, keeping the target and
assembled tiles visible above the centered existing sticker and earned message.
Done is the sole action, with the same canvas label and accessible name; native
focus and controller selection move to it immediately and on completed reentry.
The footer says Done: return to trail results. This is a still presentation, with
no motion or delay in either motion preference. Completion rearms controller
confirmation and clears pending input at the overlay revision boundary; native
Enter/Space keydown suppresses repeats and keyup activation. A fresh Done
confirmation returns to the same results with Next trail (or final Map) selected
and focused. World simulation remains paused throughout assembly and success,
without catch-up; no word, collection, penalty or session reward rules change.

Find more letters appears while any pickup is missing. It closes the activity
and places Henry 28px before finish, with zero velocity and grounded feet, while
retaining the identical `RunState`, all progress and completion result. No level
load/restart or missing-letter teleport occurs. The finish latch stays disarmed
until Henry moves at least 70px before finish; a fresh crossing shows the same
results again, without reopening the activity, and Build your word re-enters it. Input-driven simulation coverage retraces the actual terrain of all
six trails, including reverse pit-edge jumps, springs and platform areas, to all
four missed letters without recovery, then returns to finish. No position writes
occur after the initial finish fixture. The finish never opens the activity by
itself; Build your word opens it, and incomplete Leave activity, completed Done,
or Escape/Start returns to the
results with Next trail (or Map on the final trail) selected.

The overworld STICKERS button, E or standard D-pad Up (button 12) opens the
six-sticker collection in a three-column, two-row grid. Each trail shows its own
earned status or partial word, and accessible text describes all six statuses.
Its only native target is Return to map, selected
and focused on entry. Pointer, Tab/Enter/Space and standard face-button access
remain. Escape, Start, E or D-pad Up also closes it. Held confirmation must be
released before controller confirmation. Normal pause, Return to Trails and
map navigation remain intact. Focus loss hides targets and cancels dragging.

The shared overlay revision boundary stops simulation, animation, timers, audio
and rumble before clock advancement. Closing clears time debt and held actions;
revision counts every entry/exit, including between rendered frames. Rendering
never advances state. Finish grounding and harmless static props/slime contact
remain unchanged. Automated input does not establish child comprehension,
enjoyment or physical-controller ergonomics; those remain owner-led acceptance.
