// Auto-Updater – prüft GitHub Releases auf Updates
import { autoUpdater } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

export function setupAutoUpdater(win: BrowserWindow): void {
  if (isDev) {
    console.log('[Updater] Deaktiviert im Dev-Modus')
    return
  }

  autoUpdater.autoDownload    = true
  autoUpdater.autoInstallOnAppQuit = true

  // GitHub Releases als Update-Quelle (aus package.json build.publish)
  autoUpdater.setFeedURL({
    provider: 'github',
    owner:    'bxt9tcxhkg-hub',
    repo:     'vela',
  })

  // ─── Events ──────────────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Prüfe auf Updates...')
    win.webContents.send('update-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update verfügbar:', info.version)
    win.webContents.send('update-status', {
      status:  'available',
      version: info.version,
      notes:   info.releaseNotes,
    })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] Kein Update verfügbar')
    win.webContents.send('update-status', { status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send('update-status', {
      status:   'downloading',
      percent:  Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    })
    win.setProgressBar(progress.percent / 100)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update heruntergeladen:', info.version)
    win.setProgressBar(-1)
    win.webContents.send('update-status', {
      status:  'ready',
      version: info.version,
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Fehler:', err.message)
    win.webContents.send('update-status', { status: 'error', message: err.message })
  })

  // Beim Start nach Update suchen (mit 10s Verzögerung)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.warn('[Updater] Check fehlgeschlagen:', err.message)
    })
  }, 10_000)
}

// IPC: Manuell installieren
export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true)
}
