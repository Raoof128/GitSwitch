import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'

export function initAutoUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update:available', { version: info.version })
  })

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('update:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error.message)
  })

  void autoUpdater.checkForUpdates().catch(() => {})

  setInterval(
    () => {
      void autoUpdater.checkForUpdates().catch(() => {})
    },
    4 * 60 * 60 * 1000
  )
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}
