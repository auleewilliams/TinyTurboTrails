# Accepted Timbers artwork: complete platform rollout

The owner accepted the connected-tree preview at commit `abe92dd900c45c883f2e984812058991a46507b9` with “It's looking good, keep going!”. The preceding handoff explicitly identified the remaining 32 platforms as awaiting visual acceptance. This authorizes extending the accepted components to all 44 original support IDs. Final owner playtesting of the completed trail remains separate.

`accepted-preview.json` binds the accepted source, artwork and gameplay files. `accepted-manifest.json` is a byte-identical copy of the accepted 12-platform mapping; `accepted-assets.ts.txt` retains the shared loader before its required-terrain declaration guard. No accepted PNG or source image changes. The tree, its six scenic limbs, ground, twelve previous platform appearances, shared/Cove artwork, all gameplay geometry, rewards, controls and camera remain unchanged.

No generation calls are dispatched for the rollout. The seven additional widths are 170, 200, 210, 250, 340, 440 and 450 pixels. They use the same native 159×17 master derived from A-01, with complete 27px caps and the existing mirrored/repeated centre-column assembly. All widths are within the already accepted 120–580px range; the broad middle at 580px established the same material scale. Each new width remains 17px deep, within every measured envelope. No scaling, transparency editing, body/end cropping, notches, new colours or pixel repairs occur here. Both original unused generation allocations remain unused; the two separately approved tree calls remain spent.

Reproduce the rollout from the repository root:

```sh
node scripts/prepare-timbers-rollout.mjs /tmp/timbers-rollout
node --test scripts/prepare-timbers-rollout.test.mjs
```

The current required terrain manifest maps all 44 supports. `preparation.json` and the runtime `rollout-preparation.json` are identical records of each width's PNG hash, decoded RGBA hash, complete column map and accepted/new status. Source preparation records in `illustrated-v1/` and `tree-v1/` remain historical and unchanged. The old tree-preparation test reproduces that exact accepted input environment in a temporary directory; the full rollout does not regenerate the tree or rewrite its historical terrain-manifest binding.

`presentation-delta.json` records only the required-terrain guard and complete manifest extension. `scripts/timbers-rollout-preservation.mjs` reverses those pinned literal changes before the existing tree/preview/Cove preservation checks. Unknown changes fail; accepted pixels and unchanged world/gameplay files are checked directly against the accepted hashes. The production renderer rejects missing platform entries instead of falling back to the legacy artwork.
