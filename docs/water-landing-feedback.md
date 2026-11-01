Cove water landing feedback (#235)

Meaningful airborne-to-grounded impacts retain the existing >180px/s threshold and landing sound. A water splash replaces dust only when the resolved support is terrain, feet match its height within the existing movement contact epsilon, and movement's centre-based surfaceAt lookup says water. Shared endpoints use the same first-segment ownership as collision. Dry/sand terrain and every dry platform (including stones over water) retain the unchanged atlas dust puff. Walking, standing and recovery do not create a new landing event.

Six small turquoise/cream procedural droplets use existing feedback style,0.3s lifetime,MAX_EFFECTS24 and fixed-step age. Reduced motion suppresses them like dust. Drawing does not tick effects; the existing pause/focus clock freezes their lifetime. Existing restart/level loading clears the queue. Both adventure and gameplay preview exclude splash and dust from major HUD-feedback suppression. No new asset, sound, timer or simulation write.

The new `water-landing.spec.ts` identity is configured for all three existing engines at426×300. It uses ordinary input on existing Cove water and the established pool-stone approach, records actual production droplet/dust marks plus RGBA, and attaches effect-stage native426×240 PNGs. It remains UNEXECUTED by the worker; host native validation and visual inspection are required. Unit scene poses and recording contexts are fixtures, not gameplay captures.

`assets/source/cove/water-landing/presentation.json` records exact bounded literal deltas and immutable ca340905 copies for the three presentation files. The two historical preservation guards normalize only these exact deltas before applying their original byte pins. Historical catalogs/geometry/source images are unchanged; negative inputs reject additional bytes and gameplay edits.

Inherited CI40773884805 PNG encoded-byte reproduction failure remains unresolved: identical pixels/scanlines do not make encoded bytes identical. Its later cancellation cause is unknown. This feature does not alter the PNGs, prep, build environment or that assertion. No new native/CI/review/owner approval is claimed.
