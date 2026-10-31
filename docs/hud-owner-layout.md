The shared gameplay HUD places the96×28bag at(325,5), the unchanged24×24pouch
at(330,7), and all four letter marks at y14 (outlines y13). The notice plaque
starts at y37, leaving four pixels below the bag; its baseline is y52. Counters,
right insets, normal movement/jump hints and bottom-right trail progress ribbon,
checkpoint posts, Henry marker and finish flag retain their existing semantics.
Only the temporary Trail/Henry/posts/flag legend and its scheduler are retired.

Pickup feedback uses the same bag-relative x342 anchor. Normal flight approaches
baseline y18 with its existing .65lifetime/25pxarc/22×24tile/alpha. Reduced-motion
feedback uses baseline y25: its stationary tile occupies(331,7,22,24), ending at
y31 above the notice lane. It avoids the obsolete y74 target and the rejected
translated y48 proposal. Collection, input, gameplay timing and art pixels remain
unchanged. The HUD bag has no interactive hit target to move.

HISTORICAL — 2026-10-29: the test-first HOST renderer/font/art cohort recorded all
six trails at the old y31bag before failing the requested y5order assertions.
Pure feature REDs and the intended HOST RED remain preserved. Source fixtures
are isolated renderer/font/art observations, not input-driven gameplay.

Validation must include all six trails, real bold/normal glyph extents and quiet
rims, longest location/checkpoint labels, keyboard/controller hints, zero through
four collected slots, native426×240 and actual320CSS capture dimensions. Complete
the tight input/render cohort through its final captures before broader fixtures.
Retain failed reports and truthful local-null/supplied-CI provenance. Consult
[PR236](https://github.com/auleewilliams/TinyTurboTrails/pull/236) for current
exact-head browser/CI/review and owner acceptance status.
