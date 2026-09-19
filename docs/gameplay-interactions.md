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
and clears on recovery or a new run. Replay also resets the camera before returning
to the title. Fall recovery places Henry at the latest checkpoint
or the start, clears both velocities and gives a short safe-protection window.

Slimes can patrol. A level entity may carry `patrol: { minX, maxX, speed }`; the
run — not the level — owns where that entity currently is, so replay and
`startNewRun` put every slime back where the level planted it. `advancePatrols`
walks each patroller between its bounds at the given speed, turns it around at
each end, and re-plants it on the terrain under its new X, so a slime on a ramp
walks up the ramp. The per-frame delta is clamped like Henry's own step, so a
long frame cannot teleport a slime past him. Both gameplay scenes share one
`stepEntities` pass — patrols first, then the single contact window that used to
be copied into each scene — and the renderer draws each entity at its run
position. `validateLevel` rejects a patrol that leaves the level, excludes its
own slime, crosses ground steeper than 45 degrees, or moves faster than half of
Henry's top speed, so a patrolling slime is never unavoidable.

Every accepted interaction emits a small event (`gem`, `checkpoint`, `damage`,
`spring` or `recover`). The `/?scene=gameplay` preview consumes those events to
exercise the HUD-facing path and maps them to the future audio interface. The
preview uses the Plains level and generated atlases; title, pause/result screens,
finish handling and complete route tuning arrive in issue #6.

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
