Frost checkpoint presentation correction for owner defect #243

The shipped 192×192 environment.png remains byte-for-byte unchanged. Checkpoint
cell 11 is source rectangle (144,96,48,48). At alpha ≥128 its lower snow-foot
rows 37–40 contain respectively 18,20,21,19 pixels; row40 spans x10–28.
The substantial visible base therefore ends at source edge41, three pixels above
the old anchor44. Faint row41 fringe is not used as the support measurement.

Only Frost's checkpoint anchor changes (17,44) → (17,41). All three logical
checkpoint positions, entities, grounded activation and respawns remain intact.
The Frost active pennant/check keeps the same offset from the atlas origin/pole;
other trails retain their existing overlay coordinates.

presentation-delta.json seals the complete before/after identities and exact
hunks for these two production files. The checkpoint preservation projection
runs before the existing Frost rollout/ground/extension/trial chain. It admits
only these whole-file identities, reverses only these hunks, and verifies the
original whole-file digest. Historical records and pins are unchanged. Any
additional edit passes through untouched to the original guards.

The CPU regression calls production drawWorld/drawAsset and drawFrostGround,
measures the shipped atlas alpha footprint against real prepared snow-column
calls at all three positions in both states, and checks the attached active
pennant. CPU raster evidence is not native gameplay/browser certification.
