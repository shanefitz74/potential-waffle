import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
let autoUpdaterPromise;
let autoUpdaterRegistered = false;

const SMOKE_TEST_MODE = process.env.ELECTRON_SMOKE_TEST === '1';
const smokeStart = performance.now();
const smokeStartWallClock = Date.now();

function emitSmokeTelemetry(event, data = {}) {
  if (!SMOKE_TEST_MODE) return;
  const payload = {
    event,
    ts: Date.now(),
    elapsedMs: Math.round(performance.now() - smokeStart),
    ...data,
  };
  console.log(`SMOKE_TEST:EVENT:${JSON.stringify(payload)}`);
}

function getAutoUpdater() {
  if (!autoUpdaterPromise) {
    autoUpdaterPromise = import('electron-updater')
      .then((mod) => mod.autoUpdater)
      .catch((error) => {
        console.warn('electron-updater unavailable:', error?.message ?? error);
        return null;
      });
  }
  return autoUpdaterPromise;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveIconPath() {
  const candidates = [
    path.join(__dirname, 'resources', 'icon.png'),
    path.join(__dirname, 'resources', 'icon-512.png'),
    path.join(__dirname, 'resources', 'icon-256.png'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const projectRoot = path.join(__dirname, '..');
  const legacyAsset = path.join(projectRoot, 'assets', 'images', 'icon.png');
  if (existsSync(legacyAsset)) {
    return legacyAsset;
  }

  return undefined;
}

let mainWindow;

async function setupAutoUpdater() {
  const updater = await getAutoUpdater();
  if (!updater) {
    return;
  }

  if (!autoUpdaterRegistered) {
    updater.on('update-downloaded', () => {
      if (mainWindow) {
        mainWindow.webContents.send('update-downloaded');
      }
    });
    autoUpdaterRegistered = true;
  }

  if (app.isPackaged) {
    try {
      await updater.checkForUpdatesAndNotify();
    } catch (error) {
      console.warn('Auto-update check failed:', error);
    }
  } else {
    console.log('Skipping autoUpdater in dev mode');
  }
}

function resolveEntryPath() {
  const projectRoot = path.join(__dirname, '..');
  const distIndex = path.join(projectRoot, 'dist', 'index.html');
  if (existsSync(distIndex)) {
    return distIndex;
  }
  return path.join(projectRoot, 'index.html');
}

function createWindow() {
  const windowOptions = {
    width: 800,
    height: 900,
    minWidth: 640,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };

  const iconPath = resolveIconPath();
  if (iconPath) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);
  emitSmokeTelemetry('window-created', {
    id: mainWindow.id,
    bounds: mainWindow.getBounds(),
  });

  const entryPath = resolveEntryPath();
  mainWindow.loadFile(entryPath).catch((error) => {
    console.error('Failed to load entry HTML:', error);
    emitSmokeTelemetry('load-error', { message: error?.message ?? String(error) });
  });

  mainWindow.webContents.once('did-finish-load', () => {
    emitSmokeTelemetry('renderer-ready', {
      entry: entryPath,
      wallClockMs: Date.now() - smokeStartWallClock,
    });
    if (process.env.ELECTRON_SMOKE_TEST === '1') {
      console.log('SMOKE_TEST:READY');
      setTimeout(() => {
        app.exit(0);
      }, 250);
    }
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone', details);
    emitSmokeTelemetry('renderer-gone', details ?? {});
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Renderer became unresponsive');
    emitSmokeTelemetry('renderer-unresponsive');
  });

  mainWindow.on('closed', () => {
    emitSmokeTelemetry('window-closed');
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  emitSmokeTelemetry('app-ready', { version: app.getVersion?.() ?? app.name });
  createWindow();
  setupAutoUpdater().catch((error) => {
    console.warn('Failed to set up auto-updater:', error);
    emitSmokeTelemetry('auto-updater-error', { message: error?.message ?? String(error) });
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('child-process-gone', (_event, details) => {
  emitSmokeTelemetry('child-process-gone', details ?? {});
});

process.on('uncaughtException', (error) => {
  emitSmokeTelemetry('uncaught-exception', { message: error?.message ?? String(error) });
  console.error('Uncaught exception in main process', error);
});
