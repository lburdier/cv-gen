import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import { basename, join } from 'path'
import type { FollowUpRequest, KeyProvider, AppData, DesignSpec, ChatTurn, CoverLetter, ExportFormat, Lang, LetterOptions, Offer, Resume, Settings } from '../shared/types'
import * as ai from './ai'
import { exportLetter, exportResume, getPrintJob, markReady } from './export'
import { listFreeModels } from './openrouter'
import { extractPdf } from './pdfText'
import { getStockImage, searchStock } from './stock'
import { importCv } from './importCv'
import { cancelDownload, downloadModel, localState, removeModel } from './localLlm'
import { cancelLogin, login, loginState, logout } from './anthropicLogin'
import { initUpdater } from './updater'
import { bridgeStatus, extensionDir, startBridge, stopBridge, takePending } from './bridge'
import { readFileSync, statSync } from 'fs'
import { dataDir, getSettings, listBackups, loadData, logError, readBackup, saveData, setApiKey, setSettings } from './storage'

const LIGHT_BG = '#FFFFFF'
const DARK_BG = '#050505'

let main: BrowserWindow | null = null

/** Charge l'interface (serveur Vite en dev, fichiers construits en prod) sur une route donnée. */
async function loadRoute(win: BrowserWindow, route = '/') {
  const devUrl = process.env.ELECTRON_RENDERER_URL
  if (devUrl) await win.loadURL(`${devUrl}#${route}`)
  else await win.loadFile(join(__dirname, '../renderer/index.html'), { hash: route })
}

function overlay(dark: boolean) {
  return { color: dark ? DARK_BG : LIGHT_BG, symbolColor: dark ? '#F4F4F2' : '#0B0B0C', height: 60 }
}

// Tests automatisés : rendu hors écran, aucune fenêtre ne s'affiche ni ne prend le focus.
const HEADLESS = process.env.CVGEN_HEADLESS === '1' || process.env.CVGEN_QUIET === '1'

function createWindow() {
  const theme = getSettings().theme
  const dark = theme === 'dark' || (theme === 'system' && nativeTheme.shouldUseDarkColors)
  main = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    show: false,
    title: 'CV GEN',
    backgroundColor: dark ? DARK_BG : LIGHT_BG,
    titleBarStyle: 'hidden',
    titleBarOverlay: overlay(dark),
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      spellcheck: true,
      ...(HEADLESS ? { offscreen: true, backgroundThrottling: false } : {})
    }
  })
  const win = main
  if (HEADLESS) {
    win.setSkipTaskbar(true)
    win.show = win.showInactive = win.focus = () => {}
    // Sans fenêtre au premier plan, Chromium ne déclenche pas focus/blur : on émule une page active.
    win.webContents.on('did-finish-load', () => {
      const dbg = win.webContents.debugger
      try {
        if (!dbg.isAttached()) dbg.attach('1.3')
        void dbg.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {})
      } catch {
        /* débogueur indisponible : sans conséquence hors tests */
      }
    })
  }
  win.on('closed', () => {
    if (main === win) main = null
  })
  win.once('ready-to-show', () => win.show())
  // Filet de sécurité : la fenêtre s'affiche même si « ready-to-show » n'arrive pas.
  setTimeout(() => !win.isDestroyed() && !win.isVisible() && win.show(), 4000)

  // Le rendu a planté ou le chargement a échoué : on recharge au lieu de laisser une page blanche.
  let retries = 0
  win.webContents.on('render-process-gone', (_e, d) => {
    logError('main', `Processus de rendu arrêté : ${d.reason} (code ${d.exitCode})`)
    if (d.reason !== 'clean-exit' && retries++ < 3) setTimeout(() => !win.isDestroyed() && loadRoute(win), 500)
  })
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return // -3 : navigation annulée, sans gravité
    logError('main', `Échec de chargement (${code} ${desc}) : ${url}`)
    if (retries++ < 3) setTimeout(() => !win.isDestroyed() && loadRoute(win), 800)
  })
  // La fenêtre ne quitte jamais l'app (ex. fichier déposé, lien cliqué) : l'app ne navigue que par
  // loadURL/loadFile, qui ne déclenchent pas « will-navigate ». Les liens web s'ouvrent dans le navigateur.
  win.webContents.on('will-navigate', (e, url) => {
    e.preventDefault()
    const dev = process.env.ELECTRON_RENDERER_URL
    if (/^https?:\/\//.test(url) && !(dev && url.startsWith(dev))) shell.openExternal(url)
  })
  win.webContents.on('unresponsive', () => logError('main', 'La fenêtre ne répond plus'))
  main.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  main.webContents.session.setSpellCheckerLanguages(['fr', 'en-US'])
  loadRoute(main)
}

function handle<A extends unknown[], R>(channel: string, fn: (...args: A) => R | Promise<R>) {
  ipcMain.handle(channel, (_e, ...args) => fn(...(args as A)))
}

function registerIpc() {
  handle('data:load', () => loadData())
  handle('data:save', (d: AppData) => saveData(d))
  // Sauvegarde synchrone à la fermeture de la fenêtre (aucune modification perdue).
  ipcMain.on('data:saveSync', (e, d: AppData) => {
    try {
      saveData(d)
      e.returnValue = true
    } catch (err) {
      logError('main', 'Sauvegarde à la fermeture : ' + (err as Error).message)
      e.returnValue = false
    }
  })
  ipcMain.on('log:error', (_e, msg: string) => logError('interface', String(msg)))
  // Rechargement demandé par l'interface (location.reload() est bloqué par le filtre de navigation).
  ipcMain.on('app:reload', (e) => e.sender.reloadIgnoringCache())
  handle('backups:list', () => listBackups())
  handle('backups:read', (name: string) => readBackup(name))
  handle('settings:get', () => getSettings())
  handle('settings:set', (patch: Partial<Settings>) => setSettings(patch))
  handle('settings:apiKey', (key: string, provider?: KeyProvider) => setApiKey(key, provider))
  handle('login:state', () => loginState())
  handle('login:start', () => login())
  handle('login:cancel', () => cancelLogin())
  handle('login:logout', () => logout())
  handle('local:list', () => localState())
  handle('local:download', (id: string) => downloadModel(id))
  handle('local:cancel', (id: string) => cancelDownload(id))
  handle('local:remove', (id: string) => removeModel(id))
  handle('settings:freeModels', () => listFreeModels())
  handle('settings:testKey', () => ai.testKey())
  ipcMain.on('titlebar:theme', (_e, dark: boolean) => main?.setTitleBarOverlay(overlay(dark)))

  handle('export:resume', (r: Resume, f: ExportFormat) => exportResume(main!, r, f, loadRoute))
  handle('export:letter', (l: CoverLetter, r: Resume | undefined, f: 'docx' | 'txt' | 'pdf') => exportLetter(main!, l, r, f, loadRoute))
  handle('print:job', (token: string) => getPrintJob(token))
  ipcMain.on('print:ready', (_e, token: string) => markReady(token))

  handle('shell:dataFolder', async () => {
    await shell.openPath(dataDir())
  })
  handle('shell:external', async (url: string) => {
    if (/^(https?:\/\/|mailto:)/.test(url)) await shell.openExternal(url)
  })

  // IA : les erreurs sont renvoyées avec un message lisible (préfixe retiré côté interface).
  handle('ai:analyzeOffer', (t: string) => ai.analyzeOffer(t))
  handle('ai:tailor', (r: Resume, o: Offer) => ai.tailor(r, o))
  handle('ai:improveBullet', (b: string, c: string, l: Lang) => ai.improveBullet(b, c, l))
  handle('ai:writeSummary', (r: Resume, o?: Offer) => ai.writeSummary(r, o))
  handle('ai:coverLetter', (r: Resume, o: Offer | undefined, opts: LetterOptions) => ai.coverLetter(r, o, opts))
  handle('ai:reviseLetter', (body: string, instruction: string, r: Resume, o?: Offer, l?: Lang) => ai.reviseLetter(body, instruction, r, o, l))
  handle('ai:followUp', (req: FollowUpRequest, r?: Resume) => ai.followUp(req, r))
  handle('ai:chat', (h: ChatTurn[], r?: Resume, o?: Offer) => ai.chat(h, r, o))
  handle('ai:analyzeCvImage', (dataUrl: string, withContent: boolean, hint?: DesignSpec) => ai.analyzeCvImage(dataUrl, withContent, hint))
  handle('stock:search', (q: string, page?: number, orientation?: 'wide' | 'any') => searchStock(q, page, orientation))
  handle('stock:get', (url: string, fallback?: string) => getStockImage(url, fallback))
  handle('pdf:extract', (bytes: Uint8Array) => extractPdf(Buffer.from(bytes)))
  handle('docx:extract', async (bytes: Uint8Array) => {
    const mammoth = await import('mammoth')
    return (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value
  })
  // Import d'un CV : choix du fichier, puis lecture locale (et IA si une clé est enregistrée).
  handle('cv:pick', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(main!, {
      title: 'Importer un CV existant',
      properties: ['openFile'],
      filters: [{ name: 'CV (PDF, Word, texte)', extensions: ['pdf', 'docx', 'txt', 'md'] }]
    })
    if (canceled || !filePaths[0]) return null
    const file = filePaths[0]
    if (statSync(file).size > 25 * 1024 * 1024) throw new Error('Fichier trop lourd (25 Mo maximum).')
    return { name: basename(file), bytes: new Uint8Array(readFileSync(file)) }
  })
  handle('bridge:status', () => bridgeStatus())
  handle('bridge:pending', () => takePending())
  handle('bridge:folder', async () => {
    await shell.openPath(extensionDir())
  })
  handle('cv:import', (name: string, bytes: Uint8Array, mode?: 'auto' | 'local') => importCv(name, bytes, mode))
}

app.setAppUserModelId('app.cvgen.desktop')

// Une seule instance : deux fenêtres écriraient le même fichier de données en même temps.
// Code de sortie 3 : l'app était déjà ouverte (lancer.bat l'affiche dans la console).
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.exit(3)
app.on('second-instance', () => {
  // Fenêtre fermée ou jamais créée : on en ouvre une au lieu de ne rien faire.
  if (!main || main.isDestroyed()) {
    if (app.isReady()) createWindow()
    return
  }
  if (main.isMinimized()) main.restore()
  main.show()
  // Windows bloque souvent la prise de focus : on passe la fenêtre au premier plan un instant.
  main.setAlwaysOnTop(true)
  main.focus()
  main.setAlwaysOnTop(false)
  main.flashFrame(true)
  setTimeout(() => main && !main.isDestroyed() && main.flashFrame(false), 1500)
})
process.on('uncaughtException', (e) => logError('main', e.stack ?? e.message))
process.on('unhandledRejection', (e) => logError('main', String((e as Error)?.stack ?? e)))

app.whenReady().then(() => {
  if (!gotLock) return
  registerIpc()
  initUpdater()
  createWindow()
  void startBridge(() => main)
  // Lien cvgen:// : l'extension peut ouvrir l'app quand elle est fermée (version installée seulement).
  if (app.isPackaged && !HEADLESS) app.setAsDefaultProtocolClient('cvgen')
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
app.on('will-quit', () => stopBridge())
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
