# Issue #189 — revised scope and evidence

## Current scope

Maths has been removed from PR #190 at the owner's request and deferred to
[issue #193](https://github.com/auleewilliams/TinyTurboTrails/issues/193).
No sign, prompt, question/answer route, number-leaf reward or maths artwork remains.
The map collection offers only the existing tree sticker.

Letter collection and its interim matching/reward behaviour remain functional.
The owner wants collected letters used to make a word after finishing; the
assembly interaction is awaiting clarification, not implemented or represented
as finished here. No merge or deployment is authorised.

## Removal verification

Strict vertical RED → GREEN checks cover absence of trail activation at the
former sign x=2350 and availability of only one tree sticker / Return to map.
The external logs are in
`/home/leew/.hermes/cache/scratch/issue189-spelling-revision/`.
Additional unit coverage preserves repeated Es, every pickup permutation,
recovery/replay/trail retention, session reset, collection freeze, released
confirmation and same-frame exit/re-entry revisions. Browser tests preserve real
movement/letter collection and pointer/keyboard/standard-controller collection
access, and assert absent activity routes at the former sign.

Old maths and two-sticker screenshots have been removed from this revision.
Historical implementation/evidence remains in PR #190 history at `23e522f` and
`68e1ff5`; their full CI/review results **do not verify this revised head**.
The remaining word captures below are historical illustrations of the preserved
interim collection, not evidence of a final assembly design or current-head CI.

| Engine | Historical interim word capture |
| --- | --- |
| Chromium | [Word](chromium-word-small.png) |
| Firefox | [Word](firefox-word-small.png) |
| WebKit | [Word](webkit-word-small.png) |

## Verified removal snapshot

- `npm test`: **832 passed**, 48 files; `npm run typecheck`, `npm run build`
  and `npm run test:ci` (**8 passed**) succeeded.
- Targeted Chromium/Firefox/WebKit: **15 passed**, no failures/skips/retries.
  Real movement retains both Es and the tree reward; all three input methods
  retain collection focus, pixel freeze, focus-loss recovery and reload reset.
- The first browser run caught map selection changing to Plains: removing the
  obsolete selection state must not remove the collection target's explicit
  focus handler, which prevents the shared map-index fallback. Fixed and rerun.
  A separate new screenshot assertion initially raced viewport resize; it now
  waits the same two animation frames as existing viewport tests, without
  changing bounds or retries/timeouts.
- Fresh 320px captures inspected in all three engines: no maths sign or reward,
  only the tree sticker and Return to map; no new overlap/clipping observed.
  Downscaled-text child readability remains owner-led.
- Full revised-head CI is pending; historical green CI is not current evidence.

| Engine | Former activity location | Tree-only collection |
| --- | --- | --- |
| Chromium | [Trail](chromium-removed-activity-small.png) | [Collection](chromium-stickers-word-only-small.png) |
| Firefox | [Trail](firefox-removed-activity-small.png) | [Collection](firefox-stickers-word-only-small.png) |
| WebKit | [Trail](webkit-removed-activity-small.png) | [Collection](webkit-stickers-word-only-small.png) |

## Unrelated accepted fixes retained

- [Finish grounding](visual-clarity/README.md): all six trails; no new markings.
- [Static-prop pass-through and preserved slimes](../issue-191/README.md).

Those documents label their own snapshots and evidence. Automated input does not
establish child comprehension, enjoyment, physical-controller ergonomics or
owner approval. Fresh final-head CI and final spelling acceptance remain pending.
