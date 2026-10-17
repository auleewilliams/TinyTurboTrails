# Slime squash verification (#142)

## Scope

Falling top contact squashes slimes without damage and produces one small fixed
bounce, retaining sideways motion. Side/underneath contact still damages Henry.
Flattened slimes retain their themed costume, stop moving, remain harmless, and
persist through checkpoint/pit/health recovery within the current run. Every new
run resets them. No reward, tool, weapon or persistent storage is added.

Tied simultaneous tops squash together in stable ID order with one bounce/sound.
The provisional tuning is a 260px/s bounce, 4px horizontal edge forgiveness and a
0.16s squash animation. These values have not received owner playtest approval.

## Captures

These are actual Chromium captures produced by `tests/slime-squash.spec.ts`, not
mockups. They were visually inspected during verification.

- [Upright Plains slime](chromium-keyboard-upright.png)
- [Flattened slime after keyboard input](chromium-keyboard-flattened.png)
- [Flattened slime after simulated standard-controller input](chromium-controller-flattened.png)
- [All six costumes: upright, transition and flattened](chromium-all-costumes.png)

The gameplay captures show three hearts after the squash and a flattened,
recognisable straw-hat slime at ground level. The costume sheet preserves all six
accessory variants, although small flattened accessories necessarily lose detail.
The controller test uses the standard Gamepad API boundary; it does not establish
physical-controller testing. Sound generation is covered automatically and can be
auditioned with the `squash` button at `/?audio`; subjective sound balance and
child/owner playtesting remain manual acceptance work.

## Automated evidence

- `tdd-transcript.txt`: captured failing/passing focused regression runs, including
  sabotage checks for jump-release independence.
- `independent-review-final.json`: independent production-diff review; its
  positive fast-fall trajectory coverage suggestion was addressed in `ebeee51`.
- `security-scan.json`: added-line static scan.
- `local-gates.txt`: retained earlier quality-gate output; current final-snapshot
  verification is recorded below rather than relabelling interrupted runs green.

The browser route driver now starts avoidance at the leftmost patrol bound rather
than the authored spawn centre. A separate read-only review of `abe1723` found no
security or logic errors; its non-blocking suggestion was to use more independent
expected coordinates in the driver invariant. Existing route, star, timeout and
retry assertions were not weakened.

An earlier full browser run was interrupted (exit 143) and had route failures;
it is not evidence of a green final snapshot. After the driver correction,
the Firefox Quarry title-picker route passed. A fresh isolated WebKit Quarry
signature run also passed, including its unchanged three-star assertion.

## Final snapshot checks

Recovery checks on `abe1723`:

- `npm test -- --maxWorkers=2`: 796 tests passed across 45 files.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test:ci`: 8 tests passed.
- `git diff --check`: passed.

- `CI=1 npm run test:browser -- --reporter=line,json`: completed, 283 passed,
  1 skipped, 1 failed (27.8 minutes). The sole failure was the unchanged WebKit
  six-destination keyboard/controller selection test exceeding its overall 30s
  budget near the final destination. The trace shows selection and start
  assertions completing, including the final `Playing` / `X 60` assertions, but
  after the test deadline. No route, star or squash assertion failed.
- The same unchanged WebKit destination-selection test passed in isolation in
  26.0s. This demonstrates sensitivity to the shared local scheduling budget; it
  does not turn the failed full run into a passing one. No timeout or retry was
  increased. A resource-isolated full rerun and remote PR CI follow.
