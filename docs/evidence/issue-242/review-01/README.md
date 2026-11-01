# Review disposition for Sunset preview

Fresh Claude Opus5.5 reviewed the complete PR at
`6dfb9dfb1a41bd67405c2ac1ca6cd4511bbfb6c2` against
`885b6c16d5397e061f1ccb40ca326856bc77db88`. The original
[report](claude-review.md) is retained unchanged. No production-code defect was
found within the intended partial preview. This does not approve the art,
unreviewed follow-up changes, CI or the unfinished rollout.

## Disposition

- F1: removed the test's external ripgrep dependency using Node recursive
  directory enumeration, including untracked working files. Ripgrep is a real
  binary in the coordinator's environment and the prior capture cases passed;
  the reviewer's ENOENT was not reproduced here. Its availability remains an
  unnecessary portability dependency, so the narrow correction is appropriate.
- F2: independently measured all shipped fixed/ferry rows in
  [alpha-audit.json](alpha-audit.json). Fixed row0 peaks7/255. Ferry row0 peaks1/255
  and row14 peaks2/255 (the latter corrects the review's stated1/255). Steel alpha
  peaks253/255. The stronger top begins one pixel below the collision line;
  a faint1px apparent foot gap is possible. Ferry metadata `visibleDepth:15`
  counts nonzero-alpha bounds, while substantial body occupies13rows. Source
  documentation now makes these distinctions explicit. No pixels changed.
  The owner subsequently approved rollout using these same components, after
  the findings were presented. No targeted refinement is being spent.
- F3: the original gallery reached the docks by jumping and did not show the
  planned rides. The capture journey now includes actual walking aboard, carrying,
  disembarking in both directions, and falling to the catch when the ferry is
  absent. Native and320px CSS captures are recorded for each stage, using the
  existing actual-image dock observer and ordinary input. The original90s case
  deadline and existing regression tests remain unchanged.
- F4: alternating mirrored centre repeats were disclosed but not explicitly
  enumerated in the approved preparation operations. Explicit owner acceptance
  of the same components, received after these findings were presented, retains
  this existing treatment.
- F5: layout validation at draw time is a nonblocking future hardening suggestion;
  exact authored-layout tests cover the current data. No unrelated refactor added.

## CI finding beyond the review

Run41347911170 failed the preparation metadata comparison after all eight exact
decoded-RGBA/dimension/CRC contracts passed. Its101other script tests passed;
browser and build steps were skipped. The subsequent raw JSON comparison also
compared compressed PNG file digests, which legitimately differ by encoder.
The failed log is retained losslessly with its decoded hash in
[ci-failure.json](ci-failure.json). This is a failed CI run, not a browser pass.

The correction verifies both actual generated-file and immutable committed-file
SHA256 values, then compares all metadata exactly with only the independently
verified compressed digest projected to its committed value. Every source hash,
scale, cell, dimension and pixel/alpha hash remains exact. Existing PNG negative
controls cover compression-only differences, RGB/alpha changes, CRC and malformed
streams. A second preparation run must also reproduce every byte on the same
encoder. No artwork, historical hash record, timeout, retry or tolerance changed.

Four image-generation calls remain spent, both refinement reserves unused.
The expanded Chromium captures passed at426px and320px with unchanged90s
deadlines: [28 paired observations](../review-capture/gallery.json) include actual
ferry boarding, carrying, disembarking and absent-ferry recovery. The full script
suite passed102tests after the compression comparison correction; typecheck passed.

The [owner acceptance record](../../../../assets/source/site/steel-v1/accepted-preview/acceptance.json)
freezes this preview's manifest, preparation and original-source hashes for rollout.
No additional generation has occurred. Earlier local unit deadline
failures retain their failed status regardless of later isolated or CI passes.
