# Henry / Patchwork Vale milestone evidence

Scope: issues #119 and #120 together. See [story and parent checklist](../../patchwork-vale-story.md).

`scripts/capture-story-milestone.mjs` captures the real opening/map/goal UI,
then instantiates the real AdventureScene with project assets to exercise its
finish transition at exact presentation times. The finish fixture supplies one
gem and one star for layout, rather than claiming a traversed run. Browser
tests independently traverse all six trails through production input.

- Opening: `opening-1-native.png` through `opening-3-native.png`, matching
  `*-no-caption.png` pictures, and `opening-small.png`.
- Overworld and goal: `map-native.png`, `map-small.png`, `first-goal-native.png`.
- All eight celebration poses: `finish-ready.png` through `finish-victory.png`.
- Reduced motion and small layout: `finish-reduced.png`, `finish-small.png`.
- Enlarged payoff: `reunion-native.png`, `reunion-no-caption.png`.
- Gameplay identity comparison: `gameplay-art-reference.png`, `celebration-art.png`.
- Short integrated recording: [integrated-flow.webm](integrated-flow.webm).

Adult visual inspection: the storm separates two safe neighbours, the hill
trail points to the same waving neighbour, and the high five marks arrival.
The pictures do not show Henry repairing the bridge. The human silhouette and
hat/vest/blue clothes/boots are consistent; original gameplay RGBA pixels are
asserted equal during packaging and compared in browser coverage. Sparkles
remain in Henry's band. Supporting text is small at 320×240; picture meaning,
large navigation symbols and the enlarged payoff avoid requiring it to be read.

Early review: read-only architecture review found no confirmed blocker. It
flagged controller discoverability and small-text readability as unverified
acceptance concerns. Compact visible keyboard/controller hints were added;
native/small pictures and finish phases are captured for final visual review.
The reviewer did not run tests or inspect pictures in that early pass.

Final validation/review results are recorded below when completed. Henry's
firsthand comprehension and physical-controller/Safari-on-macOS checks remain
human follow-ups, not results claimed by this evidence.


## Independent reviews and resolutions

Reviewed implementation `b9c3d9109f798d64e5b5664e9ab6d51af0c3cfd8` against
remote main. Reviewers did not edit shared files.

| Review | Confirmed finding / scope | Resolution |
| --- | --- | --- |
| Correctness/regression | Medium: focused Replay story or reunion button consumed Space as Play/Replay. Chromium reproduction confirmed story case. Inspected animation timing/reset/hold, pause/focus, release safeguards, navigation, simulation isolation, packaging and tests. | `223d281`: auxiliary buttons handle Space before window game input, ignore repeat; regression covers both. Targeted source and Chromium re-review passed. |
| Correctness test gap | Focus-loss test blurred while user pause was already active. | `3319647`: resume first, blur during an intermediate pose, verify freeze, focus and return to results. Targeted review passed. |
| Visual/acceptance | Medium: 10px finish labels lost strokes at 320px. Inspected all supplied PNGs, identity, captionless story continuity, docs and provenance. | `3319647`: larger bold short labels and symbols; all captures refreshed, including no-star and final-trail layouts. Targeted visual re-review passed. |

No confirmed blocker remains from either review. Neither reviewer ran the full
suites, viewed WebM playback, used a physical controller or tested with Henry.
Primary sampled decoded frames of the 7.6-second recording at 2.5–4.9 seconds,
confirming moving poses, sparkle settling and final hold without control overlap.

Deferred nonblocking visual suggestion: the small Replay arrow loses some detail
at fractional scale. Its larger Replay label is now readable and the reviewer
confirmed the P2 was resolved. Further icon polish is deferred to the parent-led
readability check, avoiding a cosmetic review loop. Supporting captions/hints
are also small; essential story meaning is pictured and story controls are large.

## Validation history and exact limits

The first unit run caught an over-restrictive new movement-release guard; it was
removed in favor of the established menu safeguards. Browser work corrected a
new opening-setup race under delayed rendering and replaced an obsolete test of
permanent idle sparkles with a check of Henry's actual hard-hat pixels in the
new band. Assertions were not weakened or hidden by retries (retries remain 0).
One intermediate overlapping test invocation collided with test artifact output;
the subsequent complete run was serialized. It is not counted as a clean run.

The complete pre-review-fix Windows run recorded 121 passing browser tests,
one existing headless WebKit native-audio skip, and 61 Firefox launch failures.
Windows reports Firefox's side-by-side configuration is incorrect before game
code executes. A clean `npx playwright install --force firefox` and direct launch
still reproduced it. No browser/package/CI assertions or settings were changed
to bypass the failure. Final implementation checks and Linux CI are recorded
below; bundled engines do not certify installed Chrome/Firefox version pairs or
Safari on macOS.


## Final implementation verification

Implementation and evidence revision: `331964740153bf2cbaab2bdec36714e9f9f48fb0`,
based on `b1e99ce997e70f8f1231799992882bd43f1adc96`. The final delivery commit
only updates guides and verification records; runtime, assets, tests and capture
scripts are unchanged from that reviewed/tested implementation. Summary data:
[final-results.json](final-results.json).

| Check | Final implementation result |
| --- | --- |
| `npm test` | 532 passed in 31 files |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run test:ci` | 8 passed |
| `node scripts/check-doc-links.mjs` | Passed on delivery documentation |
| `git diff --check` | Passed |
| Complete Windows Chromium + WebKit browser run | 121 passed, 1 existing native-audio skip, 0 failures, 0 retries (15.5 min) |
| Complete Linux Chromium + Firefox + WebKit browser run | 182 passed, 1 existing headless native-audio skip, 0 failures (22.1 min) |
| Linux container build / `npm run test:deployment` | Passed; PR job does not publish |

Linux run: [35544469208](https://github.com/auleewilliams/TinyTurboTrails/actions/runs/35544469208).
Engines: Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6. It passed lockfile
installation, types, units, CI scripts, build, browser tests and container smoke
checks. Browser assertions include all six trails, stars/no-stars, last-trail
navigation, story input, focused Space, independent pause/focus suspension,
reduced motion, and original gameplay-pixel equality. Synthetic controller
coverage does not substitute for hardware testing.

The prepared celebration directory also matches issue #119's published artwork
commit `00d1ece67a4777d171c97c08c561449c853c25e0` exactly, except for appended
integration provenance. The shipped original atlas is unchanged (SHA-256
`b79ee31dd9b4096bf5899509a808cd5a8bf3459a00d3c736a0bd7b41f8791d1b`).
No dependency, CI workflow or repository security changes were made.
