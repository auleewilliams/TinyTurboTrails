# Frost Ridge: snow decisions and three slides

Refs #222. The route uses a short introductory ice slope, a fir climb to the
first ridge, a longer descending and flattening ice bowl, high snow shelves
with one optional spring, a short upper glide, and a snowy summit. The summit
is above the first ridge. All six trails remain freely selectable.

Ice remains terrain at friction 0.45. No movement, jump, recovery, input,
progression, persistence or camera defaults changed. Frost enables the existing
vertical camera while retaining horizontal progress, grounded checkpoints,
supported finish activation and the existing finish/retrace/word flow.

The terrain spans 5600px. Snow runouts follow ice at x360, x2350 and x3650.
Checkpoints stand on snow at x1350, x2760 and x4040. Return supports are permanent
normal-grip one-way tops. The intro uses three steps rather than copying the
sketch's two close overhead supports. Bowl returns use five steps and the upper
glide uses two. Their undersides clear the full 48px sprite during grounded
forward travel. A boundary jump may board a return support; its real outer edge
reconnects to continuous terrain. There is no drop-through control.

The original 36 main gem IDs and three bonus IDs remain, with no stars. The
spring and its higher gem arc are optional; a held flight permits collection,
landing beside it and another attempt. Main-route jumps can bypass it in either
direction. SNOW keeps its original identities on snow at x110, x1190, x2620 and
x5320. S moved away from the starting body so a zero-letter journey is possible.
The summit return point is x5410, left of the arch at x5520. Deliberate departure
left of x5360 rearms the finish; an airborne crossing cannot finish.

## Observation and evidence limits

The new baseline observation used actual Chromium keyboard input on unmodified
1fb12883075e31a50440bff9e35ebfa400265c48 at a 426×300 window with a 426×240
canvas. It reached the old actual finish with 37/39 gems and all four letters.
Captured old sections include x420/2350/4200/6100/7900/9700 and snow stops near
x760/3100/4700/6900/8800/10700. The optional x5090 hop was attempted. The x4700
image shows health below full. This records an automated journey, not owner fun
or an exhaustive explanation of every missed reward or contact.

Canonical raw evidence is outside the repository in the coordinator's
`m8-222-evidence` directory; continuation scratch is in
`m8-222-capacity-retry-evidence`. The handoff identifies each cohort and its
source. The interrupted baseline report remains failed: 1813 loaded tests,
1809 passed, four failed, and seven finish-grounding identities did not load
because Python subprocess creation returned EPERM. An approved unchanged repeat
of the two affected files passed all 11 tests. The first browser attempt had
connection refusal before gameplay. The first development native cohort loaded
the old bundle after a build failed on unused test imports; its six failures are
retained and do not evaluate the new geometry. Later failures and dispositions
remain in the handoff; none is silently relabelled as passing.

## Coverage migration ledger

| Existing coverage | Preserved purpose and replacement |
| --- | --- |
| Frost exploration: nine cases | Preserve all 39 IDs/no stars, optional reward separation, five real all-gem cadence journeys, actual-earned retention through recovery, ordinary finish. Retire exact historical layout equality and the old x5090 hop. |
| Grouped biome validity | Keep Cove's six checkpoints, six springs, ≤240px terrain and slope bounds. Frost gets three grounded snow checkpoints, one optional spring, connected height range and approved snow rises. |
| Frost ice-flat case | Replace six flat patches with three contiguous downhill experiences, a flattening bowl and clear snow runouts. |
| Grouped biome gameplay: seven cases | Keep both selection/finish/replay/reward identities. Frost uses its own input route and all-gem journey; Cove assertions remain applicable and unchanged. |
| All-trails education Frost identity | Explicitly route Frost to Frost's actual-finish missed-SNOW journey. Sunset retains Sunset's pilot; no generic vertical-camera dispatch remains. |
| Existing native material/completion/replay | Reanchor the ice observation, keep the 120ms/>80 velocity obligation, Pause freeze, finish rewards and fresh replay. Frost observes its actual status during Pause instead of a removed slime. Cove retains its creature observation. |
| Existing native spelling Frost | Preserve missed-ID/partial assembly/manual assembly/sticker/navigation/reload checks, using Frost's returns and real keyboard input. |
| Three generated Frost slime cases | Retire Frost's patrol, slime-side-damage and scene-squash parameters because Frost now has no slimes. Other trails retain those positive contracts; Frost's complete main/reward/retrace journeys assert no damage and clear runouts. |
| Generated Frost checkpoint-crossing case | Retire the legacy airborne/spring-height flag parameter when enabling grounded activation. The new full input trips require exact forward/reverse checkpoint order and supported recovery without repeated standing feedback. |
| Area and camera fixtures | Preserve all six route labels and expiry, plus exact reset framing for abandon/replay/Next; reanchor Frost to its authored sections and y362 starting camera. |
| New Frost route units | Mixed cadence complete returns, W and N/S trips, stopping/reversal/boundary jumps, full sprite clearance, finish height/rearm, failed-jump retries and support/bypass-removal controls. |
| Four new native cases per engine | 426px/320px keyboard journeys, full missed-SNOW retrace/manual assembly, and actual Gamepad API movement/jumps through finish. Moving-paint captures supplement resting screenshots. |

Multiplicity: the complete baseline has 1820 unit identities. Three obsolete Frost slime parameters and one legacy checkpoint parameter retire; 16 route cases are added, yielding 1832. Native discovery retains all 540 existing identities and adds four Frost cases per engine, yielding 552.

The shared renderer adds only Frost's snow-top presentation within the existing
platform drawer. It adds no import or fixture dependency. Cached previews already
use the vertical-camera/platform path; native framing and renderer fixture checks
remain part of validation. Source checks are in [the route tests](../tests/frost-route.test.ts)
and [native journeys](../tests/frost-ridge.spec.ts).

Review, full CI and artifact verification belong to the coordinator and are
pending unless separately recorded. Owner enjoyment, stopping feel, frustration,
clarity, retries, summit payoff, duration, hardware controller, child, native
Safari and assistive-technology observations remain unobserved. Automated
reachability does not establish those outcomes. Issue #222 stays open; this
change does not authorize merge, deployment or release.
