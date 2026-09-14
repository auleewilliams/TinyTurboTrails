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
preserves horizontal speed. Fall recovery places Henry at the latest checkpoint
or the start, clears both velocities and gives a short safe-protection window.

Every accepted interaction emits a small event (`gem`, `checkpoint`, `damage`,
`spring` or `recover`). The `/?scene=gameplay` preview consumes those events to
exercise the HUD-facing path and maps them to the future audio interface. The
preview uses the Plains level and generated atlases; title, pause/result screens,
finish handling and complete route tuning arrive in issue #6.

Unit tests cover stable identity, checkpoint preservation, reset semantics,
invulnerability, knockback, spring momentum and safe recovery. Chromium and
Firefox smoke checks exercise the local gameplay preview; physical controller
and full manual route checks remain release verification.
