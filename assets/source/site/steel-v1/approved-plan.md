# Sunset Site steel artwork plan — issue #242

Status: measured proposal awaiting owner approval. No production edits, artwork
calls, or coordinate changes have been made. Owner selected predominantly steel
construction to distinguish Sunset from the timber theme of Treetop Timbers.

## Baseline and scope

- Inspected source and remote main: `885b6c16d5397e061f1ccb40ca326856bc77db88`.
  Pilot PR236 is merged. The checkout started clean at this revision.
- Open issues and all open PRs were checked on 2026-11-01. Only draft PR245
  (Plains) was open; its actual diff touches shared `assets.ts`, `renderer.ts`,
  `level.ts`, and `trail-presentation.ts`, but does not implement Sunset.
  Recheck and incorporate any merged changes before production starts.
- 39 fixed supports, one moving ferry, five terrain segments, three authored
  scenery placements plus one renderer-authored backdrop prop. Eight pairs of
  fixed supports overlap or meet at equal height.
- Preserve all 62 gems, four BEAM identities, four checkpoints, route intent,
  recovery gap, finish/retrace/re-arm, physics, input, camera and shared artwork.
  No stars, springs, crumbling platforms, slime entities or ice/water bands are
  present. No new mechanics, scenery family or background is proposed.
- [Full machine-readable inventory](evidence/issue-242/inventory.json) includes
  all support/pickup relationships, exact motion, source hashes and alpha bounds.
  Reproduce into a NEW file with `node scripts/inventory-sunset-art.mjs <path>`;
  the script refuses to overwrite earlier evidence.

## Measured fit and proposed exception

The current platform renderer draws a clipped 12px strip. Propose an illustrated
steel body with an **18px maximum visual depth** from its existing standing top,
no pixels extending beyond the collision width, and no painted surface above
that top. The whole silhouette must remain a convincing girder; the depth is a
commissioning constraint, not permission to flatten/crop an unsuitable result.

Henry is drawn at 48×48 with feet anchored at y44. Direct inspection of every
nonzero alpha pixel in the shipped atlas gives a maximum standing/running hat
height of 40px above his feet. The closest lower supports are 60px below, so the
conservative rectangular standing gap is `60 - 18 - 40 = 2px`. Every inventoried
support meets at least that bound, including the full ferry swept envelope.
This is static fit evidence, not proof of jumping/underpass visibility. Jumping
through the existing one-way tops remains intentional; inspect whole-body
readability during those transitions in the integrated preview.

Gems use a 32×24 sprite whose bottom is currently 18px above their support. Its
full bounding envelope rises 42px. With an 18px overhead body, some gem bounds
would touch the underside. Propose moving exactly the 38 gems listed below
**down 2px, with X unchanged**, leaving a conservative 2px gap. This intentionally
uses full sprite rectangles and the ferry's swept lane rather than relying on
transparent diamond corners or a favourable ferry phase. Other 24 gems stay put.
No platform, terrain, checkpoint, letter, start, finish or scenery moves are
proposed. Letter tiles rise 32px from the support and have at least 10px clearance
under a deck one tier above. Preserve all identities, counts, values and reachability.

The exact existing all-gem input journey was also run in deterministic simulation
against the unchanged level and an in-memory proposal with these38 gem moves.
Both collected all62 gems and returned to the finish. See the
[simulation record](evidence/issue-242/proposed-gem-simulation.json). This supports
reachability only; it is not native visual acceptance of the proposed artwork.

If the real preview cannot achieve a substantial whole girder inside this envelope,
return with the exact conflicting targets. Do not silently thin it, cut notches,
shift more pickups or redesign the route.

## Steel kit and preparation

Use the accepted Cove illustration as a reference for weight, edge treatment and
restrained texture, not as steel production material. Existing site atlas art is
thin/pixel-styled; it remains for preserved scenery and fixtures. No approved
steel kit currently covers the new role. Keep all Cove/shared files byte-identical.

- Fixed decks: broad steel plate top, chunky web and lower flange, convincing end
  plates, sparse rivets. Warm ochre highlights and muted rust against cooler dark
  steel. No dominant wooden planks; no rails that imply blocked movement.
- Author one modular beam kit with left/right end pieces and repeatable centre
  panels. A planned native module scheme uses 20px end caps, 20px centres and a
  deliberately authored 10px centre variant: all fixed widths are multiples of
  10 and at least 140px. These are source roles, not permission to crop the defining
  ends off a whole generated beam. Pick one uniform source-to-native scale for
  the family after inspecting actual output. If the output cannot supply the
  measured roles faithfully, count it as a rejected attempt.
- Merge touching/overlapping fixed spans into visual runs per elevation, preserving
  all original collision/support records and IDs. Draw one complete visual run
  with caps only at its exposed ends. Maintain a support-to-run inventory so no
  support disappears from the rollout audit.
- Ferry: a separate whole 96×18 steel carriage matching the kit's scale and top
  line. Preserve its path from x470 to x554 at y320, 1.4s one-way travel and 1.2s
  dwell at each end. Its right edge exactly meets the far dock at x650. No art
  overhang may falsely enlarge a boarding surface or close an absent-carriage gap.
- Ground: illustrated compacted gravel/earth with a coherent bank lip and exposed
  recovery-gap walls. The deep pit floor remains below the playable world. Use
  designed edge/face roles and a quiet repeatable substrate; do not extend a
  ground fill across the recovery gap or repaint the background.
- Existing decorative braces stay behind the playable surfaces. Use restrained
  hazard accents, avoiding stripe density that competes with gems/letters.

Generate with the configured native image tool. Preserve originals, every executed
prompt and reference, actual returned dimensions/alpha and available request/provider
metadata. Explicitly label metadata that the tool does not expose; never invent it.
Keep rejected/failed attempts. Deterministic preparation may trim empty exterior
padding, uniformly resample whole authored components, and extract/repeat specifically
planned cap/centre cells. No anisotropic scaling, silhouette amputation, gem notches,
white-key removal, or unapproved manual pixel repairs. Inspect returned alpha rather
than assuming a transparency request succeeded. Use PNG structure/CRC, exact decoded
RGBA/dimensions, copy hashes and deterministic preparation checks.

## Proposed generation allowance — not yet approved

Hard cap: **six tool calls**, including errors, rejected results and refinements.

| Allocation | Initial calls | Purpose |
| --- | ---: | --- |
| Fixed steel modular kit | 1 | Caps, repeat centres and coherent substantial underside |
| Whole moving steel ferry | 1 | Exact 96px-wide carriage role matching the kit |
| Gravel ground edge/face kit | 1 | Ground top, end/wall transition and exposed face roles |
| Quiet gravel substrate | 1 | Repeated ground fill at consistent texture scale |
| Steel refinement reserve | 1 | At most one targeted correction to fixed kit OR ferry |
| Ground refinement reserve | 1 | At most one targeted correction to edge kit OR substrate |

If approved, a reserve may be spent only after recording a specific fit, seam,
alpha or style failure and a targeted prompt correction within that family. A
failed tool call consumes its allocation; another attempt uses that family's
reserve. No further automatic retries or cross-family reallocation. Unneeded
initial roles may be satisfied by legitimate accepted-source reuse; the saved
call is not new retry authority. If a family exhausts its allocation, stop that
family and present the result and next decision. Tool pricing is not exposed;
this proposes a call cap, not a monetary quote.

## Representative integrated preview

One owner review packet, captured from actual input-driven gameplay at native
426×240 and a 320px-wide viewport (record the actual CSS canvas size separately):

1. First tower underpass at `site-first-1`, with Henry standing, moving and jumping
   under `site-first-b`; show associated gems and joins with `site-first-left-1`.
2. `site-high-deck`, `site-crane-ferry`, `site-far-dock` and the relevant portion
   of `site-crane-catch`, including its join with `site-first-3`. Board, ride and
   disembark in both directions; inspect both endpoints and an absent-ferry fall.
3. Lower ground/recovery lip around x840–980, showing the steel catch above gravel
   and the steep gap boundary. Include a static scaffold-underside view with
   the next landing visible before stepping off.

Only the preview targets and their explicitly listed affected gem Y positions
may change during this first integration. A partial long-deck visual fixture is
not an accepted whole deck: render the full authored connected run for every
preview support. Record the exact revision and approved component sources.
After owner approval, apply that accepted family to all remaining targets below
without changing approved components. Whole-trail owner playtesting is separate.

## Complete support decision register

All coordinates and movement below remain unchanged. Every row uses an 18px
maximum body. Clearance is the conservative minimum standing gap to lower
supports/ground, with a 16px horizontal edge expansion. Exact associated gem,
letter, checkpoint and scenery IDs are in the JSON inventory.

| Support ID | X span or moving left-X lane | Top Y | Width | Gap | Role / joining treatment |
| --- | --- | ---: | ---: | ---: | --- |
| `site-entrance` | 0–300 | 560 | 300 | 2 | Fixed modular deck; join `site-first-low-right` |
| `site-first-low-right` | 280–720 | 560 | 440 | 2 | Fixed modular deck; join `site-entrance` |
| `site-first-1` | 160–340 | 500 | 180 | 2 | Fixed modular deck; join `site-first-left-1` |
| `site-first-b` | 0–430 | 440 | 430 | 2 | Fixed modular deck |
| `site-first-3` | 160–340 | 380 | 180 | 2 | Fixed modular deck; join `site-crane-catch` |
| `site-high-deck` | 260–470 | 320 | 210 | 2 | Fixed modular deck |
| `site-far-dock` | 650–800 | 320 | 150 | 2 | Fixed modular deck |
| `site-crane-catch` | 340–1900 | 380 | 1560 | 2 | Fixed modular deck; join `site-first-3` |
| `site-first-left-1` | 0–180 | 500 | 180 | 2 | Fixed modular deck; join `site-first-1` |
| `site-first-right` | 400–560 | 500 | 160 | 2 | Fixed modular deck |
| `site-lower-catch` | 0–840 | 620 | 840 | 2 | Fixed modular deck |
| `site-descent-outside` | 1580–1840 | 560 | 260 | 2 | Fixed modular deck; join `site-descent-left-2` |
| `site-descent-base-catch` | 1460–1900 | 620 | 440 | 2 | Fixed modular deck; join `site-yard` |
| `site-crane-ferry` | left X 470↔554 | 320 | 96 | 2 | Whole ferry; both docks |
| `site-descent-1` | 1820–2020 | 440 | 200 | 2 | Fixed modular deck |
| `site-descent-e` | 1800–2120 | 500 | 320 | 2 | Fixed modular deck; join `site-descent-left-1` |
| `site-descent-3` | 2020–2220 | 560 | 200 | 2 | Fixed modular deck |
| `site-yard` | 1880–2520 | 620 | 640 | 2 | Fixed modular deck; join `site-descent-base-catch`, `site-final-base-catch` |
| `site-descent-left-1` | 1700–1940 | 500 | 240 | 2 | Fixed modular deck; join `site-descent-e` |
| `site-descent-left-2` | 1700–1900 | 560 | 200 | 2 | Fixed modular deck; join `site-descent-outside` |
| `site-final-1` | 2440–2620 | 560 | 180 | 2 | Fixed modular deck; join `site-final-outside-560` |
| `site-final-2` | 2560–2740 | 500 | 180 | 2 | Fixed modular deck |
| `site-rest` | 2660–2920 | 440 | 260 | 2 | Fixed modular deck |
| `site-final-4` | 2560–2740 | 380 | 180 | 2 | Fixed modular deck |
| `site-final-5` | 2660–2840 | 320 | 180 | 2 | Fixed modular deck |
| `site-final-6` | 2760–3000 | 260 | 240 | 2 | Fixed modular deck |
| `site-final-m` | 2660–2880 | 200 | 220 | 2 | Fixed modular deck |
| `site-roof` | 2800–3120 | 140 | 320 | 2 | Fixed modular deck |
| `site-final-base-catch` | 2520–3120 | 620 | 600 | 2 | Fixed modular deck; join `site-yard` |
| `site-final-right-560` | 2700–3120 | 560 | 420 | 2 | Fixed modular deck |
| `site-final-right-500` | 2880–3120 | 500 | 240 | 2 | Fixed modular deck |
| `site-final-left-440` | 2460–2600 | 440 | 140 | 2 | Fixed modular deck |
| `site-final-right-380` | 2780–3120 | 380 | 340 | 2 | Fixed modular deck |
| `site-final-right-320` | 2880–3120 | 320 | 240 | 2 | Fixed modular deck |
| `site-final-left-320` | 2400–2600 | 320 | 200 | 2 | Fixed modular deck |
| `site-final-left-260` | 2540–2720 | 260 | 180 | 2 | Fixed modular deck |
| `site-final-outside-380` | 2260–2500 | 380 | 240 | 2 | Fixed modular deck |
| `site-final-outside-440` | 2140–2400 | 440 | 260 | 2 | Fixed modular deck |
| `site-final-outside-500` | 2220–2500 | 500 | 280 | 2 | Fixed modular deck |
| `site-final-outside-560` | 2380–2520 | 560 | 140 | 2 | Fixed modular deck; join `site-final-1` |

All rows are inventoried/proposed; none is implemented or visually approved.

## Terrain and scenery decisions

| Target | Authored geometry | Decision |
| --- | --- | --- |
| surface-0 | (0,680)→(960,680) | Gravel ground; retain lower catch separation |
| surface-1 | (960,680)→(980,1000) | Coherent steep left gap wall; no new standing ledge |
| surface-2 | (980,1000)→(1320,1000) | Below-world pit floor; retain data and complete material dispatch |
| surface-3 | (1320,1000)→(1340,680) | Coherent steep right wall; preserve wall-contact/recovery behaviour |
| surface-4 | (1340,680)→(3120,680) | Gravel beneath descent, yard and final tower |
| site-deco-1 | cave at (100,560) | Preserve; 29 visible base pixels meet entrance top |
| site-deco-2 | bush at (1600,380) | Preserve; 43 visible base pixels meet crane catch |
| site-deco-3 | cave at (2320,620) | Preserve; 29 visible base pixels meet yard top |
| renderer-site-frame-tree | tree at (1620,680), scale 1.5 | Preserve; 52.5 logical pixels of visible base meet flat terrain |
| Three decorative frame bays | Existing drawSiteFrame positions | Preserve as pass-through background; inspect contrast against new steel |

The four scenery alpha bottoms end exactly at their anchors; no grounding fix
is indicated by the source measurements. Confirm visible contact after new tops
are drawn. Scenery asset names are atlas identifiers, not permission to add a
new cave/tree/vegetation design.

## Exact proposed pickup exceptions

Every listed X stays fixed, each listed Y increases by two logical pixels. The
JSON records the supporting and overhead IDs for each row. Unlisted gems stay
byte-for-byte in their authored position. No gem is placed on the moving ferry.

| Gem ID | X | Old Y | Proposed Y |
| --- | ---: | ---: | ---: |
| `site-gem-001` | 100 | 542 | 544 |
| `site-gem-002` | 160 | 542 | 544 |
| `site-gem-003` | 220 | 542 | 544 |
| `site-gem-004` | 210 | 482 | 484 |
| `site-gem-005` | 290 | 482 | 484 |
| `site-gem-006` | 280 | 422 | 424 |
| `site-gem-007` | 350 | 422 | 424 |
| `site-gem-008` | 400 | 422 | 424 |
| `site-gem-010` | 280 | 362 | 364 |
| `site-gem-014` | 500 | 362 | 364 |
| `site-gem-015` | 570 | 362 | 364 |
| `site-gem-019` | 700 | 362 | 364 |
| `site-gem-022` | 1840 | 422 | 424 |
| `site-gem-023` | 1830 | 422 | 424 |
| `site-gem-024` | 1840 | 482 | 484 |
| `site-gem-025` | 1920 | 482 | 484 |
| `site-gem-026` | 2000 | 482 | 484 |
| `site-gem-028` | 2060 | 542 | 544 |
| `site-gem-032` | 2380 | 602 | 604 |
| `site-gem-033` | 2440 | 602 | 604 |
| `site-gem-034` | 2480 | 542 | 544 |
| `site-gem-035` | 2570 | 542 | 544 |
| `site-gem-036` | 2600 | 482 | 484 |
| `site-gem-037` | 2690 | 482 | 484 |
| `site-gem-038` | 2700 | 422 | 424 |
| `site-gem-039` | 2755 | 422 | 424 |
| `site-gem-040` | 2870 | 422 | 424 |
| `site-gem-041` | 2600 | 362 | 364 |
| `site-gem-042` | 2690 | 362 | 364 |
| `site-gem-043` | 2700 | 302 | 304 |
| `site-gem-044` | 2790 | 302 | 304 |
| `site-gem-045` | 2800 | 242 | 244 |
| `site-gem-046` | 2890 | 242 | 244 |
| `site-gem-049` | 2840 | 182 | 184 |
| `site-gem-055` | 2645 | 482 | 484 |
| `site-gem-056` | 2745 | 302 | 304 |
| `site-bonus-004` | 1780 | 542 | 544 |
| `site-bonus-006` | 2650 | 242 | 244 |

## Implementation and verification map

Production changes, after approval, should stay in a Sunset-specific art loader
and renderer (for example `src/world/site-terrain.ts`), minimal integration in
`assets.ts`/`renderer.ts`, site manifest/new versioned assets, deterministic source
preparation, and only the approved gem coordinates in `sunset-site.ts`. Keep
simulation and platform carrying separate from art. Add no engine abstraction
or unrelated renderer refactor.

Known consumers that require deliberate audit:

- `tests/sunset-scaffolds.spec.ts`: main native/small route, full BEAM retrace,
  missed-A/M returns, crane and recovery gap. Its crane observer currently matches
  `fillRect` tops by height3 and widths96/210/150; replace observation with the
  actual new art draw and uniquely authored support records. Preserve assertions.
- `tests/sunset-wall-browser-controller.ts` also identifies the high deck by a
  210×3 rectangle to derive the camera. Its tests and browser witnesses must move
  with that real rendering contract. Preserve wall paint/contact evidence.
- `tests/sunset-exploration.test.ts` assumes every gem's support is `gem.y + 18`.
  Replace that assumption with unique authored support records for approved
  gems and explicit identity/position guards; do not broadly relax grounding.
- All `tests/sunset-*.test.ts`, `tests/sunset-pilot.ts` and native route drivers:
  preserve route reachability, all62 exploration, checkpoints, camera, finish,
  retrace, catches and no-crane completion. Existing route coordinates stay valid.
- `AdventureScene` cached map previews, `tests/world-assets.test.ts`,
  `tests/material-renderer.test.ts`, `tests/renderer-fixtures.test.ts`, and the
  compact-HUD/landmark-label/manual strip-import fixtures in `tests/browser.spec.ts`:
  include the new loader/module graph and actual Sunset assets where appropriate.
- Required asset loading must fail visibly and recover with ordinary Retry;
  no silent production fallback to the old thin girder. Preserve deliberate
  synthetic legacy fixtures, clearly distinguished from production coverage.

Run focused unit/script checks, `npm test`, `npm run typecheck`, `npm run build`,
and the full configured Chromium/Firefox/WebKit matrix after the stable rollout.
First exercise the affected tight routes so failures can be diagnosed locally.
Preserve deadlines, retries and historical failed evidence. In particular, the
prior missed-letter 45-second failure has no established root cause: a later pass
cannot be called its fix. Native test-dispatched keyboard input is not physical
hardware/child testing.

Retain source/build/served-body/image bindings, exact decoded RGBA and deterministic
preparation checks. Audit native and small captures for Henry visibility, jump
transitions, underpasses, exposed ends, all joins, next landings, collectibles,
ferry endpoints and normal/reduced-motion/Pause behaviour. Add meaningful negative
controls for the bounded coordinate/preservation guards.

Before opening the PR, recheck overlapping work and current main. Use `Refs #242`
while owner acceptance is outstanding. Obtain fresh Claude whole-PR review as
required by the issue, push every authorized commit immediately, and verify
exact-head/base CI and artifacts. The user has authorized progressing this work
into a PR; no merge/deployment or issue closure is inferred. Record representative
preview approval separately from completed-trail acceptance.

## Approval record

- Predominantly steel material direction: approved by owner in this thread.
- This 18px kit / exact38 gem Y adjustments / no support or scenery moves: pending.
- Six-call allocation and bounded reserve rules: pending; calls spent: zero.
- Representative integrated preview: not yet generated or implemented.
- Whole-trail acceptance, final review/CI and PR: outstanding.
