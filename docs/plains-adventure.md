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

Each landmark has a short map label: Plains, Quarry, Timbers, Sunset, Frost or
Cove. The selected panel and native buttons retain the full trail names.
Small cream backings separate the text from the meadow and bridge the dotted
segment beneath Timbers. Landmark targets retain their original 70 × 60 area
and extend 13 logical pixels downward to include the labels. Henry travels
along clear rows and landmark columns so cross-row choices cannot cover text;
selection and Play act immediately, independently of his cosmetic travel.
See [label evidence](evidence/issue-213/README.md) for actual-art checks and captures.

The selected destination shows a cached representative render of its environment.
Preview rendering never advances gameplay or consumes input. All world, map and
title assets load before play; failures expose the existing Reload retry button.
The approved title artwork is preserved without distortion.

## Runs and completion

Each run begins with three hearts, no gems and no checkpoint. Checkpoints do not
heal; damage removes a heart, and losing all hearts or falling recovers to the
latest checkpoint with health refilled and gems retained. See
[interaction rules](gameplay-interactions.md) and [movement](gameplay-movement.md).

The finish shows GEMS collected/total, with a matching star result
only on trails that offer stars, and Henry's celebration. Totals come from the
trail's entities. No activity opens over it. It offers these actions, in order:

- **Next trail:** immediately starts the next registered trail; absent at Sandy Cove.
- **Map:** returns to the map with the completed destination selected
  and a brief, nonblocking completion message.
- **Build your word:** opens the optional word activity over the frozen results.
- **Replay:** immediately starts a fresh run of the same trail.

Left/Right selects a finish action; Space or a face button confirms it. Buttons
also accept pointer/Tab/Enter. Input must return to neutral after arriving at
the finish or map before another keyboard/controller confirmation is accepted.
Next trail is initially selected; Sandy Cove, the final trail, selects Map and
never wraps to a new progression. Leaving the word activity reselects that default
and again waits for neutral input.

New runs reset player, camera, health, checkpoint, collectibles, platforms,
entity animation, effects and HUD hints together. Cosmetic session badges and
best gem/star counts live outside run state. Completing a trail records each
kind's best count independently; a worse replay never lowers it. The selected
trail's map panel shows symbol-and-count results beneath its preview. Unvisited
trails have no result placeholder, and trails without stars have no star result.
Accessible landmark descriptions include the same session counts. Reload clears
every badge and result; there is no storage or server save.

## Trails

| Trail | Recognizable place and gameplay |
| --- | --- |
| Plains | Meadow rollers, big downhill, orchard bumps, spring hill and final climb |
| Quarry Run | Four quarry workings, staggered terraces, three vertical return lifts; floor finish |
| Treetop Timbers | Roots, two fork choices, a middle bough and canopy climb to a lookout; permanent branch return |
| Sunset Site | Construction equipment, gravel, girders and an optional crane ferry |
| Frost Ridge | Snowy mountain, authored ice patches and safe snow runouts |
| Sandy Cove | Palms, sand, harmless shallow water and patrolling snorkel slimes |

All retain forgiving, deterministic routes. Target human play duration is 3–5
minutes with exploration; automated traversal speed does not establish this.
The approved compact Plains #218 pilot has not verified that target. Its owner
measurement and length/target decision remain open in [the current worksheet](PLAINS-PLAYTEST.md).
Art material choices never change collision geometry or movement tuning.

## Pause, audio and motion

The visible Pause button and Escape/Start open the shared pause surface. Resume
keeps its primary position; Sound and Rumble show separate On/Off states. Settings
are also reachable from map/results and diagnostic previews. Only a live trail
offers Return to Trails, with confirmation. M still toggles sound globally.
Escape/Start resume or cancel a pending return confirmation. Focus loss pauses simulation and audio; returning
clears elapsed time and held input, preserving a deliberate pause. Each trail
has its own local synthesized score. Music stops at the finish and resets on
Replay/Next trail. See [audio](AUDIO.md) for unlock and silent fallback.

Reduced motion removes nonessential map travel and the celebration jump and sparkle travel, alongside
the existing gameplay effect reductions. Selection remains obvious through an
outline, Henry's position, accessible button state and the named preview.

The parent-led [Henry usability worksheet](evidence/trail-milestone/HENRY-CHECK.md)
is separate from automated acceptance and remains pending until reported.

## Optional stars

Plains, Quarry Run and Treetop Timbers each offer three optional gold stars.
Follow the gold stars; the gold ground markings show safe return/landing areas.
The in-level text signboards and posts were removed in #170.
Use the same move and jump controls. Checkpoint recovery
retains stars, while replay, changing trails and reload clear them. Other trails
continue without stars. See [routes and rules](signature-challenges.md).


## Patchwork Vale map and finish

The page starts, and reloads, on the unrestricted trail map with Plains
selected; there is no opening picture story. Plains is described as **Over
grassy hills**. Like every trail, it finishes with its landmark, Henry's cheer,
**Another trail explored!** and the ordinary results.

Henry crouches, jumps, cheers and lands once before holding victory. Results
and Next trail / Map / Build your word / Replay remain available throughout. Pause and
focus loss freeze the sequence. Reduced motion uses still victory and fixed
sparkles. Replays and new trails reset celebration and run state. See
[story and owner checklist](patchwork-vale-story.md).
