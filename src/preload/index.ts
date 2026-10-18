import { contextBridge, ipcRenderer } from 'electron'
import type { CvGenApi } from '../shared/types'

const call =
  <A extends unknown[], R>(channel: string) =>
  (...args: A): Promise<R> =>
    ipcRenderer.invoke(channel, ...args).catch((e: Error) => {
      // Electron préfixe les erreurs IPC : on ne garde que le message utile.
      throw new Error(e.message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, ''))
    })

const api: CvGenApi = {
  quiet: process.env.CVGEN_QUIET === '1',
  loadData: call('data:load'),
  saveData: call('data:save'),
  saveDataSync: (d) => ipcRenderer.sendSync('data:saveSync', d),
  logError: (msg) => ipcRenderer.send('log:error', msg),
  listBackups: call('backups:list'),
  readBackup: call('backups:read'),
  stock: { search: call('stock:search'), get: call('stock:get') },
  extractPdf: call('pdf:extract'),
  extractDocx: call('docx:extract'),
  getSettings: call('settings:get'),
  setSettings: call('settings:set'),
  setApiKey: call('settings:apiKey'),
  testApiKey: call('settings:testKey'),
  listFreeModels: call('settings:freeModels'),
  setTitleBarTheme: (dark) => ipcRenderer.send('titlebar:theme', dark),
  exportResume: call('export:resume'),
  exportLetter: call('export:letter'),
  getPrintJob: call('print:job'),
  printReady: (token) => ipcRenderer.send('print:ready', token),
  openDataFolder: call('shell:dataFolder'),
  openExternal: call('shell:external'),
  local: {
    list: call('local:list'),
    download: call('local:download'),
    cancel: call('local:cancel'),
    remove: call('local:remove'),
    onState: (cb) => {
      const h = (_e: unknown, s: Parameters<typeof cb>[0]) => cb(s)
      ipcRenderer.on('local:state', h)
      return () => ipcRenderer.removeListener('local:state', h)
    }
  },
  cv: { pick: call('cv:pick'), import: call('cv:import') },
  updates: {
    status: call('update:status'),
    check: call('update:check'),
    install: call('update:install'),
    onStatus: (cb) => {
      const h = (_e: unknown, s: Parameters<typeof cb>[0]) => cb(s)
      ipcRenderer.on('update:status', h)
      return () => ipcRenderer.removeListener('update:status', h)
    }
  },
  ai: {
    analyzeOffer: call('ai:analyzeOffer'),
    tailor: call('ai:tailor'),
    improveBullet: call('ai:improveBullet'),
    writeSummary: call('ai:writeSummary'),
    coverLetter: call('ai:coverLetter'),
    reviseLetter: call('ai:reviseLetter'),
    analyzeCvImage: call('ai:analyzeCvImage'),
    chat: call('ai:chat'),
    onPartial: (cb) => {
      const h = (_e: unknown, t: string) => cb(t)
      ipcRenderer.on('ai:partial', h)
      return () => ipcRenderer.removeListener('ai:partial', h)
    }
  }
}

contextBridge.exposeInMainWorld('cvgen', api)
