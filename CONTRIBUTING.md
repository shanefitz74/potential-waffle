# Contributing

Thanks for helping build Byte vs. The Glitches! This document highlights the key conventions for working in the modular codebase.

## Project layout

- Runtime code lives under `src/` and is organised by responsibility:
  - `src/entities/` contains movement, collision, and AI.
  - `src/renderers/` draws the game using cached layers per theme.
  - `src/themes/` defines theme JSON descriptors consumed by the theme manager.
  - `src/gameLoop.js`, `src/maze.js`, `src/main.js`, and companions orchestrate gameplay, state, and DOM wiring.
- Browser assets are served from `index.html` and `style.css` in development. Production builds bundle to `dist/` via `npm run build`.
- Desktop integration lives under `electron/` with ES module entry points and build metadata.
- Tests run with the Node test runner from the `test/` directory.

## Development workflow

1. Install dependencies: `npm install`.
2. Start the dev server: `npm start` and open the printed URL.
3. Run the automated suites before submitting changes: `npm test` for unit/integration coverage and `npm run test:playwright`
   for end-to-end checks. If Electron is installed locally, also run `npm run electron:smoke` to regenerate telemetry.
4. When targeting production assets, run `npm run build`. This writes bundled output to `dist/`.
5. To exercise the Electron shell, use `npm run electron:start`. For packaged builds run `npm run electron:build` (generates icons automatically and produces platform installers).

## Code style guidelines

- Prefer ES modules throughout the repo.
- Keep gameplay logic (movement, collisions, state) inside the entity and loop modules. Rendering code should stay in the renderer classes.
- Use the shared helpers in `src/renderers/helpers.js` for glow and sprite drawing; avoid duplicating canvas state manipulation.
- When adding new persisted settings, use the `loadSetting`/`saveSetting` utilities and cover persistence with tests.
- Tests should use the Node test runner (`node --test`) for unit coverage and Playwright for UI flows. Mock canvas contexts using the helpers in `test/index.test.mjs` when asserting renderer behaviour.
- Avoid introducing binary assets directly. Generate runtime resources (icons, audio) from code or data URIs instead.

Happy hacking!
