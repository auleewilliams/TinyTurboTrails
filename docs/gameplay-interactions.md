# Run interactions — issue #5

`src/game/interactions.ts` owns the first release's in-memory run state. Stable
level entity IDs are the identity boundary: each gem is collected once, the
entity is inactive for the remainder of the run, and checkpoint recovery keeps
the collected-gem set. `startNewRun` restores every entity and clears the
checkpoint, protection timer and collected set; nothing is written to browser
storage or a server.

Damage gives Henry a short knockback and one second of invulnerability. Repeated
contact during that window is ignored, so a slime or hazard cannot create a
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

Slimes remain hazards to avoid and cannot be defeated. Henry's possible tools
and future interactions are deferred to GitHub issue #142. Artwork provenance
and the reproducible atlas processor are in `assets/source/slimes/PROVENANCE.md`.

Every accepted interaction emits a small event (`gem`, `special`, `checkpoint`, `damage`,
`spring` or `recover`). The `/?scene=gameplay` preview consumes those events to
exercise the HUD-facing path and maps them to local synthesized audio. The
preview uses the Plains level and generated atlases; the complete map, pause/result screens and finish handling are available at `/`.

Unit tests cover stable identity, checkpoint preservation, reset semantics,
invulnerability, knockback, spring momentum, patrol bounds and safe recovery.
Chromium and Firefox smoke checks exercise the local gameplay preview; physical
controller and full manual route checks remain release verification.

## Clarity and recovery (#89–#91)

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
