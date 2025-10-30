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
   1. The build script bundles the renderer (using any files emitted to `dist/` if you have a production build) and then invokes
      `electron-builder`.
   2. When the command completes you will find platform-specific installers in `dist/`:
      - `*.dmg` for macOS
      - `*.exe` created by the NSIS target for Windows
      - `*.AppImage` for Linux desktops
   3. Run the generated installer for your platform to launch the packaged app. On macOS you may need to approve running an
      unsigned application the first time. On Windows you can right-click the installer and choose **Run as administrator** if UAC
      prompts appear.

## Testing

Run the Node-based suite that exercises gameplay logic, renderer integration, and the static file server:

```bash
npm test
```

## Project structure

- `src/` – Core gameplay modules (maze layout, entities, state machine, renderer, audio, etc.).
- `style.css` – Theme styling, responsive HUD layout, and animation effects.
- `electron/` – Electron main process and preload scripts for the desktop build.
- `server.js` – Lightweight static server used by `npm start`.
- `test/` – Node test suites that cover gameplay scenarios and server behavior.

## Features

- Multiple visual themes (classic, neon, haunted) with palette-driven sprite variations and a HUD theme toggle.
- HUD controls for muting or adjusting in-game audio without leaving the session.
- Adaptive difficulty scaling, fruit bonuses, ghost personality AI, and frightened-mode combo scoring.
- Replay capture hooks, debug overlay, and responsive controls for desktop and mobile play.
- Electron packaging support with headless test execution to verify the desktop entry point.

