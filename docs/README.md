# Documentation index

## Current guidance

- [Play, controls and development commands](../README.md)
- [Contributor and testing rules](../AGENTS.md)
- [Canonical product requirements](REQUIREMENTS.md)
- [Adventure, map and finish navigation](plains-adventure.md)
- [Patchwork Vale story, storyboard and parent checklist](patchwork-vale-story.md)
- [Movement and authored traction](gameplay-movement.md)
- [Run interactions and recovery](gameplay-interactions.md)
- [Optional star challenges and safe returns](signature-challenges.md)
- [Moving platforms](moving-platforms.md)
- [World and level architecture](plains-world.md)
- [Art direction and provenance](art/README.md)
- [Music and effects](AUDIO.md)
- [LAN deployment and rollback](DEPLOYMENT.md)
- [CI reliability](CI-RELIABILITY.md)

## Dated evidence, not current certification

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
