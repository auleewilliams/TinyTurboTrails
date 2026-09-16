# Plains adventure and screens — issue #6

Open `/` (or `/?scene=adventure`) for the complete first-play shell. The title screen
starts with Space or the controller's primary face button, the loading state is entered before local assets are ready,
and the playable route uses the issue #4 level, issue #3 movement and issue #5
run interactions. Escape uses the foundation pause gate, freezing the fixed-step
simulation; Space on the finish screen creates a fresh run and returns to title.

The HUD reports the current run's gems and checkpoint. Checkpoint recovery keeps
gems, while replay constructs a new run and clears entity state. Reaching the
construction finish arch stops normal route progression and displays the current
gem total. Henry's atlas animation follows the movement state throughout, then
uses a bouncing idle pose with sparkles for the finish celebration.

The route is data-driven and currently includes six sections — meadow, wooded
hillside, canyon, cave, orchard and summit (issue #45) — an easy main path,
optional elevated gems, six safe checkpoints and a construction finish arch.
Control prompts are short and visual enough for the intended six-year-old
player. The preview uses generated local assets and displays a readable
loading failure in the main shell.

The route is long enough that an automated hold-right traversal (no jumping,
`npm run test:browser`) now takes roughly 50-55 seconds across Chromium,
Firefox and WebKit, up from the original route's ~11 seconds — the route
itself is about 4.3x longer, and knockback from the added hazards/slimes adds
further real time for a bot that never dodges them. That machine-paced figure
is a lower bound, not the 3-5 minute target: it holds max speed the whole way
and skips every optional elevated gem. The 3-5 minute figure in
docs/REQUIREMENTS.md describes an unhurried human playthrough (exploring,
collecting bonus gems, occasional retries) and still needs to be confirmed
with an actual playtest of the intended player — that has not been done as
part of this change.

The screen controller is unit-tested for title → loading → play → pause → finish
→ replay and retryable load errors. Chromium and Firefox checks exercise asset
loading, start, pause and the adventure shell. Audio event calls remain behind
the `GameAudio` boundary and gain synthesized content when issue #7 is integrated.
Full manual easy-route completion, controller playtesting and the release matrix
remain issue #8 evidence.
