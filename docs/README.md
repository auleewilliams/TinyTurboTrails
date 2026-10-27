# Documentation index

## Current guidance

- [Play, controls and development commands](../README.md)
- [Contributor and testing rules](../AGENTS.md)
- [Canonical product requirements](REQUIREMENTS.md)
- [Adventure, map and finish navigation](plains-adventure.md)
- [Patchwork Vale exploration premise and owner checklist](patchwork-vale-story.md)
- [Movement and authored traction](gameplay-movement.md)
- [Run interactions and recovery](gameplay-interactions.md)
- [Optional star challenges and safe returns](signature-challenges.md)
- [Moving platforms](moving-platforms.md)
- [World and level architecture](plains-world.md)
- [Timbers ascent and playtest notes](TIMBERS-ASCENT.md)
- [Art direction and provenance](art/README.md)
- [Music and effects](AUDIO.md)
- [LAN deployment and rollback](DEPLOYMENT.md)
- [CI reliability](CI-RELIABILITY.md)

## Published release

- [v0.1.0 — First playable six-trail release](https://github.com/auleewilliams/TinyTurboTrails/releases/tag/v0.1.0):
  source commit `bee0f7d402395af8d9ed7a4693e6739d9f905607`, exact-commit CI evidence,
  verified container identity, owner-accepted manual-check limitations and a
  reproducible future-release process are recorded in its release notes.

The release tag is fixed; this documentation and `main` may subsequently change.
Publishing a release is distinct from deploying it. Earlier certification and
waivers below apply only to their dated candidates, not automatically to v0.1.0.

## Dated evidence, not current certification

- [Suite purpose, coverage and cost audit for issue 167](evidence/issue-167/README.md)

- [Foundation payload, renderer and build hygiene milestone](evidence/milestone-6/README.md)
- [Henry celebration and Patchwork Vale milestone](evidence/henry-patchwork-vale/README.md)

- [Trail presentation milestone and pending human check](evidence/trail-milestone/README.md)
- [2026-09-17 certification, tested commit and waivers](RELEASE-VERIFICATION-2026-09-17.md)
- [Earlier release verification and defect history](RELEASE-VERIFICATION.md)
- [First playable release record](FIRST-PLAYABLE-RELEASE.md)
- [Foundation verification, 2026-09-14](VERIFICATION.md)
- [Original manual worksheet and its recorded waiver](RELEASE-MANUAL-CHECKLIST.md)

Evidence directories retain their dates, commits, actual results and limitations.
A historical waiver applies only to its recorded release, not to later changes.

## Maintenance

Update the root README and adventure guide when routes, controls or registered
levels change; update requirements when product behavior changes. Movement and
interaction tuning belong in their respective guides. Asset changes update the
art guide and project-local source provenance. Deployment changes update the LAN
guide. Record each verification run under `docs/evidence/` with its revision,
commands, outcomes, screenshots and unperformed checks. Link to detailed records
instead of copying test counts into current-facing documentation.
