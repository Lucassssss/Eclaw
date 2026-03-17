import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isPackaged: process.env.NODE_ENV === 'production',
  onNavigate: (callback: (url: string) => void) => {
    ipcRenderer.on('navigate', (_event, url) => callback(url));
  },
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
});
