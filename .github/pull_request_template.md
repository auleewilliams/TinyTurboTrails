## Summary

<!-- Explain the problem and the resulting user-visible behavior. For internal or
documentation changes, describe what changes and why. Keep unrelated fixes separate. -->

## Related issue

<!-- Use "Closes #123" only when this PR fully resolves the issue. Otherwise use
"Related to #123". If there is no issue, state that briefly. -->

## Validation

<!-- Record commands and actual results; explain any skipped or failed checks.
For code changes, run npm test, npm run typecheck and npm run build.
For routes, input, rendering, audio or asset changes, also run npm run test:browser
in Chromium, Firefox and WebKit. For documentation-only changes, a whitespace
check and review of the rendered Markdown are sufficient. -->

| Check | Result / reason not run |
| --- | --- |
| `git diff --check` | |
| `npm test` | |
| `npm run typecheck` | |
| `npm run build` | |
| `npm run test:browser` | |

## Visual or gameplay evidence

<!-- Include screenshots or a recording for visual/gameplay changes, with the
route, viewport and relevant inputs needed to reproduce. Otherwise write N/A. -->

## Known limitations

<!-- Describe remaining limitations and link follow-up issues, or write None. -->

## Checklist

- [ ] The PR addresses the stated change without unrelated fixes.
- [ ] Relevant tests and documentation are updated, or are not needed for this change.
- [ ] Validation results and any outstanding checks are recorded above.
- [ ] New or changed assets are project-local and include source/provenance notes, or no assets changed.
