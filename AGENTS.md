# Repository Guidelines

## Project Structure & Module Organization

This is a Vite/TypeScript browser game. Application code lives in `src/`, grouped
into `core`, `game`, `world`, and `art` modules. Static processed assets are in
`public/`; source/provenance material is in `assets/source/`. Unit tests are in
`tests/*.test.ts`; Playwright tests are in `tests/*.spec.ts`. Documentation is in
`docs/`.

## Build, Test, and Development Commands

Use Node.js 22.12 or newer.

```sh
npm ci                 # Install the lockfile's exact dependencies
npm run dev            # Start Vite locally at 127.0.0.1
npm run typecheck      # Run the TypeScript compiler without emitting files
npm test               # Run the Vitest unit suite
npm run build          # Type-check and create the production bundle in dist/
npm run preview        # Serve the production bundle locally
npm run test:browser   # Run Playwright checks in Chromium, Firefox, and WebKit
```

Open `/` or `/?scene=adventure` for play; `/?scene=foundation` is diagnostic. Install
Playwright browsers with
`npx playwright install --with-deps chromium firefox webkit` when needed.

## Coding Style & Naming Conventions

Follow the existing TypeScript style: two-space indentation, semicolons, single
quotes, and explicit exported types. Use `camelCase` for variables/functions,
`PascalCase` for classes/types, and descriptive filenames such as
`adventure-scene.ts`. Keep simulation deterministic and separate from rendering.

## Testing Guidelines

Add focused Vitest coverage in the matching `tests/*.test.ts` file. Add
end-to-end behavior to `tests/browser.spec.ts`. Run
`npm test`, `npm run typecheck`, and `npm run build` for code changes; run the
browser suite for changes affecting routes, input, rendering, audio, or assets.

## Commit & Pull Request Guidelines

Use concise imperative commit subjects, optionally with a scope, for example
`feat: add checkpoint recovery tests` or `docs: record release verification`.
Pull requests should explain the user-visible change, link the relevant issue,
list validation commands and results, and include screenshots or recordings for
visual/gameplay changes. Document known limitations and leave unrelated fixes in
separate issues or pull requests.

## Issue Tracker Access

Track work in [GitHub Issues](https://github.com/auleewilliams/TinyTurboTrails/issues).
Use the authenticated GitHub CLI with an explicit repository:

```sh
gh issue list --repo auleewilliams/TinyTurboTrails --state open
gh issue view 119 --repo auleewilliams/TinyTurboTrails --comments
gh issue create --repo auleewilliams/TinyTurboTrails --title "Issue title" --body-file path/to/issue.md
```

Replace `119` with the relevant issue number. Search for existing issues before
creating a new one. Write multiline issue descriptions to a UTF-8 file and use
`--body-file` to preserve Markdown and avoid shell quoting problems.

If the GitHub connector returns `Resource not accessible by integration`, use
`gh`; connector permissions and CLI authentication are separate. If sandboxing
blocks the CLI configuration or network access, request command escalation and
retry. Never print tokens or copy credentials into the repository. If a create
attempt has an uncertain result, check the tracker before retrying to avoid
duplicates. Verify the published issue and return its URL.

## Configuration & Asset Notes

The game has no backend, credentials, runtime image-generation dependency, or
persistent save store. Keep generated/processed assets project-local, preserve
their provenance notes, and do not add API keys or browser-storage persistence.
