// Mises à jour automatiques depuis les releases GitHub (lburdier/cv-gen).
// Version installée : la nouvelle version se télécharge en arrière-plan et s'installe au prochain
// redémarrage (ou tout de suite si l'utilisateur le demande). Version portable : l'app signale
// seulement la nouvelle version et ouvre la page de téléchargement.
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '../shared/types'
import { logError } from './storage'

const { autoUpdater } = electronUpdater
const RELEASES = 'https://github.com/lburdier/cv-gen/releases/latest'
const EVERY = 6 * 60 * 60 * 1000

const portable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR)
// Hors version installée (développement, tests) le module reste inactif, sauf CVGEN_FORCE_UPDATER.
const forced = process.env.CVGEN_FORCE_UPDATER === '1'
const enabled = (app.isPackaged || forced) && process.env.CVGEN_QUIET !== '1'

let status: UpdateStatus = { state: enabled ? 'idle' : 'disabled', current: app.getVersion(), portable }

function set(next: Partial<UpdateStatus>): void {
  status = { ...status, ...next }
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('update:status', status)
}

/** Message lisible pour les erreurs réseau les plus courantes. */
function humanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ERR_INTERNET|net::|getaddrinfo/i.test(msg)) return 'Pas de connexion à Internet.'
  if (/404|latest\.yml/i.test(msg)) return 'Aucune version publiée pour l’instant.'
  if (/rate limit|403/i.test(msg)) return 'GitHub limite les vérifications : réessayez dans une heure.'
  return 'La vérification a échoué. Réessayez plus tard.'
}

async function check(): Promise<UpdateStatus> {
  if (!enabled) return status
  if (status.state === 'checking' || status.state === 'downloading' || status.state === 'downloaded') return status
  try {
    await autoUpdater.checkForUpdates()
  } catch (e) {
    logError('update', e instanceof Error ? (e.stack ?? e.message) : String(e))
    set({ state: 'error', error: humanError(e) })
  }
  return status
}

export function initUpdater(): void {
  ipcMain.handle('update:status', () => status)
  ipcMain.handle('update:check', () => check())
  ipcMain.handle('update:install', () => {
    if (portable || status.state !== 'downloaded') {
      void shell.openExternal(RELEASES)
      return false
    }
    // Installation silencieuse puis relance de l'app.
    setImmediate(() => autoUpdater.quitAndInstall(true, true))
    return true
  })
  if (!enabled) return

  autoUpdater.autoDownload = !portable
  autoUpdater.autoInstallOnAppQuit = !portable
  autoUpdater.allowPrerelease = false
  autoUpdater.logger = { info: () => {}, debug: () => {}, warn: (m) => logError('update', String(m)), error: (m) => logError('update', String(m)) }
  if (forced) {
    autoUpdater.forceDevUpdateConfig = true
    autoUpdater.setFeedURL({ provider: 'github', owner: 'lburdier', repo: 'cv-gen' })
  }

  autoUpdater.on('checking-for-update', () => set({ state: 'checking', error: undefined, checkedAt: Date.now() }))
  autoUpdater.on('update-not-available', () => set({ state: 'none', checkedAt: Date.now() }))
  autoUpdater.on('update-available', (info) => set({ state: portable ? 'available' : 'downloading', version: info.version, percent: 0, notes: notesOf(info.releaseNotes) }))
  autoUpdater.on('download-progress', (p) => set({ state: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', (info) => set({ state: 'downloaded', version: info.version, percent: 100 }))
  autoUpdater.on('error', (e) => {
    logError('update', e?.stack ?? String(e))
    set({ state: 'error', error: humanError(e) })
  })

  // Première vérification peu après le démarrage, puis toutes les 6 heures.
  setTimeout(() => void check(), 8000)
  setInterval(() => void check(), EVERY)
}

function notesOf(n: unknown): string | undefined {
  if (typeof n === 'string') return n.replace(/<[^>]+>/g, '').trim().slice(0, 600) || undefined
  if (Array.isArray(n)) return notesOf(n.map((x) => (x as { note?: string }).note ?? '').join('\n'))
  return undefined
}
