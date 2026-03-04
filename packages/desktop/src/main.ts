import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import { existsSync } from 'fs'

const isDev = process.env.NODE_ENV === 'development'

let serverProcess: ChildProcess | null = null
let mainWindow:    BrowserWindow | null = null

// ─── Vela Server starten ──────────────────────────────────────────────────────
function startServer(): void {
  // Im Dev-Modus läuft der Server separat
  if (isDev) return

  const serverPath = join(__dirname, '../../server/dist/index.js')
  if (!existsSync(serverPath)) {
    console.warn('[Desktop] Server nicht gefunden:', serverPath)
    return
  }

  serverProcess = spawn(process.execPath, [serverPath], {
    env:   { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    stdio: 'pipe',
  })

  serverProcess.stdout?.on('data', (d: Buffer) => {
    console.log('[Server]', d.toString().trim())
  })
  serverProcess.stderr?.on('data', (d: Buffer) => {
    console.error('[Server]', d.toString().trim())
  })
  serverProcess.on('exit', (code) => {
    console.warn('[Desktop] Server beendet mit Code', code)
    serverProcess = null
  })
}

// ─── Fenster erstellen ────────────────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  900,
    minHeight: 600,
    webPreferences: {
      preload:          join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
    titleBarStyle:  'hiddenInset',
    backgroundColor: '#030712',  // gray-950
    show: false,
  })

  // Fenster erst zeigen wenn bereit (verhindert weißen Flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    void mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    void mainWindow.loadFile(join(__dirname, '../ui/dist/index.html'))
  }

  // Externe Links im Browser öffnen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ─── IPC Handler ──────────────────────────────────────────────────────────────

// Server-Status
ipcMain.handle('vela:server-status', async () => {
  try {
    const res = await fetch('http://localhost:3000/api/health', {
      signal: AbortSignal.timeout(3000),
    })
    const data = await res.json()
    return { running: res.ok, ...data }
  } catch {
    return { running: false }
  }
})

// Ollama-Status
ipcMain.handle('vela:ollama-status', async () => {
  try {
    const res  = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(3000),
    })
    const data = await res.json() as { models: Array<{ name: string }> }
    return { available: true, models: data.models.map(m => m.name) }
  } catch {
    return { available: false, models: [] }
  }
})

// App-Version
ipcMain.handle('vela:version', () => app.getVersion())

// Externer Link öffnen
ipcMain.handle('vela:open-external', (_event, url: string) => {
  void shell.openExternal(url)
})

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startServer()

  // Kurz warten bis Server bereit
  setTimeout(createWindow, isDev ? 0 : 1500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  serverProcess?.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  serverProcess?.kill()
})
