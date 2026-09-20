# Adventure, overworld and run lifecycle

Open `/` or `/?scene=adventure`. All six registered trails are unlocked in a
stable order: Plains, Quarry Run, Treetop Timbers, Sunset Site, Frost Ridge,
Sandy Cove. The dotted path is a selector, not a free-roaming map.

Left/Right, A/D, D-pad or the left stick selects one destination per input edge.
Henry moves beside its landmark without delaying selection. Space or a standard
controller face button starts it. Clicking a landmark selects it; Play starts it.
Native buttons provide accessible names and Tab/Enter operation. Active input
prompts fall back to keyboard after controller disconnect. See the
[control table](../README.md#controls).

The selected destination shows a cached representative render of its environment.
Preview rendering never advances gameplay or consumes input. All world, map and
title assets load before play; failures expose the existing Reload retry button.
The approved title artwork is preserved without distortion.

## Runs and completion

Each run begins with three hearts, no gems and no checkpoint. Checkpoints do not
heal; damage removes a heart, and losing all hearts or falling recovers to the
latest checkpoint with health refilled and gems retained. See
[interaction rules](gameplay-interactions.md) and [movement](gameplay-movement.md).

The finish shows the gem result and Henry's celebration, with three actions:

- **Replay:** immediately starts a fresh run of the same trail.
- **Next trail:** immediately starts the next registered trail; absent at Sandy Cove.
- **Choose trail:** returns to the map with the completed destination selected
  and a brief, nonblocking completion message.

Left/Right selects a finish action; Space or a face button confirms it. Buttons
also accept pointer/Tab/Enter. Input must return to neutral after arriving at
the finish or map before another keyboard/controller confirmation is accepted.
Replay is initially selected for continuity with earlier controls.

New runs reset player, camera, health, checkpoint, collectibles, platforms,
entity animation, effects and HUD hints together. Cosmetic session badges live
outside run state. Reload clears every badge; there is no storage or server save.
No optional-challenge system from #93 is introduced.

## Trails

| Trail | Recognizable place and gameplay |
| --- | --- |
| Plains | Grass hills, meadow, canyon, cave, orchard and summit |
| Quarry Run | Rock terraces, framed mines, deep pits, crusher yard; two optional rides |
| Treetop Timbers | Sunset treehouses, supported woodland scenery and plank bridge valleys |
| Sunset Site | Construction equipment, gravel, girders and an optional crane ferry |
| Frost Ridge | Snowy mountain, authored ice patches and safe snow runouts |
| Sandy Cove | Palms, sand, harmless shallow water and bouncing jellyfish |

All retain forgiving, deterministic routes. Target human play duration is 3–5
minutes with exploration; automated traversal speed does not establish this.
Art material choices never change collision geometry or movement tuning.

## Pause, audio and motion

Escape/Start toggles pause. Focus loss pauses simulation and audio; returning
clears elapsed time and held input, preserving a deliberate pause. Each trail
has its own local synthesized score. Music stops at the finish and resets on
Replay/Next trail. See [audio](AUDIO.md) for unlock and silent fallback.

Reduced motion removes nonessential map travel and celebration bobbing, alongside
the existing gameplay effect reductions. Selection remains obvious through an
outline, Henry's position, accessible button state and the named preview.

The parent-led [Henry usability worksheet](evidence/trail-milestone/HENRY-CHECK.md)
is separate from automated acceptance and remains pending until reported.

## Optional stars

Plains, Quarry Run and Treetop Timbers each offer three optional gold stars.
Follow STAR SLOPE, STAR LIFT and SPRING STARS signs; the gold ground markings show
safe return/landing areas. Use the same move and jump controls. Checkpoint recovery
retains stars, while replay, changing trails and reload clear them. Other trails
continue without stars. See [routes and rules](signature-challenges.md).
