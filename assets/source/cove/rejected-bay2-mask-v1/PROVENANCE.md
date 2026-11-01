# Bay2 single masked-texture preview

Original generated source SHA256 `9f233313fccf660149ee7734172089e4adda39b671b1d2142d2bc699603929be`; request/provider/model/reference hashes and exact prompt are preserved beside it. Requested medium, reported low quality. Its historical whole-source fit verdict remains FAIL.

The owner's 2026-10-30 exception permits this source as texture for **cove-bay-ledge-2 only**. Crop `[128,392,1280,240]`, isotropic8x majority downsample to160x30, then alpha-only mask `min(cap[x],4+2*x,4+2*(159-x))`. Caps are30 at0..77,12 at78..121,18 at122..159. No retained RGB is repainted, no donors/filler/repeats. Original-source paint loss:11772 outside crop,5271 inside crop outside final mask. Native opaque pixels removed82, retained2823. Rounded end cuts are intentional and require owner inspection in gameplay.

Prepared/public PNG copies are identical; preparation.json pins the original encoded copy, dimensions, RGBA hash, exact mask/caps and loss. Reproduction compares regenerated decoded RGBA using strict PNG validation across encoders; repeat preparation in one environment is deterministic. Existing bay1, HUD, geometry and all old images remain unchanged. presentation-delta.json/baseline and the narrow reverse normalizer preserve historical source oracles.

This is a preview asset, not whole-art acceptance or gameplay certification. Source compositions are distinct from input-driven native/CSS320 gameplay. No other platform is integrated by this change.
