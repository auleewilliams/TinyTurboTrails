# Browser foundation implementation plan

Goal: implement GitHub issue #1 against docs/REQUIREMENTS.md.

Architecture: Canvas 2D at 426 × 240, an integer-scaled viewport, a 60 Hz
simulation clock, browser input adapter, replaceable scenes and a silent audio
interface. Runtime state stays in memory. No illustrated assets are needed yet.

1. Add npm/Vite/TypeScript configuration and clock/viewport regression tests.
   Verify missing implementation fails before adding clock and viewport modules.
2. Implement scene lifecycle, input clearing and focus/pause handling; connect a
   diagnostic scene to the canvas. Keep input polling outside simulation pause.
3. Add production-browser smoke tests, CI and setup/architecture documentation.
4. Run clean install, type-check, tests, production build and available browser
   checks. Record exact evidence and outstanding macOS/previous-major checks.

Files: src/core/{clock,viewport,input,audio,scene}.ts own their named boundaries;
src/main.ts owns browser lifecycle; src/foundation-scene.ts is disposable
foundation diagnostic content. tests/*.test.ts cover timing and sizing;
tests/browser.spec.ts checks the production app using Playwright.

Scope constraints: no movement system, generated artwork, level, persistence,
hosting or synthesized audio in this ticket. Do not close #1 until its browser
matrix and remote CI have actually passed.
