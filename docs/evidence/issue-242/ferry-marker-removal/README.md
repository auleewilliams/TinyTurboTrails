# Remove Sunset ferry path markers

The owner requested removal of the remaining white dots and endpoint marks in
Sunset after the earlier fixed-platform marker correction. The renderer now
omits path indicators for every Sunset platform, including the moving ferry.
The ferry motion, carrying, timing, endpoints, artwork and other trails are
unchanged. This uses no image-generation calls; four of six remain spent.

`assets/source/site/steel-v1/ferry-marker-removal-preservation.json` records the
exact renderer bytes separately from the previous preserved snapshots.

## Validation

- Typecheck and production build passed.
- Focused renderer/site tests: 63 passed. A complete Sunset draw produces zero
  path marks and 32 steel images; the same fixed and moving supports still draw
  all their markers outside Sunset.
- Script suite: 110 passed, including asset reproduction and preservation guards.
- All six configured browser journeys passed, with no skips or retries:
  Chromium, Firefox and WebKit at 426px and 320px. These exercise boarding,
  riding and leaving the ferry in both directions, plus absent-ferry recovery.
- Strict report reconciliation verified 258 attachments. Source/build readback
  matched 582 source hashes and 528 served/build bodies. `readback.json` records
  these checks. Original precommit observations retain `sourceRevision: null`
  and the previous working base; their source hashes bind the runtime bytes.
- The full unit run passed 2,043 tests and failed one: the unchanged Plains
  full-cache pixel-analysis test exceeded its existing 5,000ms deadline.
  The full unit run overlapped the browser run. The original failure is retained
  in `unit.log.gz`. An isolated rerun of the unchanged Plains file passed all
  five tests (`plains-isolated.log.gz`); this does not establish a root cause,
  fix or waiver for the original timeout.

## Gameplay captures

The ordinary-input boarding scene was inspected at both window sizes. The ferry
has no white path dots or endpoint marks.

![Sunset ferry without white markers, native capture](426-native.png)

![Sunset ferry at a 320px window](320-css.png)

Earlier CI/reviews at `119f73b` remain historical. A fresh review and exact-head
CI are pending for this correction. Completed-trail owner acceptance remains
separate and pending; no merge or issue closure is authorized.
