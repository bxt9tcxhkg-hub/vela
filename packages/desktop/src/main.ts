import { app, BrowserWindow } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#faf7f2',
  })

  if (isDev) {
    void win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    void win.loadFile(join(__dirname, '../ui/dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
