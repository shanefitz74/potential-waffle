import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onReset(callback) {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('reset', () => callback());
  },
  onUpdateReady(callback) {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('update-downloaded', () => callback());
  },
});
