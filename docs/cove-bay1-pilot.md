The candidate changes only Sandy Cove's `cove-bay-ledge-1` presentation: one
140×30 bitmap at the existing x2960/top272, loaded with required Cove terrain
assets. The loader rejects missing/wrong-sized images and permits ordinary Retry;
the ID route returns after one native draw, preventing legacy rock bleed under
transparent edges. Other six supports use their existing kit paths. No collision,
movement, camera, scenery, materials or other trail data change.

Provenance and owner-authorized crop/two-pixel cleanup are recorded in
`assets/source/cove/bay1-b-v1/PROVENANCE.md`. The original generated source and
all prior source/preservation records remain unchanged.

The small Chromium pilot is `tests/cove-bay1.spec.ts`: ordinary existing keyboard
pilot input reaches bay1, passes below in both directions, jumps/lands on top,
then lands below. Each width426/320 records native426×240 and actual CSS capture
sizes, resource SHA, draw calls, flight frames and source/bundle witnesses. It
also checks the real accessible Retry button after aborting the new required PNG.
Cached preview and fractional raster tests include this PNG explicitly. The pilot-specific initializer reuses the existing staged keyboard protocol but
forwards every native RAF timestamp unchanged (covered by RED/GREEN test); the
shared historical Timber initializer is unchanged. No driver writes player,
world, simulation time or camera state.

HISTORICAL — 2026-10-29: the worker sandbox denied the existing Vite listener
127.0.0.1:4173 with EPERM, so that worker phase produced no gameplay captures.
Its failed reports and original null-source evidence remain preserved.

HISTORICAL — 2026-10-29: subsequent authorized HOST validation completed the
426px native and320px CSS full input journeys and the required-image Retry case.
That checkpoint reported3PASS/1FAIL, with no retries, skips or flaky cases:
cached-preview alone failed because its expectation used world y272 instead of
the camera-projected draw coordinate. Followup1 corrected that expectation and
CI provenance handling, with a preserved provenance RED,5passing focused tests
and passing typecheck. These observations do not establish a final browser/CI
pass, independent review or owner visual acceptance.

Validation requirements: complete the tight native/small input cohort through
its final captures and assertions before expanding browser coverage. Preserve
failed cohorts and truthful local-null or supplied-CI source identities; bind
native reports, actual CSS sizes and served resources to the tested checkpoint.
Software asset compositions are not browser screenshots, CSS320 captures or
jump/underpass certification. Publication requires inspection of the visual
result, owner visual acceptance, fresh Claude whole-original-base review and
exact-head CI/artifact verification within the coordinator's authority. Consult
[PR236](https://github.com/auleewilliams/TinyTurboTrails/pull/236) for current
exact-head validation and review status.
