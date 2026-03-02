import { contextBridge, ipcRenderer } from 'electron'

// Expose safe, typed APIs to the renderer process
contextBridge.exposeInMainWorld('vela', {
  platform: process.platform,
  version: process.env.npm_package_version ?? '0.0.0',
  onUpdate: (callback: (info: unknown) => void) =>
    ipcRenderer.on('update-available', (_event, info: unknown) => callback(info)),
})
