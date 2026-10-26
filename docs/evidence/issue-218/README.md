# Plains compact route evidence (#218)

These 19 screenshots are actual keyboard-driven gameplay through the production
bundle. The pilot observes rendered HUD/debug text and delivers keyboard events;
it never reads or writes a scene, player, run, reward set or education state.
It uses bounded fixed simulation-clock intervals, so this is automated input
coverage, not a human duration measurement. No fixture-pose samples are claimed.

The initial Chromium route collected 33/33 gems, 3/3 stars and all four HILL
identities from the actual start, then opened the ordinary optional word activity.
Native play was set and asserted at a rendered 426×240 canvas before traversal
and restored after each evidence resize. Native PNGs are canvas captures;
desktop/narrow PNGs include the page and visible Pause control.

[Capture manifest](capture-manifest.json) records expected scenario/viewport
identities, observed positions/layout, nonempty glyph checks, actual loaded image
sizes, and SHA-256 hashes of screenshots, source, bundle and loaded assets. It
also explicitly identifies the uncommitted initial capture snapshot. Final
committed-head browser reports/logs remain in the worker handoff evidence; they
must be inspected separately from these initial screenshots.

| Section / feature | Native capture | Other sizes |
| --- | --- | --- |
| Meadow rollers and hop approach | [Meadow](input-meadow-hop-426.png) | [Desktop](input-meadow-hop-1366.png), [narrow](input-meadow-hop-320.png) |
| First letter | [H](input-H-426.png) | |
| Downhill airborne star approach | [Takeoff](input-downhill-takeoff-426.png) | |
| Clear downhill landing/runout | [Runout](input-downhill-runout-426.png) | |
| Orchard hollow and star | [Orchard](input-orchard-star-426.png) | [Desktop](input-orchard-star-1366.png), [narrow](input-orchard-star-320.png) |
| Orchard descent letter | [I](input-I-426.png) | |
| Spring arc | [Arc](input-spring-arc-426.png) | |
| Rising spring landing | [Landing](input-spring-landing-426.png) | [Desktop](input-spring-landing-1366.png), [narrow](input-spring-landing-320.png) |
| First L beyond landing | [L1](input-L1-426.png) | |
| Independent second L on resting shelf | [L2](input-L2-426.png) | |
| Final crest, foreground and HUD | [Summit](input-final-crest-426.png) | [Desktop](input-final-crest-1366.png), [narrow](input-final-crest-320.png) |

The owner-approved contour, all 33 gem anchors, three star anchors, four letter
positions and four checkpoint positions are unchanged from the issue table.
Implementation choices are one orchard slime at x1750 (patrol x1720–1780;
whole-body x1704–1796), a 180px downhill landing band centered at x1320,
grouped existing oaks at x1550/1670/2100 and four sparse low foreground tufts
at x800/3340/3950/4140. See [current route details](../../plains-world.md).
The panorama remains a single bounded aspect-correct crop; no new artwork,
mechanics, movement changes or storage are introduced.

Historical #171 and dated release/waiver artifacts are preserved unchanged.
Owner fun, clarity and 3–5 minute exploratory-duration acceptance remain OPEN in
[the current owner worksheet](../../PLAINS-PLAYTEST.md). No child, physical
controller, native Safari, AT or human-duration certification is claimed.
