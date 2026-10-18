// Connexion avec un compte développeur Anthropic (Claude Console), sans clé API à copier.
// L'outil officiel « ant » (github.com/anthropics/anthropic-cli) ouvre la page de connexion dans le
// navigateur et enregistre une session OAuth dans un profil dédié « cv-gen ». Le SDK Anthropic lit ce
// profil et renouvelle le jeton tout seul : l'app ne voit jamais le mot de passe ni le jeton.
// Facturation : crédits API de l'organisation Console (pas un abonnement Claude Pro / Max).
import { execFile, spawn } from 'child_process'
import { createHash } from 'crypto'
import { app } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AnthropicLoginState } from '../shared/types'
import { logError } from './storage'

export const PROFILE = 'cv-gen'
const VERSION = '1.42.0'
const ARCH = process.arch === 'arm64' ? 'arm64' : process.arch === 'ia32' ? '386' : 'amd64'
const ZIP = `ant_${VERSION}_windows_${ARCH}.zip`
const BASE = `https://github.com/anthropics/anthropic-cli/releases/download/v${VERSION}`

export class LoginError extends Error {}

const binDir = () => join(app.getPath('userData'), 'bin')
const bundledAnt = () => join(binDir(), 'ant.exe')

/** Dossier de configuration d'Anthropic (même règle que le SDK et l'outil ant). */
function configDir(): string {
  return process.env.ANTHROPIC_CONFIG_DIR || join(process.env.APPDATA || join(app.getPath('home'), 'AppData', 'Roaming'), 'Anthropic')
}

const credentialsFile = () => join(configDir(), 'credentials', `${PROFILE}.json`)

/** Session enregistrée pour le profil de l'app. */
export function isLoggedIn(): boolean {
  try {
    return statSync(credentialsFile()).size > 10
  } catch {
    return false
  }
}

/** ant livré par l'app, sinon celui du système s'il est installé. */
function antPath(): string | null {
  if (existsSync(bundledAnt())) return bundledAnt()
  for (const dir of (process.env.PATH ?? '').split(';')) {
    const p = join(dir, 'ant.exe')
    if (dir && existsSync(p)) return p
  }
  return null
}

function run(args: string[], timeoutMs = 20_000): Promise<{ code: number; out: string }> {
  const ant = antPath()
  if (!ant) return Promise.reject(new LoginError('L’outil de connexion Anthropic n’est pas installé.'))
  return new Promise((resolve) => {
    execFile(ant, ['--profile', PROFILE, ...args], { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ code: err ? 1 : 0, out: `${stdout}\n${stderr}`.trim() })
    })
  })
}

let busy: 'installing' | 'waiting' | null = null

export async function loginState(): Promise<AnthropicLoginState> {
  const state: AnthropicLoginState = { installed: !!antPath(), loggedIn: isLoggedIn(), busy, details: [] }
  if (state.loggedIn && state.installed) {
    // Organisation et espace de travail, pour savoir quel compte est facturé.
    const { out } = await run(['auth', 'status']).catch(() => ({ out: '' }))
    state.details = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /organi[sz]ation|workspace|email|account|expires/i.test(l) && !/config|credentials:/i.test(l))
      .slice(0, 4)
  }
  return state
}

/** Télécharge l'outil officiel et vérifie son empreinte SHA-256 publiée avec la version. */
async function installAnt(): Promise<void> {
  busy = 'installing'
  try {
    const sums = await fetch(`${BASE}/ant_${VERSION}_checksums.txt`, { redirect: 'follow' }).then((r) => {
      if (!r.ok) throw new LoginError(`Téléchargement impossible (${r.status}).`)
      return r.text()
    })
    const expected = sums
      .split(/\r?\n/)
      .find((l) => l.trim().endsWith(ZIP))
      ?.split(/\s+/)[0]
    if (!expected) throw new LoginError('Empreinte de l’outil introuvable : téléchargement annulé.')
    const res = await fetch(`${BASE}/${ZIP}`, { redirect: 'follow' })
    if (!res.ok) throw new LoginError(`Téléchargement impossible (${res.status}).`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (createHash('sha256').update(buf).digest('hex') !== expected.toLowerCase()) throw new LoginError('Le fichier téléchargé ne correspond pas à l’empreinte officielle : il a été supprimé.')
    const tmp = join(app.getPath('temp'), `cvgen-ant-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
    const zipPath = join(tmp, ZIP)
    writeFileSync(zipPath, buf)
    // tar de Windows (10 et plus) sait lire les archives zip.
    const tar = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    await new Promise<void>((resolve, reject) =>
      execFile(tar, ['-xf', zipPath, '-C', tmp], { windowsHide: true }, (err) => (err ? reject(new LoginError('Extraction de l’outil impossible.')) : resolve()))
    )
    const exe = readdirSync(tmp).find((f) => f.toLowerCase() === 'ant.exe')
    if (!exe) throw new LoginError('Archive inattendue : ant.exe introuvable.')
    mkdirSync(binDir(), { recursive: true })
    rmSync(bundledAnt(), { force: true })
    try {
      renameSync(join(tmp, exe), bundledAnt())
    } catch {
      copyFileSync(join(tmp, exe), bundledAnt())
    }
    rmSync(tmp, { recursive: true, force: true })
  } catch (e) {
    logError('login', (e as Error).stack ?? String(e))
    throw e instanceof LoginError ? e : new LoginError('Le téléchargement de l’outil de connexion a échoué. Vérifiez votre connexion Internet.')
  } finally {
    busy = null
  }
}

let pending: ReturnType<typeof spawn> | null = null
let cancelled = false

/**
 * Connexion : installe l'outil si besoin, puis ouvre la page de connexion Anthropic dans le navigateur
 * et attend la fin (5 minutes au plus).
 */
export async function login(): Promise<AnthropicLoginState> {
  if (busy) return loginState()
  if (!antPath()) await installAnt()
  const ant = antPath()!
  busy = 'waiting'
  cancelled = false
  try {
    const out = await new Promise<{ code: number | null; text: string }>((resolve) => {
      // Tests automatisés : pas d'ouverture du navigateur.
      const noBrowser = process.env.CVGEN_LOGIN_NO_BROWSER === '1' ? ['--no-browser'] : []
      const child = spawn(ant, ['--profile', PROFILE, 'auth', 'login', '--timeout', '5m', ...noBrowser], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
      pending = child
      let text = ''
      child.stdout?.on('data', (d) => (text += String(d)))
      child.stderr?.on('data', (d) => (text += String(d)))
      child.on('close', (code) => resolve({ code, text }))
      child.on('error', (e) => resolve({ code: 1, text: e.message }))
    })
    pending = null
    if (!isLoggedIn()) {
      if (cancelled || out.code === null) throw new LoginError('Connexion annulée.')
      logError('login', out.text.slice(0, 2000))
      throw new LoginError(/timed out|timeout/i.test(out.text) ? 'La connexion n’a pas été terminée dans le navigateur (5 minutes). Réessayez.' : 'La connexion n’a pas abouti. Réessayez.')
    }
  } finally {
    busy = null
  }
  return loginState()
}

export function cancelLogin(): void {
  cancelled = true
  pending?.kill()
  pending = null
}

export async function logout(): Promise<AnthropicLoginState> {
  if (antPath()) await run(['auth', 'logout']).catch(() => undefined)
  // Sans l'outil (ou s'il a échoué) : on retire la session du profil de l'app.
  rmSync(credentialsFile(), { force: true })
  return loginState()
}
