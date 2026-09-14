# Plains adventure and screens — issue #6

Open `/?scene=adventure` for the complete first-play shell. The title screen
starts with Space, the loading state is entered before local assets are ready,
and the playable route uses the issue #4 level, issue #3 movement and issue #5
run interactions. Escape uses the foundation pause gate, freezing the fixed-step
simulation; Space on the finish screen creates a fresh run and returns to title.

The HUD reports the current run's gems and checkpoint. Checkpoint recovery keeps
gems, while replay constructs a new run and clears entity state. Reaching the
construction finish arch stops normal route progression and displays the current
gem total. Henry's atlas animation follows the movement state throughout.

The route is data-driven and currently includes meadow, wooded hillside and
cave-themed sections, an easy main path, optional gem elevations, three safe
checkpoints and a construction finish arch. Control prompts are short and
visual enough for the intended six-year-old player. The preview uses generated
local assets and displays a readable loading failure in the main shell.

The screen controller is unit-tested for title → loading → play → pause → finish
→ replay and retryable load errors. Chromium and Firefox checks exercise asset
loading, start, pause and the adventure shell. Audio event calls remain behind
the `GameAudio` boundary and gain synthesized content when issue #7 is integrated.
Full manual easy-route completion, controller playtesting and the release matrix
remain issue #8 evidence.
