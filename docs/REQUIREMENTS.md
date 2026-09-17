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

Multiple desktop-browser levels selected from a title-screen picker, including
the Plains route and Quarry Run. Both routes target roughly 3–5 minutes, with
momentum, slopes and springs; Quarry Run adds spring pits, stepped terraces and
grouped stone hazards using the same movement features. Keyboard and
standard-controller support.
Quarry Run reuses the Plains atlas and introduces no new biome artwork.

## Target browsers

Current stable desktop Chrome, Firefox and Safari (Safari on macOS), plus the
immediately preceding major version of each. These are checked continuously from
issue 01 onward rather than only at release.

## Out of scope for this release

No mining, building, crafting, loops, charged dashes, new biome artwork, touch
controls, public hosting or persistent progress.

## Asset generation

Illustrated assets use the built-in image generator. No API key, no paid API
workflow, no exact image-model requirement, and no runtime generation
dependency — the shipped game never calls an image generator.

## Progress and persistence

Progress exists only in memory during the current run. Checkpoint retries
preserve collected gems; replay, reload or closing the page starts a fresh run.
Do not persist checkpoints or gems in browser storage.
