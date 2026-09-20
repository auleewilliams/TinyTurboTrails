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
