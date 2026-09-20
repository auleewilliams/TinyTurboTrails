# Star collectibles and challenge cues

Created for issue #93, 2026-09-20. Original code-authored pixel geometry by Codex
for this repository; no downloaded, generated raster or third-party artwork.
The canonical editable source and runtime asset are `src/world/renderer.ts`:
`drawSpecial` defines a 22px gold star with a dark rim and pale center;
`drawChallengeCues` defines matching signboards and dashed terrain landing bands.
The existing project palette supplies #10252c, #ffda75 and #fff7d6.

These code-native assets do not need an image-generation tool or an extra atlas.
No external service, API key, runtime generation or network asset is introduced.
The existing per-trail materials, backgrounds, spring sprites, lift rendering,
Henry artwork and synthesized pickup sound retain their original provenance.
