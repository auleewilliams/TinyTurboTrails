# Rebase onto main — 2026-11-10

Rebase target: `b67369e7c2c0b488c096d5933b1df8a9024d4ee9` (merged Frost/HUD PR #250).
Original tablet feature commit: `affbf439f5d4ad88bc9ae2e557a4143b3c81cfb5`.

The source-preservation conflict composes the newer tablet projection before the
Frost and HUD projections. The tablet record now reverses to the exact current
main files, including its updated browser observers. Historical Frost/HUD pins
remain unchanged; their original negative checks and strict identity assertions
still apply after the tablet layer. No source validators or runtime checks are
disabled.

Main's Frost artwork, preview cache, checkpoint grounding and top HUD ribbon are
retained. World files, runtime assets and dependency manifests have no tablet
branch changes relative to this main. Reversing each of the ten tablet record
entries was independently checked against `git show` of the exact rebase target.

Validation of the resolved rebase source:

- `npm test -- --maxWorkers=1`: 2,234 passed across 128 files.
- `npm run test:ci`: 161 passed.
- Focused composition checks: 8 passed.
- `npm run typecheck`, `npm run build` and `git diff --check`: passed.
- Affected browser checks, one worker: 19 passed, 2 expected skips. Coverage
  includes tablet input/capability detection, menu and pause interactions, uniform
  viewport resizing, fullscreen, and keyboard/controller interface text. Native
  multi-contact injection remains Chromium-only.

The full browser suite was not repeated locally for the rebase; PR CI verifies
the pushed head. Prior full-run/serial/base-comparison findings remain historical
evidence under the parent directory and are not claimed as results on this base.
Physical iPad Air acceptance is still pending.

Current production-build captures: [gameplay](tablet-gameplay.png) and
[Pause](tablet-pause.png). The parent mockups predate main's HUD ribbon relocation.
Logs, browser identities and actual checked source hashes are stored alongside
this note. No new artwork was generated.
