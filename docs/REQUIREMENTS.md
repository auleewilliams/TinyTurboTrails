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
grouped stone props and two slow moving platforms; both rides are optional
and no route depends on timing one. Treetop Timbers adds plank trails, shallow
rope-bridge contours, crane-hook springs and sawhorse props without changing
the single-height terrain model. Sunset Site adds a construction yard at dusk,
patrolling hard-hat slimes, pneumatic-jack-cleared pits and one optional crane ferry. Keyboard
and standard-controller support.
Henry starts each run with three visible hearts. Each unblocked slime contact
removes one pip; losing the last pip returns him to the latest
checkpoint, or the level start, and refills all three. Pit recovery also refills
health without costing a pip, while activating a checkpoint does not heal him.

**Interim obstacle decision (#191):** every static obstacle prop across all six
trails behaves like pass-through scenery: no damage, knockback, damage flash,
invulnerability, rumble, blocking or standable top. Keep the existing artwork
(including original yellow/black sawhorse stripes), placements and rendering
layers; the legacy `hazard` authoring tag does not imply damage. No new ground
footprints/brackets are wanted. Slime contact/squash rules, pits, terrain, springs,
checkpoints and moving platforms remain unchanged. Whether any props should
later become solid, standable or damaging is deferred owner-led discussion, not
approved implementation.

Quarry Run reuses the Plains atlas; Treetop Timbers and Sunset Site each ship a
project-local 16-cell atlas. Frost Ridge and Sandy Cove each ship their own 16-cell atlas.
Frost Ridge introduces clearly marked flat ice patches with reduced ground
acceleration and braking, normal top speed, and safe snow runouts. Sandy Cove
uses soft sand and harmless shallow water to slow running, with sparse patrolling
snorkel slimes on firm ground retaining familiar slime contact damage. Both new
trails have six checkpoints and optional spring-launched bonus gems; their main
routes remain forgiving, with short slime patrols to jump over. Moving platforms are drawn from
the level's own theme colors.

## Supported devices and input

Desktop/laptop only for now, as agreed in
[the owner decision for #215](https://github.com/auleewilliams/TinyTurboTrails/issues/215#issuecomment-6402075594).
Gameplay uses the existing keyboard or standard-controller move/jump bindings.
Pointer input operates menus, Pause/settings and optional word-building; it does
not provide movement or jumping. Pointer-operable menus do not establish
phone/tablet gameplay support.

Phone/tablet play, touch movement/jump controls and mobile-specific portrait
redesign are out of scope for now. Narrow or tall desktop windows remain layout
checks, not phone/tablet acceptance. Keep the existing aspect-preserving camera,
resizing and fullscreen behavior; this decision adds no minimum screen resolution
or orientation lock. See [desktop check guidance](BROWSER-REPORTING.md#desktop-support-check-guidance)
for applicable checks and reporting limits.

## Target browsers

Current stable desktop Chrome, Firefox and Safari (Safari on macOS), plus the
immediately preceding major version of each. Bundled Playwright engines are automated coverage, not evidence that the installed version matrix or Safari on macOS was tested.

## Viewport presentation

Fit the existing 426×240 camera with the largest uniform scale that leaves the
visible Pause button clear of the entire canvas. Sound and rumble move into the
shared pause surface, with independent On/Off text and accessible toggle state. Fractional
scaling is approved: pixel widths can vary at non-integer scales, but artwork
proportions, gameplay, HUD and menu targets must never be stretched or cropped.
Use natural tall/wide desktop-window margins for controls wherever possible; otherwise
choose the larger fit beside or above a rail sized to the controls plus a small
gap, without integer-scale drops.
Unavoidable margins use the dark UI panel color rather than a broad teal surround.
Pause and its settings remain independently operable by pointer, native keyboard
and standard-controller navigation in map, play and finish states. Resume receives
native focus; leaving gameplay pause restores the canvas, and map/results restore
the selected action. Return to Trails is available only for a live run, with the
existing reset confirmation. Gold navigation selection never represents enablement. Status announcements stay available to assistive
technology without duplicating the gameplay HUD. Resize and app fullscreen retain
the complete game, native menu targets and controls, with no document overflow.

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
Each landmark has a readable short label beneath its art: Plains, Quarry,
Timbers, Sunset, Frost and Cove (#213). Full trail names remain in the selected
panel and native accessible names. Labels clear art, visible paths, selection
frames, Henry and completion marks at logical 426 × 240, small 320 × 240 and
desktop 1366 × 768; their visible area also accepts pointer selection.
Finish shows its results first and offers Next trail (except the final trail), Map,
Build your word and Replay. Next trail is the default, or Map on the final trail.
Rendered labels, accessible names and input targets match.
New runs reset all simulation and presentation state. Map return retains the
completed selection and gives brief nonblocking feedback; page reload clears
cosmetic completion badges. Held input must not cross a screen boundary.

The selected map trail's preview panel shows the session best for gems and stars,
independently (#136). Totals derive from level data.
Results appear only after completing that trail, never decrease during the page
session and clear on reload. Trails without stars omit that result. This state
is cosmetic, never passed to simulation or storage, and never gates a trail.
Symbols and accessible landmark descriptions identify each reward without
relying on colour. Previews, results, navigation targets and prompts stay clear
of each other at native resolution and in small windows.

Every route has a quiet material fill and illustrated contour edge, including
Plains exposed rock sections, Quarry stone, Timbers wood, construction gravel,
Frost snow over rock and Cove sand. Grip cues derive independently from authored
friction and draw above decorative materials. Quarry and Timbers add continuous
backgrounds with supported landmarks. Decorative art updates preserve collisions,
anchors and movement; optional challenge additions follow the rules below.
Respect reduced motion and loading/error/retry.

Sunset Site, Frost Ridge and Sandy Cove also have dedicated illustrated panoramas
(#139). They pan within image bounds across the full route without repeating the
old enlarged skyline cells. Background contrast must preserve readability of
Henry, hazards, pickups and terrain/material cues at 426 x 240. Map previews use
the same backgrounds. Ship these panoramas at native draw height and keep their
original images, prompts and reproducible packaging in the source tree.

The gameplay atlas, Henry sprite sheet, declared scenery packs and dedicated
panoramas are required:
their failure keeps the existing Retry flow. Shared terrain materials and trail
backdrops are decorative enhancements; if either fails to load, trails remain
playable using their solid theme colors, contour edges and ordinary parallax.

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
progress even at zero; Replay, Next trail and Map retain their behavior.
All progress remains in memory, with deterministic simulation and project-local
art/provenance. Automated reachability and visual checks do not establish Henry's
understanding or enjoyment; no child playtest is claimed for this milestone.


## Henry's celebration and Patchwork Vale exploration (#119, #195)

The [story reference](patchwork-vale-story.md) defines Henry Turbo as an
explorer of Patchwork Vale. Each of the six trails is an independent outing:
choose a place, explore, discover collectibles and celebrate reaching the end.
There is no crisis, gathering, mission, overall ending or completion obligation,
and the game promises no quests, repairs, construction, interiors or new
progression. Letters and stickers remain optional and never gate completion.

Both `/` and `/?scene=adventure` start and reload directly on the trail map with
Plains selected; there is no opening picture story, story replay, reunion picture
or story-only key/controller binding. All six trails stay open and all state
stays in memory. Plains' map description is **Over grassy hills**.

Every trail, Plains included, finishes with its own landmark, Henry's cheer, the
**Another trail explored!** message and ordinary results. Every trail uses Henry's non-looping eight
celebration poses over about 1.2 seconds, then holds victory. A bounded sparkle
burst ends within two seconds. Reduced motion shows still victory and static
sparkles immediately. A dedicated timer resets on finish/run reset, advances
while menu input waits for release, and freezes on pause/focus loss. Finish
actions remain usable immediately; results and controls stay clear at 426×240
and 320×240. Existing gameplay frames and deterministic simulation are preserved.

No inventory, vehicles, dialogue system, persistent saves or quest mechanics are
introduced. Child comprehension and celebration readability remain a documented
parent-led follow-up, not an automated acceptance claim.

All six trails share lavender slimes with a common body, size, speed and short,
edge-safe patrols. Accessories vary by trail; see `gameplay-interactions.md`.

## Slime squashing (#142)

Falling onto a slime from above squashes it without damage, with forgiving top
edges. Unsquashed side/underneath contact still hurts. A squash gives one small,
fixed-height automatic bounce, unaffected by holding or releasing jump and
preserving sideways motion. Sequential squashes use the same impulse, never a
growing bounce. Simultaneous top contacts flatten together with one bounce and
one soft playful squish; successful squashes take priority over same-step damage.

Slimes stay visibly flattened, harmless, nonblocking and stationary on the ground,
with recognisable accessories and a quick squash animation. They cannot trigger
another bounce or sound. There is no reward, extra collectible or popup. Both pit
and health checkpoint recovery retain flattened state for the current run;
restart, replay, map re-entry and starting another trail restore upright slimes.
All state remains in memory. No weapons, construction/digging tools (#186), or
Explore mode are introduced. Exact bounce/edge tuning and child-facing readability
remain owner playtest decisions; implementation values are documented in
`gameplay-interactions.md` rather than treated as approved requirements.

## Optional spelling across all six trails (#189)

The owner has removed maths from PR #190. The activity spot, sign/prompt,
questions, answer controls and number-leaf reward are absent, not hidden or
feature-flagged. The deferred design is tracked in
[issue #193](https://github.com/auleewilliams/TinyTurboTrails/issues/193).

Use one shared activity with independent per-trail bags, partial assembly and
stickers: Plains HILL, Quarry Run ROCK, Treetop Timbers TREE, Sunset Site BEAM,
Frost Ridge SNOW and Sandy Cove SAND. Preserve Timbers' accepted positions and
identities; both Es in TREE and both Ls in HILL have independent identities and
cannot be credited or used twice. Letter progress survives
checkpoint/health/pit recovery, replay, map return and trail changes in memory;
reload clears it. No browser storage, new gates or changes to gems/stars/totals.

The in-trail HUD shows a bag and collected count. Four pickups can be collected
in any order; a brief letter flight gives feedback. Collection never fills the
word or awards a sticker. Finishing shows the ordinary celebration and results;
only the deliberate Build your word action opens the optional activity, and skipping it
keeps completion and every collected letter. In the activity,
the current trail word is shown above four spaces, with a mixed pile containing
only actual collected letters. Pointer drag/drop and keyboard/controller
select/place build the word manually without typing. Either repeated identity can occupy either
matching space, once only. Wrong/occupied/outside placements roll back without loss.
Only correct manual assembly earns that trail’s themed sticker, once per trail
per session. Letters and stickers never cross-award between trails. Completion immediately
shows WORD COMPLETE!, the unobscured target and assembled word, the existing
trail sticker centered below the tiles, and its success message. Its only action
is Done, with that exact visible label and accessible name, selected and natively
focused on completion and completed-word reentry. Done returns to the same trail
results with Next trail (Map on the final trail) selected and focused. Placement
instructions become a completion prompt. The still reward presentation is clear
without animation or delay, including reduced motion. Held final placement
Enter/Space/repeats/key release or controller confirmation cannot activate Done;
a fresh confirmation acts once. Reentry, replay, map and trail switching retain
letters, assembled words and exactly one sticker per completed trail.

When letters are missing, Find more letters closes the activity and puts Henry
beside the finish in the same completed run. Preserve letters, gems, stars,
checkpoint, squashed slimes and other run state. Henry retraces the existing
trail himself; no missing-letter teleport, restart, substitute letters or terrain
changes. The finish latch rearms after leaving the finish area and allows another
crossing. Correct partial placements remain. Incomplete Leave activity exposes ordinary
finish choices. The overlay freezes deterministic simulation and clears held
input/focus and clock debt at its boundary.

The overworld's accessible collection shows all six trail stickers, via keyboard,
pointer and standard controller. Preserve focus safety, held-input guards and
normal pause/navigation. Retain all-six-trail finish grounding and the interim
harmless/pass-through static props (#191), without added markings or altered
slime damage/squash behaviour. The owner-approved builder-kit pouch and wooden
letter tiles are shared across all six trails. Each trail's reward uses its own
generated sticker in the approved Sunset style (#194): Plains grassy hills,
Quarry Run rock, Treetop Timbers tree, Sunset Site hard hat and beam, Frost Ridge
snow-capped mountain and Sandy Cove sandcastle, without baked lettering. Letters
remain separately rendered, with clear focus/held markers.
No merge or deployment is
authorised; owner/child and physical-controller acceptance remain manual.
