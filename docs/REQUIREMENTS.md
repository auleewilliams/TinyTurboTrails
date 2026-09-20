# TinyTurboTrails — agreed requirements

This file is the canonical statement of the agreed requirements for the current game. Historical release evidence is scoped to its dated commit.

**Changing a requirement means editing this file** — not an issue body. Keeping a
single source avoids duplicated guidance drifting apart.

## Audience

Henry, age six, with some experience playing Sonic. Keep the game forgiving and
readable at speed.

## Character and art direction

Henry is a detailed pixel-art child with brown hair, a yellow hard hat, bright
safety vest, and work boots, in an original Minecraft-inspired blocky world. He
is a detailed child in a blocky world — not a cuboid Minecraft avatar.

## Current scope

Six desktop-browser levels selected from a illustrated overworld: Plains,
Quarry Run, Treetop Timbers, Sunset Site, Frost Ridge and Sandy Cove. All routes target roughly
3–5 minutes of exploratory play, with momentum, slopes and springs. Quarry Run adds spring pits, stepped terraces,
grouped stone hazards and two slow moving platforms; both rides are optional
and no route depends on timing one. Treetop Timbers adds plank trails, shallow
rope-bridge contours, crane-hook springs and sawhorse hazards without changing
the single-height terrain model. Sunset Site adds a construction yard at dusk,
patrolling cement slimes, pneumatic-jack-cleared pits and one optional crane ferry. Keyboard
and standard-controller support.
Henry starts each run with three visible hearts. Each unblocked slime or
hazard hit removes one pip; losing the last pip returns him to the latest
checkpoint, or the level start, and refills all three. Pit recovery also refills
health without costing a pip, while activating a checkpoint does not heal him.
Quarry Run reuses the Plains atlas; Treetop Timbers and Sunset Site each ship a
project-local 16-cell atlas. Frost Ridge and Sandy Cove each ship their own 16-cell atlas.
Frost Ridge introduces clearly marked flat ice patches with reduced ground
acceleration and braking, normal top speed, and safe snow runouts. Sandy Cove
uses soft sand and harmless shallow water to slow running, with sparse bouncing
jellyfish on firm ground retaining familiar slime contact damage. Both new
trails have six checkpoints and optional spring-launched bonus gems; their main
routes can be completed without timed jumps. Moving platforms are drawn from
the level's own theme colors.

## Target browsers

Current stable desktop Chrome, Firefox and Safari (Safari on macOS), plus the
immediately preceding major version of each. Bundled Playwright engines are automated coverage, not evidence that the installed version matrix or Safari on macOS was tested.

## Out of scope

No mining, building, crafting, loops, charged dashes, additional biome artwork
beyond the shipped trail presentation, touch controls,
public hosting or persistent progress. Public hosting means a public domain, TLS or exposure
beyond the home LAN; running the built container on a home server for LAN-only
access (issue #77) is self-hosting, not public hosting, and is in scope. Nothing
about progress or persistence changes: the game remains in-memory only when
self-hosted.

## Asset generation

Illustrated assets use the built-in image generator. No API key, no paid API
workflow, no exact image-model requirement, and no runtime generation
dependency — the shipped game never calls an image generator.

## Progress and persistence

Run progress and separate cosmetic completion badges exist only in memory. Checkpoint retries
preserve collected gems and special stars. Current health is also memory-only and resets on
respawn, replay and level selection. Replay, reload or closing the page starts a
fresh run. Level changes also clear special stars. Do not persist checkpoints,
gems, stars or health in browser storage.

## Gameplay clarity and forgiving recovery

Checkpoint flags activate within a local region that covers walking, jumps and
spring arcs, including crossings between simulation steps. Activation never heals;
recovery still refills health and retains gems. A checked gold flag remains at the
active checkpoint, with one brief burst, “Checkpoint reached!” and the existing
sound when activation changes. Replay and level selection clear this state.

The gameplay HUD separates three recognizable hearts from the gem total. Empty
hearts remain outlined; the recently lost heart briefly highlights. Internal IDs
are never displayed. Friendly area names appear briefly on approach, yielding to
the checkpoint celebration. Short movement/jump hints follow the input actually
used, disappear after learning or a timeout, and fall back to keyboard after a
controller disconnect. Full controls remain available while paused.

Gem pickups sparkle with “+1”; meaningful landings use the shipped dust art;
springs compress/release on their existing launch event. Damage brightens Henry's
sprite and fades it during protection, preserving his silhouette. Presentation
has bounded counts and lifetimes, freezes on pause, clears on replay/level changes,
and reduces nonessential motion with the system preference. Effects never change
simulation, pickup counts, health rules or sound timing. No progress is persisted.


### Per-level soundtrack (#108)

Every registered playable level selects an original local synthesized score by
stable level ID. Scores must differ in melody, rhythm and instrumentation. Start
and replay select/reset the appropriate score, checkpoints preserve musical
progress, and finish stops music before the existing completion cue. Title/menu
compositions are out of scope. Preview every score at `/?audio`. Preserve unlock,
mute, pause/focus, silent fallback and bounded scheduler/voice lifecycle.
Automated checks and headroom measurements supplement a human listening review
of mood, repetition and effect intelligibility; see `docs/AUDIO.md`.

## Trail presentation and navigation (#94, #87, #92)

All six destinations remain unlocked, with recognizable landmarks, a stable
dotted path, selected Henry marker, matching cached preview and accessible Play
action. Keyboard, pointer and standard-controller selection share state.
Finish offers Replay, Next trail (except the final trail), and Choose trail.
New runs reset all simulation and presentation state. Map return retains the
completed selection and gives brief nonblocking feedback; page reload clears
cosmetic completion badges. Held input must not cross a screen boundary.

Every route has a quiet material fill and illustrated contour edge, including
Plains exposed rock sections, Quarry stone, Timbers wood, construction gravel,
Frost snow over rock and Cove sand. Grip cues derive independently from authored
friction and draw above decorative materials. Quarry and Timbers add continuous
backgrounds with supported landmarks. Keep collisions, anchors, movement and
entity placement unchanged. Respect reduced motion and loading/error/retry.

The parent-led landmark/navigation check with Henry remains a separate acceptance
step; automated tests cannot satisfy it. Current controls live in the adventure guide.

## Optional signature challenges (#93)

Plains, Quarry Run and Treetop Timbers each contain exactly three gold star
collectibles, visually distinct from ordinary gems. Plains rewards controlled
movement down a readable slope; Quarry offers a detour up the existing lift and
along a broad shelf; Timbers rewards the first three existing springs with clear,
wide landing markings. All use existing movement and one-way platform systems.
Stars and challenges never gate completion, require new controls, or require
precise timing. Misses land on ordinary terrain or use existing checkpoint
recovery. Other trails have no star requirement and no empty star HUD.

Count stars separately from gems, once per stable entity ID. Both pit and health
recovery preserve them. Replay, level changes and page reload create fresh star
state. A compact in-run `STARS n/3` indicator and a separate finish result show
progress even at zero; Replay, Next trail and Choose trail retain their behavior.
All progress remains in memory, with deterministic simulation and project-local
art/provenance. Automated reachability and visual checks do not establish Henry's
understanding or enjoyment; no child playtest is claimed for this milestone.
