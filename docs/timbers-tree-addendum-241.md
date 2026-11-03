# Timbers tree artwork addition

The owner requested that the tree join the same issue #241 work: “Can we do that, I want it to be apart of this work.” They then chose “Add a separate two-call budget; keep the original reserves.” This supersedes the original plan's preservation of the central trunk and six scenic connecting limbs, and authorizes their matching illustrated-art pass. It does not approve the first preview or roll out the other 32 platforms.

## Bounded addition and source plan

Replace the one existing noncolliding tree—central trunk and all six connecting limbs—with one connected transparent bitmap. Match the existing warm illustrated bark family, with quieter/darker grain and no bright horizontal walking lips on these background parts. Preserve the existing ground and platform source/production PNGs exactly. Preserve the panorama, ambient leaves, Henry, interface, all collision/platform/pickup/checkpoint/finish coordinates and mechanics. Do not restore the 11 removed decorations or add foliage, a canopy, extra limbs or other scenery.

The trunk runs from y180 to the real ground at y1080. Its measured section edges are (left/right): y180 390/430; y300 382/440; y420 376/447; y540 374/449; y660 364/456; y780 361/460; y900 351/468; y1080 343/478. The original scenic limb outer anchors are (210,300), (170,420), (585,540), (65,660), (600,780), (185,900); each joins the trunk around x410 at y+28 through y+43. All are scenery, not collision supports.

The [measured layout](../assets/source/timbers/tree-v1/layout.json) and its code-derived SVG/PNG guide show the current geometry inside a 576×960 frame at world origin (32,144). The guide is a source-layout reference, not production art or gameplay evidence. The new source may round/naturalize this scenic silhouette within that frame, but must retain the six connection locations, land its substantial base on y1080, and remain clearly behind real landing surfaces. Inspect actual output and use whole-image uniform preparation; do not mask it to the old polygon, cut branches/roots, recolour/repair pixels, or squeeze either axis to force fit. Any source fit conflict beyond the approved tree role stops that target for a narrow decision.

Use the original branch source as a material/style reference, without editing it. Generate the tree as a single connected object to avoid joins and inconsistent texture scale between trunk and limbs. Retain full originals, actual requests/results and exact deterministic source/prepared PNG/RGBA bindings in `assets/source/timbers/tree-v1/`. The native whole-tree asset will be required by the Timbers kit, drawn in the existing tree layer behind terrain/platforms, pickups and Henry, and loaded by the same map/preview consumers. Missing resources must recover through ordinary Retry.

## Separately approved budget

Tree role T: one initial source call and at most one targeted refinement for an observed source/output failure. Count rejected/failed calls. No automatic retries or other-role reallocation. The old five-call allowance remains unchanged: three spent, B unused, and the A refinement unused. The new tree cap is two, so the combined hard cap is seven. [Authorization and live tree ledger](../assets/source/timbers/tree-v1/authorization-and-budget.json).

## Verification and integration

Current main remains `885b6c16d5397e061f1ccb40ca326856bc77db88`. The open issue/PR check and actual changed-file patches found no competing Timbers implementation. Plains PR245 and Sunset PR246 overlap shared loader/renderer/fixture integration; neither changes the Timbers tree. Reconcile them before future publication if main changes.

Keep the earlier terrain-preview records immutable. Tree baseline source copies/hashes preserve that exact candidate separately. Exercise roots, middle/spring clearance and catch, summit/top, return, and map views at native426×240 and 320px CSS. Confirm tree base grounding, six readable background connections, unchanged platform art and foreground Henry/pickups. Add focused required-load/Retry, whole-image pixel/preparation, geometry/preservation and draw-layer coverage; update manual renderer fixture imports if needed. Run applicable units/scripts, typecheck/build and the browser suite, retaining original deadlines/retries and all failures. Historical two unit deadlines and three Cove browser deadlines remain failed observations, not waived by this addition or later passes.

The expanded representative preview still needs owner visual acceptance before the remaining platform rollout. No commit, push, PR, merge, issue closure or deployment is authorized by this addition.

[Completed connected-tree preview and verification](timbers-tree-preview-241.md).
