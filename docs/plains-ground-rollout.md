# Plains continuous-ground rollout (#239 / PR245)

The owner accepted the representative A grass/root plus C2 soil treatment and
approved applying it across the remaining continuous Plains ground. This current
rollout supersedes the single-preview hold in the dated
[prototype notes](plains-contour-prototype.md). Full-trail owner keyboard playtest
acceptance remains a separate later gate. Source B remains failed and retired;
all five image calls are spent. No new images or pixel replacements were used.

The same kit now covers x[0,4300): 65 authored segments, 64 joins and both route
boundaries (131 ground inventory rows; 19 pilot and 112 outside). The remaining
66 inventory rows retain their preservation or functional-witness roles. There
are no added platforms, gaps, underpasses or motion lanes. At the start the
camera exposes native column x0; at the finish its maximum x3874 exposes column
x4299. There are no invented end caps. Native boundary appearance still requires
the coordinator's prepared browser checks.

Sampling stays anchored to the accepted pilot at world x580, independently of
the cache extent. Grass uses `20 + positiveModulo(x - 580, 40)` and soil uses
`positiveModulo(x - 580, 64)`. The original vertical soil phase starts at each
rounded contact +8; grass starts at contact -2. Columns sample contact at x+0.5
and joins belong to the segment on the right. Tests compare every cache column
against unchanged source pixels, including the original x[580,1060) region,
negative phase inputs near x0, fractional cameras and unrelated-world fallback.
The gold landing band at x1230–1410 remains drawn above the ground.

The two newly enabled flower moves are deco-001 x240→150/y206 and deco-008
x2530→2342/y220. The accepted bush stays at x772/y206. All identities and variants
are retained. Support and pickup adjustment sets are empty. The current exact
preservation layer reverses these three decorative moves before applying the
unchanged historical Cove/HUD/water oracles; it grants no file exemptions.

The wider cache is 4300×114 at the normal Plains camera height. The contour
observer retains the actual bitmap origin and raw draw arguments while
registering its measurement reference at world580 for the byte-identical frozen
controller. Its route/Retry identities, 16 captures per route, physical input
acknowledgements, jump wait, deadlines and retries remain unchanged.

Full RGBA readback occurs once per cache observation. Evidence retains a lossless
PNG plus dimensions, length and SHA256 for reconstructed RGBA; it verifies PNG
pixels against the readback before retaining the reference. Controller PNGs in
raw histories use the existing file-backed evidence transport. Named entry
points and attachment semantics are retained, with missing/corrupt controls.
A measurement using the actual runtime software cache and installed Playwright
JSON reporter observed 1,960,800 RGBA bytes, a 197,909-byte PNG and a 564-byte
file-backed reporter result versus 21,575,624 bytes for the old array format.
This is a software transport measurement, not a native browser run or a new
full-CI report; the previous verified full-CI report was 420,999,426 bytes.

The coordinator's first cohort is Chromium426 contour route plus both Retry
cases. The second is the existing “Plains compact route: all rewards through
keyboard input with five-section gameplay captures” journey. Its input driver,
phases, viewports and limits remain intact, with artwork/grounding/provenance
observations and necessary boundary views added. Cached-map and manually
assembled renderer fixtures are audited separately: missing-kit fixtures retain
legacy behavior and do not count as loaded-kit artwork proof.

Worker checks are focused units, exact preservation consumers, typecheck and
build. Browser execution, full suites, fresh whole-PR review, final CI and owner
playtest acceptance belong to the coordinator. Historical local finish-layout
deadline failures remain failed with cause unknown; previous successful CI does
not erase them.
