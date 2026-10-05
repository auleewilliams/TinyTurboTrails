# Issue #136: session results on the trail map

The Chromium map captures in this directory show all six completed trails at
426 x 240 and 320 x 240 window sizes. Plains, Quarry Run and Treetop Timbers show
gem and star results; Sunset Site, Frost Ridge and Sandy Cove show gems only.
The results use the same pickup symbols as gameplay and stay between the
preview and Play button. The Plains story thumbnail remains proportional.

The existing six-trail milestone browser tests capture these views after
playing each route. They compare the map's drawn counts and accessible landmark
description with the completed run, check return/replay/next navigation, and
verify that reload clears results. Unit tests cover independent gem/star bests
across worse replays, fresh run resets, unvisited trails, zero counts and layout
bounds. This is automated evidence; the parent-led Henry usability check remains
separate.

PR #150 supplies the finish totals for #132. This change builds on that
implementation and adds only the map results for #136.
