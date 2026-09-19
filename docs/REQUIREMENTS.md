# TinyTurboTrails — agreed requirements

This file is the canonical statement of the agreed requirements for the first
release. Every issue in the **v1 — Plains release** milestone links here instead
of restating them.

**Changing a requirement means editing this file** — not an issue body. Keeping a
single source avoids the nine copies drifting apart.

## Audience

Henry, age six, with some experience playing Sonic. Keep the game forgiving and
readable at speed.

## Character and art direction

Henry is a detailed pixel-art child with brown hair, a yellow hard hat, bright
safety vest, and work boots, in an original Minecraft-inspired blocky world. He
is a detailed child in a blocky world — not a cuboid Minecraft avatar.

## Scope of the first release

Three desktop-browser levels selected from a title-screen picker: Plains,
Quarry Run and Treetop Timbers. All routes target roughly 3–5 minutes, with
momentum, slopes and springs. Quarry Run adds spring pits, stepped terraces,
grouped stone hazards and two slow moving platforms; both rides are optional
and no route depends on timing one. Treetop Timbers adds plank trails, shallow
rope-bridge contours, crane-hook springs and sawhorse hazards without changing
the single-height terrain model. Keyboard and standard-controller support.
Henry starts each run with three visible health pips. Each unblocked slime or
hazard hit removes one pip; losing the last pip returns him to the latest
checkpoint, or the level start, and refills all three. Pit recovery also refills
health without costing a pip, while activating a checkpoint does not heal him.
Quarry Run reuses the Plains atlas; Treetop Timbers ships its own project-local
16-cell atlas. Moving platforms are drawn from the level's own theme colors.

## Target browsers

Current stable desktop Chrome, Firefox and Safari (Safari on macOS), plus the
immediately preceding major version of each. These are checked continuously from
issue 01 onward rather than only at release.

## Out of scope for this release

No mining, building, crafting, loops, charged dashes, additional biome artwork
beyond the shipped Plains and Timbers atlases, touch controls, public hosting
or persistent progress. Public hosting means a public domain, TLS or exposure
beyond the home LAN; running the built container on a home server for LAN-only
access (issue #77) is self-hosting, not public hosting, and is in scope. Nothing
about progress or persistence changes: the game remains in-memory only when
self-hosted.

## Asset generation

Illustrated assets use the built-in image generator. No API key, no paid API
workflow, no exact image-model requirement, and no runtime generation
dependency — the shipped game never calls an image generator.

## Progress and persistence

Progress exists only in memory during the current run. Checkpoint retries
preserve collected gems. Current health is also memory-only and resets on
respawn, replay and level selection. Replay, reload or closing the page starts a
fresh run. Do not persist checkpoints, gems or health in browser storage.
