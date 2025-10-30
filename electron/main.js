import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
let autoUpdaterPromise;
let autoUpdaterRegistered = false;

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

  const entryPath = resolveEntryPath();
  mainWindow.loadFile(entryPath).catch((error) => {
    console.error('Failed to load entry HTML:', error);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater().catch((error) => {
    console.warn('Failed to set up auto-updater:', error);
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
