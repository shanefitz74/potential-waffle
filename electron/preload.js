import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder for future, intentionally empty for now.
});
