# PR246 review — head 6dfb9dfb1a41bd67405c2ac1ca6cd4511bbfb6c2 vs base 885b6c16d5397e061f1ccb40ca326856bc77db88

Verdict: no production-code correctness defects found in the preview scope. One likely CI blocker in new test infra (F1).
Two preview-evidence/art findings should be resolved or put to the owner before asking for preview approval (F2, F3).

F1 High — tests/site-steel-preview.spec.ts:14 — execFileSync('rg') assumes a ripgrep binary on PATH. Locally: ENOENT (rg is only a shell function). On ubuntu-latest CI it is likely absent, so all 6 capture cases (2 widths x 3 engines) throw before any assertion. Use `git ls-files src public/assets/site` or a recursive readdir.

F2 Medium — scripts/prepare-site-art.mjs:18 / scripts/site-art-pixels.mjs:56 — trimming keeps any nonzero alpha. Row 0 of every fixed run has max alpha 7 (mean 4), and ferry rows 0 and 14 have max alpha 1. The visible steel top is therefore 1px below the collision plane: in the stacked-underpass capture Henry hovers 1px above the deck, while on gravel his feet touch. The ferry is about 13px visibly deep, not the 15px claimed in manifest visibleDepth and the source README (lines 16 and 44). No steel/ferry pixel is fully opaque either (max 253, inherited from the 252–253 body alpha of the generated source), but the README says the noise is only in the outer padding. This is an owner decision: accept the offset, or record an alpha/fit failure and spend the steel refinement. In either case the evidence claims need correcting. The plan does not allow an alpha-threshold trim without approval.

F3 Medium — docs/evidence/issue-242/preview-01/gallery.json vs docs/sunset-art-plan.md:137 — the plan requires the owner packet to show boarding, riding and disembarking in both directions plus an absent-ferry fall. The gallery has none of these: below-ferry, far-dock and return all use jumps. The crane test's screenshots (near-dock-and-lower-catch, far-fixed-dock-A, absent-carriage-catch) exist only as hashes in validation/preview-native.json. Commit file-backed copies of those existing attachments before asking for approval. No generation is needed.

F4 Low — scripts/prepare-site-art.mjs:65 — every other centre cell is mirrored. The plan's allowed operations list trim, uniform resample and extract/repeat; mirroring is not on it. The README discloses it and the result looks clean, but the owner should accept it explicitly as part of the preview.

F5 Low — src/world/site-terrain.ts:96 — a layout/manifest mismatch throws from the per-frame draw path, not at load where loading error/Retry would show it. Current unit tests guard the data, so this is hardening only.

Verified OK: 14 gems = exactly the 38-row subset whose overhead is a preview support or the ferry (checked against inventory overheadIds); full level equality minus those 14; all changes gated on sunset/siteTerrain; other trails' bytes pinned; Retry is uncached; the dock/wall observers use the same transform as Henry's sampling; 70 captured source hashes match head; run widths and caps are complete; gravel is opaque with no paint above y680.
Local: 49 focused units + 21 script tests pass. finish-layout.test.ts alone passed 15/15 once here (no cause established).
