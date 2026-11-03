# Treetop Timbers preview source provenance

The owner approved `docs/timbers-art-plan-241.md` and its five-call cap in this conversation with “Approved”. The exact plan hash, baseline and allocation rules are in `authorization-and-budget.json`. Approval covers the bounded representative preview, not the remaining trail rollout, commits, pushes or merge.

All three dispatched calls used the built-in `image_gen.imagegen` tool. The tool exposed an output file path but no underlying provider/model version or request identifier; those fields remain null rather than inferred from a UUID. Each `*-request.json` retains the exact executed arguments inside `request`. Each `*-result.json` retains the returned output hint. Original tool files were copied byte-for-byte into this directory and remain at their tool locations too.

| Call | Role and input | Original | Result |
| --- | --- | --- | --- |
| A-01 | New ordinary branch; no input image | a-01-original.png | Used for the ordinary branches and the broad middle bough through its designed centre/caps. |
| C-01 | New ground; no input image | c-01-original.png | Rejected: stray near-transparent pixels outside the ground survive downsampling. Preserved without cleanup. |
| C-02 | C's one restricted refinement; C-01 as the edit/reference input | c-02-original.png | Used: a full-bleed opaque root/bark terrain block. |

Three calls are spent. The separate B allocation remains unused because A legitimately supplies the broad bough at the same texture scale. One reserve for A also remains unused. C has used its allowed refinement; the remaining capacity does not authorize another C call or a new role.

## Actual files and preparation

A-01 is 2172×724 RGBA. The source contains very faint isolated alpha outside the main bough. Whole-image uniform 13:1 premultiplied box filtering naturally rounds those tiny contributions to zero at native scale; there is no alpha threshold or colour key. The resulting full image is 168×56, with a 159×17 nonzero-alpha bough at (4,19). Only fully transparent native margins are removed. Its whole 27px end caps remain unchanged; only the 105px designed centre is repeated/mirrored to construct the requested widths. The leftmost rounded endpoint begins one pixel below the contact plane; all other columns have source alpha at row 0. There are no endpoint paint repairs.

C-01 is 1983×793 RGBA. A 5:1 diagnostic downsample retains alpha 1 specks far above the substantial block. It is not a runtime source and no background-erasure operation was applied.

C-02 is 2172×724 RGB, decoded as entirely opaque RGBA. Whole-image uniform scaling by 100/724 produces 300×100. Complete 12px boundary faces and the 276px internal centre produce the 780×100 ground bitmap. No source body/end is cropped and no width-only or height-only squeeze is applied.

`scripts/timbers-art.mjs` performs integer-weight premultiplied box filtering and exact column copying. Downsampling retains the complete source region, not necessarily every individual input pixel. `scripts/prepare-timbers-art.mjs` records every output column's source index, source hashes, PNG hashes and full RGBA hashes in `preparation.json`. It produces one native bitmap per width and one ground bitmap, avoiding per-column drawing seams under fractional camera motion.

Reproduce from repository root:

```sh
node scripts/prepare-timbers-art.mjs /tmp/timbers-reproduction
node --test scripts/prepare-timbers-art.test.mjs
```

The production copies are under `public/assets/timbers/terrain-kit-v1/`. Their manifest covers exactly the 12 approved preview support IDs and the sole ground segment; the remaining 32 branches retain their existing art until preview acceptance and rollout authorization. The environment atlas, Cove art and shared art remain byte-identical.

`presentation-delta.json` and `baseline/` retain the exact three existing runtime-file changes. `scripts/timbers-preservation.mjs` reconstructs only those literal changes before the historical Cove byte oracles, checks pinned hashes, and rejects unrelated additions or changes. Historical Cove source/provenance records remain untouched.
