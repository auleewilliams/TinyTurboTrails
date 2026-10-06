# Shared ordinary gem

Created for issue #145 and refined in PR #149. The current runtime art is the
transparent sprite atlas `public/assets/gems/gems.png`, drawn by `drawGem` in
`src/world/renderer.ts`.

The first implementation used an elongated 24 x 32 diamond. After visual review,
three richer directions were explored with OpenAI ImageGen; the user selected
the broad brilliant-cut direction shown in `cut-diamond-concepts.png` (column C).
The board remains a design reference. On 2026-10-06, OpenAI ImageGen's built-in
tool produced `cut-diamond-source.png` from column C with actual transparency,
bright gold edges and preserved facets. The exact request is saved in
`cut-diamond-prompt.txt`. This source cutout supplies the runtime pixels; the game
no longer approximates the selected artwork with polygons or adds a dark rim.

Run `node scripts/prepare-gems.mjs` from the repository root to reproduce the
96 x 24 atlas using the installed Playwright Chromium. It trims the cutout to
its visible bounds, resamples once to 32 x 24 pixels, and packages amber, gold
and cyan cells. The 4:3 aspect ratio follows the selected broad diamond rather
than the narrower polygon interpretation. RGB palette remapping preserves the
same facets, highlights and alpha mask in all three cells. Gold retains the
source palette; amber is the default and cyan is used for Cove.

Every cell is drawn at native resolution with its visible bottom centered on the
rounded entity position. The shared 5,253-byte atlas is loaded once and required
before play, with the existing retry screen handling loading errors. There is
no runtime image generation, palette processing or external service.

Original atlas gem cells remain preserved with their existing provenance but
are no longer used for ordinary world collectibles. Counts, positions, pickup
rules, feedback, and separate special stars are unchanged.
