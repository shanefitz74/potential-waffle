import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { autoUpdater } from 'electron-updater';

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

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

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
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.warn('Auto-update check failed:', error);
    });
  }
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
