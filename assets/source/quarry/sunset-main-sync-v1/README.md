# Quarry / merged Sunset shared-source composition

This is a current integration adapter, separate from the immutable trail approvals.
It combines accepted Quarry `d44c2e5ada91ac86c5835448a32c7db7a3f2f79e`
with merged Sunset main `b4b152d05a61f9cc87c075516b93d5a6d4ec6e16`.
The shared historical main is `01645980faddaed1c918c2f38f195f49ec40a108`.

`receipt.json` covers exactly `src/world/assets.ts` and `src/world/renderer.ts`.
It records complete combined identities, independent complete accepted side pins,
and bounded byte-offset hunks that construct that combined source from each side.
The Quarry and Sunset directories contain byte-identical copies from those exact
revisions. The shared projection uses the existing immutable four-shelf baseline.
The adapter in `scripts/quarry-site-integration.mjs` seals this receipt and also
holds the original side hashes independently. It reconstructs and checks the
entire combined file before returning an accepted side to historical guards.
Other inputs pass unchanged to the existing strict guards; corruption receives
no normalization. Original approvals, manifests, pixels, and delta pins stay intact.

The only runtime composition is the union of loader fields/imports/initialization,
custom ground/platform dispatch, and accepted zero-marker conditions for Quarry
and Sunset. Timbers keeps stationary-only marker suppression. Trail geometry,
rewards, patrol definitions, physics, controls, camera, and artwork stay at their
accepted bytes. Browser/HUD/map graphs and serialized renderer dependencies carry
both kits; pixel callers use the actual Site kit rather than legacy atlas art.

The owner already accepted the complete Quarry playthrough. This integration does
not introduce a repeat-playthrough gate. All newly authored negative controls and
existing tests are UNRUN in this writer; permission holds remain active. A source
handoff and typecheck do not establish new-head CI or artifact certification.
