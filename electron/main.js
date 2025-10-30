const { app, BrowserWindow } = require('electron');
const { join } = require('node:path');
const { existsSync } = require('node:fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
});

function resolveEntryPath() {
  const projectRoot = join(__dirname, '..');
  const distIndex = join(projectRoot, 'dist', 'index.html');
  if (existsSync(distIndex)) {
    return distIndex;
  }
  return join(projectRoot, 'index.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    minWidth: 640,
    minHeight: 720,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: join(__dirname, 'resources', 'icon-256.png'),
  });

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
