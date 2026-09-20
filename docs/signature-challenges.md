# Optional star challenges (#93)

There are exactly three special stars in each of Plains, Quarry Run and Treetop
Timbers. Other trails omit them. A star uses its center as the pickup anchor and
the existing forgiving feet-contact window (18px horizontal, 28px vertical).
`RunState.collectedSpecials` is independent of gems; inactive entity IDs prevent
repeated pickup events. Recovery does not reactivate a collected star. Fresh runs
and level changes replace the set; reload recreates the scene. No browser storage
is used. The bounded feedback system adds `+1 STAR` and reuses the pickup sound;
per-level music and checkpoint music continuity are unchanged.

| Trail | Approach and rewards | Miss / return |
| --- | --- | --- |
| Plains | After the Meadow checkpoint, follow the gold stars at x=680, 740, 820 close to the gentle downhill slope. The STAR SLOPE sign introduces the sequence. | The slope and marked 100px runout are continuous ground. Brake or walk back for missed stars. Jumping past stars never blocks the route. |
| Quarry | Board the existing lift centered at x=2380 and wait. Its top meets a 200px stationary one-way shelf at y=66. Stars sit at x=2424, 2500, 2580. | Walking right leaves the shelf for the marked terrace return. Walking off the left or missing boarding lands on the original terrace; nearby existing hazards still use forgiving health/recovery. The main path beneath remains open. |
| Timbers | Follow the first three springs (x=950, 1650, 3100). Each star is 80px ahead and 100px above that spring's ground. Keep moving right through the arc. | Each has a 140px gold landing band on continuous terrain at x=1100, 1820, 3320. No pit or timed platform is added. Stop/reverse to miss a star safely, or approach the spring again. |

The shelf is represented by an existing platform with identical endpoints, so
there is no new terrain model or collision rule. Signs and contour-following
landing bands are decorative. All nine rewards can be collected and each trail
finished with ordinary directional/jump input from the actual level start.
The deterministic unit pilot and browser keyboard pilot provide automated
verification, not firsthand child playtesting. The input-only browser pilot
freezes animation frames for evidence capture without changing run state.

The HUD keeps gems, hearts and stars in separate panels. Finish places gems and
stars side by side above the existing celebration and three navigation actions.
No result row is added to trails without stars. Artwork provenance is in
[the star source record](../assets/source/specials/PROVENANCE.md).

See [validation and visual evidence](evidence/issue-93/README.md).
