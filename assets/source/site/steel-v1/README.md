# Sunset steel preview sources

The owner approved `docs/sunset-art-plan.md` in this conversation: an 18px maximum
steel envelope, the exact38 proposed gem Y changes, unchanged supports/scenery/
motion, and six image-generation calls with bounded reserves. The unedited
approved text is [approved-plan.md](approved-plan.md); its hash and the inventory
hash are recorded in [authorization.json](authorization.json).

Four initial calls have been spent. The steel and ground refinement reservations
remain unused. These sources are integrated for representative preview, not yet
owner-approved artwork or a completed trail rollout.

| Call | Allocation | Original output | Preparation |
| --- | --- | --- | --- |
| 01 | Fixed steel | 2172×724 RGBA | Whole-image uniform1/16 area reduction; native133×18 whole beam, then planned20px end/centre and10px centre cells |
| 02 | Moving steel ferry | 2167×726 RGBA | Whole-image uniform4/89 area reduction; entire96×15 silhouette, padded with three transparent rows below to96×18 |
| 03 | Gravel edge | 2172×724 RGBA | Whole-image uniform1/14 area reduction; entire153×16 edge, designed113px repeat centre |
| 04 | Gravel substrate | 1254×1254 RGB | Entire square uniformly reduced to64×64 |

Each `call-NN-prompt.txt` is the exact executed prompt. The corresponding request
JSON records the actual tool arguments; `call-NN-result.json` records returned
dimensions, file hash, and exposed metadata. The built-in `image_gen.imagegen`
tool returned image bytes plus a local save hint, but did not expose the actual
provider/model identifiers. Those fields are explicitly null, not guesses.
No image references were attached to these calls. The accepted Cove art was
inspected for weight and outline language; steel is newly generated material.

## Deterministic preparation and alpha

Original returned files remain unchanged. The tool's transparent outputs contain
near-invisible one-byte alpha noise in the outer padding. All pixels participate
in exact area-weighted, premultiplied, isotropic resampling. Alpha is quantized
downward for EVERY output pixel (less than one byte error); RGB is rounded after
unpremultiplication. This removes low-coverage noise through ordinary downsampling,
without an alpha threshold, colour key, pixel-specific repair or silhouette mask.
Only completely zero-alpha exterior padding is then trimmed.

The exploratory round-to-nearest output for call01 remains as
`call-01-uniform-full.png`; it retained stray alpha and was not shipped. The
floor-quantized full output and native candidates are retained separately.
The production preparation is [scripts/prepare-site-art.mjs](../../../../scripts/prepare-site-art.mjs),
using [site-art-pixels.mjs](../../../../scripts/site-art-pixels.mjs). It preserves
all defining beam end plates and the whole ferry; it never squashes either axis.
The ferry's visible depth is15px within the18px envelope, not an18px painted body.

Mirrored repeat neighbours share boundary samples without painting seam fixes.
Each joined support run is prepared as ONE native PNG, preventing fractional
camera offsets from exposing strip boundaries. The ground is likewise a native
world bitmap, preserving the authored steep contour. Its preview range is
x[0,980); the rest of the ground and supports remain pending rollout approval.

The complete executed resampling/cell/source/output hashes are in
[preparation.json](../../../../public/assets/site/steel-v1/preparation.json).
`node scripts/prepare-site-art.mjs <temporary-output-directory>` reproduces it.
The script suite checks every prepared PNG's decoded RGBA and dimensions, PNG
structure/CRC, committed-copy equality and deterministic regeneration. Small
negative controls cover premultiplication, pale pixels, alpha and edge retention.

## Scoped preservation

[preservation.json](preservation.json) and `baseline/` bind the four changed
existing production files to the inspected main revision. They are a new
projection before the immutable Cove preservation oracles; the old evidence is
unchanged. Unknown bytes, duplicate declarations and unauthorized position edits
fail. Separate layout/source tests pin all supports, paths, checkpoints, rewards,
other trails and accepted/shared art.
