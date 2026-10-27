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
| Plains | Jump from the downhill shoulder around x1065–1095 through star 1 at (1150,78); hop in the orchard hollow for star 2 at (1930,150); ride the spring at x2760 through star 3 at (2800,135). | Continuous grass receives every miss. The downhill runout has a 180px contour-following gold band centered at x1320. Walk back for retries; a short ordinary jump near x2685 bypasses the spring. All stars remain optional. |
| Quarry | Two optional side shelves on the descent, plus a fixed approach to lift B. | Permanent catches and bidirectional lifts allow retrying; see [Quarry](QUARRY-PLAYTEST.md). |
| Timbers | Star 1 is on the low left bough, star 2 is beyond the single optional spring, and star 3 is on the upper left canopy branch. | Permanent lower and side boughs catch misses and give an ordinary jump route back; see [Timbers](TIMBERS-ASCENT.md). The main route needs no spring. |

The optional shelves use the existing platform collision model. Plains' contour-following gold landing
bands remain visible; the in-level text signboards and posts were removed in #170.
All nine rewards can be collected and each trail
finished with ordinary directional/jump input from the actual level start.
The deterministic unit pilot and browser keyboard pilot provide automated
verification, not firsthand child playtesting. The input-only browser pilot
freezes animation frames for evidence capture without changing run state.

The HUD keeps gems, hearts and stars in separate panels. Finish places gems and
stars side by side above the existing celebration and three navigation actions.
No result row is added to trails without stars. Artwork provenance is in
[the star source record](../assets/source/specials/PROVENANCE.md).

See [validation and visual evidence](evidence/issue-93/README.md).
