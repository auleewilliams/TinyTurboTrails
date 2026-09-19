# Adventure screens and levels — issue #6

Open `/` (or `/?scene=adventure`) for the complete first-play shell. The title
screen uses Left/Right to select Plains, Quarry Run, Treetop Timbers or Sunset Site, then starts with Space or
any standard controller face button (A/B/X/Y). Local atlases are loaded before the picker
appears, and each playable route uses the shared movement and run
interaction systems. Escape uses the foundation pause gate, freezing the
fixed-step simulation; Space on the finish screen creates a fresh run and
returns to the picker.

The HUD reports the current run's gems and checkpoint. Checkpoint recovery keeps
gems, while replay constructs a new run and clears entity state. Reaching the
construction finish arch stops normal route progression and displays the current
gem total. Henry's atlas animation follows the movement state throughout, then
uses a bouncing idle pose with sparkles for the finish celebration. The finish
panel stacks the title, gem total, celebration band and replay prompt in separate
rows (`FINISH_LAYOUT`); `tests/finish-layout.test.ts` checks the full bob cycle
stays clear of the text.

The Plains route is data-driven and currently includes six sections — meadow,
wooded hillside, canyon, cave, orchard and summit (issue #45) — an easy main
path, optional elevated gems, six safe checkpoints and a construction finish
arch. Quarry Run is a cave-and-stone route of similar length with six sections
— quarry entrance, stone terraces, deep pit, mine tunnels, crusher yard and
summit exit (issue #73). It has spring steps and spring-cleared pits that
recover to the section checkpoint, slimes and grouped stone hazards, one
jump-only bonus gem per section (two float above pits and need a jump timed
with the spring launch) and seven checkpoints. It reuses the Plains atlas, so the
second route introduces no new biome artwork. Sunset Site (issue #33) is a
construction-yard route at dusk with the same six-section shape — site gate,
girder stairs, cement yard, trench, scaffold climb and sunset summit — plus a
late checkpoint before its closing double pit (seven in all). It has stepped
ramps, patrolling slimes, four spring-cleared pits, paired stone hazards and
one optional crane ferry over the yard's hazards. Its theme adds a low
`sun` (a stepped pixel disc drawn behind the ground) and a warm palette that
keeps the grass-green edge. Its own construction atlas supplies girder terrain,
a cone-and-cement-mixer hazard, scaffolding, culvert pipes, weeds, pneumatic
jacks, cement slimes and a sunset construction skyline. Startup preloads each
registered atlas; a failure exposes the page's Reload retry button. Control prompts are short
and visual enough for the intended six-year-old player.

The Plains route is long enough that an automated hold-right traversal (no jumping,
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

The screen controller is unit-tested for picker → loading → play → pause → finish
→ picker and retryable load errors. Chromium, Firefox and WebKit checks exercise
asset loading, level selection, start, pause and the adventure shell. Audio event
calls remain behind the `GameAudio` boundary and gain synthesized content when
issue #7 is integrated. Full manual route completion, controller playtesting and
the release matrix remain issue #8 evidence.
