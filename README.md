# Pac-Man Redux

A browser-based Pac-Man tribute with modular ES module architecture, multiple visual themes, and optional Electron desktop packaging. The project includes automated tests for core gameplay behaviors, rendering, and the development server.

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Run the browser build**
   ```bash
   npm start
   ```
   Then open <http://localhost:3000> in your browser.
3. **Launch the Electron wrapper (optional)**
   ```bash
   npm run electron:start
   ```
   1. Ensure you have already run `npm install`; the script reuses the locally installed `electron` binary.
   2. When the command starts you will see Electron log `Electron <version> starting...` in the terminal, followed by the devtools
      path it loads. A desktop window around 800×900 opens and immediately points to the same `index.html` you use in the browser.
   3. Interact with the game exactly as you would in Chrome/Firefox. Close the window to exit on Windows/Linux; on macOS, keep the
      menu bar active or quit fully with <kbd>Cmd</kbd>+<kbd>Q</kbd>.

4. **Package the desktop app**
   ```bash
   npm run electron:build
   ```
   1. The build script copies the renderer into `dist/` and emits placeholder desktop artifacts in `release/`. Install the optional
      Electron dependencies (`electron`, `electron-builder`, `electron-updater`) so the script can invoke `electron-builder` instead of
      generating placeholders.
   2. Provide signing credentials through environment variables when packaging in CI:
      - **Windows**: `WINDOWS_CERT_BASE64` (Base64 `.pfx`), `WINDOWS_CERT_PASSWORD`, and `WINDOWS_CERT_SUBJECT`
      - **macOS**: `MAC_CERT_BASE64` (Base64 `.p12`), `MAC_CERT_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
   3. Tagged builds on GitHub Actions upload the resulting installers as artifacts and attach them to draft releases automatically.

5. **Run the headless desktop smoke test**
   ```bash
   npm run electron:smoke
   ```
   This launches Electron in headless mode to confirm the desktop shell can boot the bundled HTML without manual interaction. If Electron
   is not installed locally the script logs a skip notice and exits successfully. Successful runs emit JSON telemetry under
   `artifacts/telemetry/` summarising startup timing, readiness, and crash diagnostics.

6. **Build production assets**
   ```bash
   npm run build
   ```
   The build script creates `dist/` by copying the source assets so the static server and Electron wrapper automatically prefer the built
   files when they exist.

## Testing

Run the Node-based suite that exercises gameplay logic, renderer integration, and the static file server:

```bash
npm test
```

For an end-to-end sanity check that launches the real browser build and simulates play via Playwright, run:

```bash
npm run test:playwright
```

When Electron is installed you can also emit a telemetry report from the headless smoke test:

```bash
npm run electron:smoke
```
The script records startup timing and crash diagnostics in `artifacts/telemetry/`, which CI uploads as workflow artifacts.

## Project structure

- `src/` – Core gameplay modules (maze layout, entities, state machine, renderer, audio, etc.).
- `style.css` – Theme styling, responsive HUD layout, and animation effects.
- `electron/` – Electron main process and preload scripts for the desktop build.
- `server.js` – Lightweight static server used by `npm start`.
- `test/` – Node test suites that cover gameplay scenarios and server behavior.

## Features

- Multiple visual themes (classic, neon, haunted) with palette-driven sprite variations and a HUD theme toggle.
- HUD controls for muting or adjusting in-game audio without leaving the session.
- PCM audio samples replace synthesized tones for pellets, power cores, ghost captures, and fruit rewards while preserving HUD
  volume controls.
- Adaptive difficulty scaling, fruit bonuses, ghost personality AI, and frightened-mode combo scoring.
- Replay capture hooks, debug overlay, and responsive controls for desktop and mobile play.
- Electron packaging support with headless test execution to verify the desktop entry point.
- Offscreen canvas caching for maze walls and collectibles keeps rendering smooth, only redrawing layers when maze data changes.

