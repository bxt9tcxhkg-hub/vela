import { contextBridge, ipcRenderer } from 'electron'

// Typisierte, sichere Bridge zwischen Renderer (React) und Main Process
contextBridge.exposeInMainWorld('vela', {
  platform: process.platform,
  version:  process.env.npm_package_version ?? '0.0.0',

  // Server- & Ollama-Status (ohne direkte Node-APIs im Renderer)
  getServerStatus: () => ipcRenderer.invoke('vela:server-status'),
  getOllamaStatus: () => ipcRenderer.invoke('vela:ollama-status'),
  getVersion:      () => ipcRenderer.invoke('vela:version'),
  openExternal:    (url: string) => ipcRenderer.invoke('vela:open-external', url),

  // Update-Events
  onUpdate: (callback: (info: unknown) => void) =>
    ipcRenderer.on('update-available', (_event, info: unknown) => callback(info)),
})
