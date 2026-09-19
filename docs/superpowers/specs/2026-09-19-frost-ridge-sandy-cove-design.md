# Frost Ridge and Sandy Cove design

## Goal and scope

Implement issues #34 and #35 as two selectable, forgiving desktop-browser
trails for Henry, age six. Include the shared terrain movement foundation from
#39. Sunset Site (#33) is excluded. Preserve Plains, Quarry Run and Treetop
Timbers, the existing keyboard/controller inputs, and memory-only progress.

Each new trail targets roughly 3–5 minutes of exploratory play, with six
checkpointed sections, at least thirty gems, optional jumping rewards, and a
finish reachable without precise platform timing. Both remain contiguous,
single-height ground contours with gentle ramps. Required routes have no lethal
pits. Validate completion with deterministic gameplay simulation; route length
alone is not evidence of play duration.

## Shared terrain movement

Extend `Surface` with optional `friction`, `speedMultiplier`, and `material`
properties. Friction and speed default to 1; omitted material means ordinary
ground. Material is `ice`, `sand`, or `water` and supplies the visual cue rather
than silently changing physics. Explicit movement values live in level data.

Friction multiplies ground acceleration and braking, including acceleration
against current travel when reversing direction. It does not multiply air
acceleration or change top speed. The speed multiplier controls the ground
target speed. Reduce excess incoming speed toward that target at the ground
braking rate rather than abruptly clamping it to the slower zone's limit.
Maintain the existing global maximum speed and slope behavior.

Use one shared surface lookup for height, slope and movement properties, with
consistent boundary selection. Apply material effects only when supported by
terrain, never merely because Henry is above it or standing on a platform.
Jumping retains horizontal momentum and the existing air controls; landing
restores the material's ground behavior on subsequent simulation steps.

Initial tuning: ice friction 0.45 and speed 1; sand friction 1 and speed 0.8;
water friction 1 and speed 0.65. Validate finite friction in [0.25, 2] and finite
speed multipliers in [0.5, 1]. Reject unsupported materials and authored special
materials without their intended movement properties. Tune within these bounds
if route tests show unfair or imperceptible behavior, documenting final values
in `docs/gameplay-movement.md`.

Separate speed tuning is necessary: scaling acceleration and braking alone
does not reduce eventual running speed on sand or in water. One shared surface
contract supports both biomes without biome-specific branches in movement.

## Frost Ridge

Register `FROST_RIDGE`, ID/atlas `frost`, after the existing trails. Author it in
`src/world/frost-ridge.ts`, keeping the level registry small. Use a pale blue
sky, white snow, dark-blue terrain edges, snow-covered firs, and icicle hazards.

Introduce the first ice patch on a broad flat with a normal-snow approach and
runout. Later sections combine snowy climbs, safe flat ice patches, springs,
and optional elevated gems. Ice never occupies ramps or hazardous descents.
Provide at least 240 pixels of ordinary flat runout between an ice patch and
the next hazard, and keep hazards off the ice. Place checkpoints on normal
ground away from hazards and springs. Preserve normal maximum running speed.

Ice is a continuous cyan band with bright glints that begins and ends at the
exact collision-surface boundaries. Its appearance must remain recognizable
over the atlas texture and at fractional camera offsets.

## Sandy Cove

Register `SANDY_COVE`, ID/atlas `cove`, after Frost Ridge. Author it in
`src/world/sandy-cove.ts`. Use a sunny beach palette, palms, sand, driftwood
springs and jellyfish artwork in the existing slime asset slot.

Alternate ordinary firm ground, short soft-sand patches and shallow-water
flats. Introduce each slow material in a clear, safe space. Water is traversable
ground, with no damage, knockback, drowning, or swimming input. Draw amber
stippling for soft sand and a blue band with repeated wave marks for water,
aligned with surface boundaries. Avoid steep approaches to slow zones.

Jellyfish replace slimes visually and bounce visibly with a small deterministic
vertical motion. Keep their visible positions and interaction positions in
sync, using run time so pausing also pauses the bounce. They retain familiar
slime contact/stomp behavior and are restricted to firm ground, well away from
water and checkpoints. The statement that shallow water should never knock
Henry back applies to the water; jellyfish remain recognizable avoidable
creatures. Space them sparsely to keep Cove gentler than Frost Ridge.

## Art and rendering

Use the built-in image generator to create separate 16-cell biome sheets in
the established `WORLD_ASSETS` order. Save original sheets, exact prompts and
provenance under `assets/source/frost/` and `assets/source/cove/`. Process them
through the existing atlas pipeline into project-local RGBA atlases and
manifests under `public/assets/frost/` and `public/assets/cove/`. Inspect visible
bases and terrain tops; author each manifest's anchors from its own art.

Reuse the current atlas map, preload/error handling, title-screen picker, and
asset names. Gems, checkpoints, springs and finish arches must remain legible
against both new palettes. Preserve the character art. Material markings are
small deterministic canvas overlays drawn after terrain textures; they do not
require separate images or change collision geometry.

## Runtime integration and documentation

Extend entity data only as needed for optional deterministic bouncing, with
bounded amplitude/period validation and defaults preserving existing entities.
The run owns animation time and computes a single position for rendering and
interactions. Replay and level selection reset it consistently.

Update `docs/REQUIREMENTS.md` from three to five shipped levels and explicitly
include the Frost and Cove atlases and material behavior. Update gameplay and
asset documentation and add verification evidence. Do not introduce backend
services, credentials, browser-storage persistence or runtime generation.

## Verification and review

Add focused movement tests for default compatibility, ice release and reversal,
sand/water running speed, gradual entry, exact material boundaries, jumping,
landing, and platform support over special ground. Add validation tests for
nonfinite and out-of-range properties. Test bounce pause/reset behavior and
agreement between visual and interaction positions.

Test both level registrations, terrain continuity, checkpoint safety, safe ice
runouts, atlas completeness, harmless water traversal, and deterministic finish
completion. Update test fixtures that currently supply only Plains and Timbers
atlases. Browser coverage must select both trails with the existing picker,
verify their assets load, exercise material sections, and check replay. Capture
screenshots of each biome and its surface cues for the PR.

Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:browser`
(Chromium, Firefox and WebKit), and `git diff --check`. Record limitations rather
than treating unavailable checks as passes. Use Node.js 22.12 or newer.

The primary agent implements the work in this existing worktree. A separate
subagent reviews the completed diff for correctness, gameplay fairness,
regressions and issue coverage. Resolve important findings, rerun affected
checks, then commit, push and open one PR linking #34, #35 and dependency #39.
