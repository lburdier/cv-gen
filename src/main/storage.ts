import { app, safeStorage } from 'electron'
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AiProvider, AppData, KeyProvider, ModelId, Settings } from '../shared/types'
import { isInstalled, anyInstalled } from './localLlm'

interface StoredSettings {
  provider: AiProvider
  model: ModelId
  orModel: string
  localModel: string
  theme: Settings['theme']
  userName: string
  apiKeyEnc?: string // clé chiffrée par Windows (DPAPI) via safeStorage
  apiKeyPlain?: string // repli si le chiffrement système est indisponible
  orKeyEnc?: string // clé OpenRouter, même traitement
  orKeyPlain?: string
}

const dir = () => {
  const d = app.getPath('userData')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}
const dataFile = () => join(dir(), 'cvgen-data.json')
const settingsFile = () => join(dir(), 'cvgen-settings.json')

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    return null
  }
}

/** Écriture atomique : on écrit un fichier temporaire puis on le renomme. */
function writeJson(file: string, value: unknown, pretty = true) {
  const tmp = file + '.tmp'
  writeFileSync(tmp, pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value), 'utf8')
  renameSync(tmp, file)
}

const emptyData = (): AppData => ({ version: 1, resumes: [], offers: [], letters: [], activity: [] })
const arr = <T>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

export function loadData(): AppData {
  const file = dataFile()
  if (!existsSync(file)) return emptyData()
  let parsed: AppData | null = null
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8')) as AppData
  } catch (e) {
    // Fichier illisible : on le met de côté au lieu de l'écraser à la prochaine sauvegarde.
    const kept = file.replace(/\.json$/, `.illisible-${Date.now()}.json`)
    renameSync(file, kept)
    logError('main', `Données illisibles, mises de côté dans ${kept} : ${(e as Error).message}`)
    return emptyData()
  }
  backup(file)
  return {
    version: 1,
    resumes: arr(parsed?.resumes),
    offers: arr(parsed?.offers),
    letters: arr(parsed?.letters),
    activity: arr(parsed?.activity),
    ...(parsed?.profile && typeof parsed.profile === 'object' ? { profile: parsed.profile } : {}),
    ...(typeof parsed?.profileMode === 'boolean' ? { profileMode: parsed.profileMode } : {})
  }
}

const MAX_BACKUPS = 15

/**
 * Sauvegardes horodatées au démarrage, dans le dossier « sauvegardes » : une nouvelle copie
 * seulement si les données ont changé, les 15 plus récentes sont conservées.
 * (Une copie unique serait écrasée par un état abîmé au lancement suivant.)
 */
function backup(file: string) {
  try {
    const content = readFileSync(file, 'utf8')
    if (!content.trim()) return
    const bdir = join(dir(), 'sauvegardes')
    if (!existsSync(bdir)) mkdirSync(bdir, { recursive: true })
    const existing = readdirSync(bdir)
      .filter((n) => n.startsWith('cvgen-data-') && n.endsWith('.json'))
      .sort()
    const last = existing[existing.length - 1]
    if (last && readFileSync(join(bdir, last), 'utf8') === content) return
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
    writeFileSync(join(bdir, `cvgen-data-${stamp}.json`), content, 'utf8')
    for (const old of [...existing, `cvgen-data-${stamp}.json`].sort().slice(0, -MAX_BACKUPS)) unlinkSync(join(bdir, old))
  } catch (e) {
    logError('main', 'Sauvegarde horodatée : ' + (e as Error).message)
  }
}

export function backupsDir() {
  return join(dir(), 'sauvegardes')
}

const BACKUP_NAME = /^cvgen-data-\d{8}-\d{6}\.json$/

export function listBackups(): { name: string; at: number; resumes: number; offers: number; letters: number }[] {
  const bdir = backupsDir()
  if (!existsSync(bdir)) return []
  return readdirSync(bdir)
    .filter((n) => BACKUP_NAME.test(n))
    .sort()
    .reverse()
    .map((name) => {
      const m = /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/.exec(name)!
      const at = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime()
      const d = readJson<AppData>(join(bdir, name))
      return { name, at, resumes: arr(d?.resumes).length, offers: arr(d?.offers).length, letters: arr(d?.letters).length }
    })
}

export function readBackup(name: string): AppData | null {
  if (!BACKUP_NAME.test(name)) return null
  const d = readJson<AppData>(join(backupsDir(), name))
  if (!d) return null
  return { version: 1, resumes: arr(d.resumes), offers: arr(d.offers), letters: arr(d.letters), activity: arr(d.activity) }
}

/** Journal d'erreurs dans le dossier de données, pour diagnostiquer les problèmes. */
export function logError(source: string, message: string) {
  try {
    appendFileSync(join(dir(), 'cvgen-erreurs.log'), `[${new Date().toISOString()}] [${source}] ${message.slice(0, 4000)}
`, 'utf8')
  } catch {}
}

export function saveData(data: AppData) {
  // Compact : les images intégrées rendent le fichier volumineux.
  writeJson(dataFile(), data, false)
}

function readSettings(): StoredSettings {
  return {
    provider: 'anthropic',
    model: 'claude-opus-5-5',
    orModel: 'openrouter/free',
    localModel: 'qwen3-0.6b',
    theme: 'light',
    userName: '',
    ...(readJson<StoredSettings>(settingsFile()) ?? {})
  }
}

export function getSettings(): Settings {
  const s = readSettings()
  // Une clé chiffrée illisible (profil Windows changé, fichier copié) compte comme absente.
  const hasClaudeKey = Boolean(getApiKey('anthropic'))
  const hasOpenRouterKey = Boolean(getApiKey('openrouter'))
  return {
    provider: s.provider,
    model: s.model,
    orModel: s.orModel,
    localModel: s.localModel,
    hasLocalModel: !!anyInstalled(s.localModel),
    theme: s.theme,
    userName: s.userName,
    hasClaudeKey,
    hasOpenRouterKey,
    hasApiKey: s.provider === 'local' ? isInstalled(s.localModel) : s.provider === 'openrouter' ? hasOpenRouterKey : hasClaudeKey,
    encryptionAvailable: safeStorage.isEncryptionAvailable()
  }
}

export function setSettings(patch: Partial<Pick<StoredSettings, 'provider' | 'model' | 'orModel' | 'localModel' | 'theme' | 'userName'>>): Settings {
  writeJson(settingsFile(), { ...readSettings(), ...patch })
  return getSettings()
}

const KEY_FIELDS = {
  anthropic: { enc: 'apiKeyEnc', plain: 'apiKeyPlain', env: 'ANTHROPIC_API_KEY' },
  openrouter: { enc: 'orKeyEnc', plain: 'orKeyPlain', env: 'OPENROUTER_API_KEY' }
} as const

/** Enregistre (ou supprime si vide) la clé d'un fournisseur. */
export function setApiKey(key: string, provider: KeyProvider = 'anthropic'): Settings {
  const s = readSettings()
  const f = KEY_FIELDS[provider] ?? KEY_FIELDS.anthropic
  delete s[f.enc]
  delete s[f.plain]
  const k = key.trim()
  if (k) {
    if (safeStorage.isEncryptionAvailable()) s[f.enc] = safeStorage.encryptString(k).toString('base64')
    else s[f.plain] = k
  }
  writeJson(settingsFile(), s)
  return getSettings()
}

export function getApiKey(provider: KeyProvider = 'anthropic'): string | null {
  const s = readSettings()
  const f = KEY_FIELDS[provider]
  const enc = s[f.enc]
  if (enc) {
    try {
      return safeStorage.decryptString(Buffer.from(enc, 'base64'))
    } catch {
      return null
    }
  }
  return s[f.plain] ?? process.env[f.env] ?? null
}

export function dataDir() {
  return dir()
}
