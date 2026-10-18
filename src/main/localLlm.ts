// IA locale : un petit modèle (GGUF) exécuté sur l'ordinateur avec llama.cpp (node-llama-cpp).
// Gratuit, hors ligne, sans quota ni clé. Le fichier du modèle n'est pas livré avec l'app : il est
// téléchargé une fois, à la demande, dans le dossier de données (userData/models).
import { app, BrowserWindow } from 'electron'
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'fs'
import { join } from 'path'
import type { LocalModel, LocalModelState } from '../shared/types'
import { logError } from './storage'

export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'qwen3-0.6b',
    name: 'Qwen3 0.6B',
    label: 'Mini',
    desc: 'Rapide sur n’importe quel ordinateur. Répond aux questions simples sur votre CV et votre candidature.',
    file: 'Qwen3-0.6B-Q4_K_M.gguf',
    url: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf',
    size: 396705472
  },
  {
    id: 'qwen2.5-1.5b',
    name: 'Qwen2.5 1.5B',
    label: 'Plus précis',
    desc: 'Réponses plus solides et meilleure rédaction, mais plus lent. 8 Go de mémoire conseillés.',
    file: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    size: 1117320736
  }
]

export class LocalLlmError extends Error {}

const dir = () => join(app.getPath('userData'), 'models')
const pathOf = (m: LocalModel) => join(dir(), m.file)
export const modelById = (id?: string) => LOCAL_MODELS.find((m) => m.id === id)

export function isInstalled(id?: string): boolean {
  const m = modelById(id)
  if (!m) return false
  try {
    return statSync(pathOf(m)).size === m.size
  } catch {
    return false
  }
}

/** Premier modèle installé (pour le repli automatique quand le fournisseur en ligne échoue). */
export function anyInstalled(preferred?: string): LocalModel | undefined {
  return [modelById(preferred), ...LOCAL_MODELS].find((m) => m && isInstalled(m.id))
}

// ---------- Téléchargement ----------

const downloads = new Map<string, { ctrl: AbortController; received: number }>()

function broadcast() {
  const s = localState()
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('local:state', s)
}

export function localState(): LocalModelState[] {
  return LOCAL_MODELS.map((m) => {
    const d = downloads.get(m.id)
    return { ...m, installed: isInstalled(m.id), downloading: !!d, percent: d ? Math.floor((d.received / m.size) * 100) : undefined }
  })
}

/** Télécharge le modèle (reprise possible d'un téléchargement interrompu). */
export async function downloadModel(id: string): Promise<LocalModelState[]> {
  const m = modelById(id)
  if (!m) throw new LocalLlmError('Modèle inconnu.')
  if (isInstalled(id) || downloads.has(id)) return localState()
  mkdirSync(dir(), { recursive: true })
  const part = pathOf(m) + '.part'
  const already = existsSync(part) ? statSync(part).size : 0
  const ctrl = new AbortController()
  const state = { ctrl, received: already }
  downloads.set(id, state)
  broadcast()
  let last = 0
  try {
    const res = await fetch(m.url, { headers: already ? { Range: `bytes=${already}-` } : {}, redirect: 'follow', signal: ctrl.signal })
    if (!res.ok || !res.body) throw new LocalLlmError(`Téléchargement impossible (${res.status}). Réessayez plus tard.`)
    // Le serveur a ignoré la reprise : on repart de zéro.
    const append = already > 0 && res.status === 206
    if (!append) state.received = 0
    const out = createWriteStream(part, { flags: append ? 'a' : 'w' })
    const reader = res.body.getReader()
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r))
        state.received += value.byteLength
        if (Date.now() - last > 400) {
          last = Date.now()
          broadcast()
        }
      }
    } finally {
      await new Promise<void>((r) => out.end(() => r()))
    }
    if (statSync(part).size !== m.size) throw new LocalLlmError('Le fichier téléchargé est incomplet. Relancez le téléchargement.')
    renameSync(part, pathOf(m))
  } catch (e) {
    if ((e as Error).name === 'AbortError') return localState()
    logError('local', (e as Error).stack ?? String(e))
    throw e instanceof LocalLlmError ? e : new LocalLlmError('Le téléchargement a échoué. Vérifiez votre connexion, puis relancez-le : il reprendra où il s’est arrêté.')
  } finally {
    downloads.delete(id)
    broadcast()
  }
  return localState()
}

export function cancelDownload(id: string): LocalModelState[] {
  downloads.get(id)?.ctrl.abort()
  return localState()
}

export async function removeModel(id: string): Promise<LocalModelState[]> {
  const m = modelById(id)
  if (!m) return localState()
  if (loaded?.id === id) await unload()
  rmSync(pathOf(m), { force: true })
  rmSync(pathOf(m) + '.part', { force: true })
  broadcast()
  return localState()
}

// ---------- Génération ----------

type Llama = import('node-llama-cpp').Llama
type LlamaModel = import('node-llama-cpp').LlamaModel
type LlamaContext = import('node-llama-cpp').LlamaContext

let llamaP: Promise<Llama> | null = null
let loaded: { id: string; model: LlamaModel; context: LlamaContext } | null = null
let queue: Promise<unknown> = Promise.resolve()

async function lib() {
  return import('node-llama-cpp')
}

async function getLlama(): Promise<Llama> {
  // Processeur uniquement (binaire CPU livré avec l'app) ; jamais de compilation à la volée.
  llamaP ??= lib().then((l) => l.getLlama({ gpu: false, build: 'never', progressLogs: false, logLevel: l.LlamaLogLevel.error }))
  return llamaP
}

async function unload() {
  const l = loaded
  loaded = null
  await l?.context.dispose().catch(() => {})
  await l?.model.dispose().catch(() => {})
}

async function ensure(id: string) {
  if (loaded?.id === id) return loaded
  const m = modelById(id)
  if (!m || !isInstalled(id)) throw new LocalLlmError('Le modèle local n’est pas installé. Téléchargez-le dans Paramètres › Intelligence artificielle.')
  await unload()
  const llama = await getLlama()
  const model = await llama.loadModel({ modelPath: pathOf(m) })
  const context = await model.createContext({ contextSize: { min: 2048, max: 8192 } })
  loaded = { id, model, context }
  return loaded
}

export interface LocalTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Réponse du modèle local à une conversation. Les requêtes passent une par une (un seul contexte),
 * le texte arrive par morceaux via onChunk.
 */
export function localGenerate(id: string, system: string, turns: LocalTurn[], opts: { maxTokens?: number; onChunk?: (text: string) => void } = {}): Promise<string> {
  const run = async () => {
    const { context } = await ensure(id)
    const { LlamaChatSession } = await lib()
    const sequence = context.getSequence()
    try {
      const session = new LlamaChatSession({ contextSequence: sequence, systemPrompt: system })
      const last = turns[turns.length - 1]
      // Historique (sans le dernier message de l'utilisateur, envoyé comme question).
      session.setChatHistory([
        { type: 'system', text: system },
        ...turns.slice(0, -1).map((t) => (t.role === 'user' ? { type: 'user' as const, text: t.content } : { type: 'model' as const, response: [t.content] }))
      ])
      let text = ''
      const answer = await session.prompt(last?.content ?? '', {
        maxTokens: opts.maxTokens ?? 900,
        temperature: 0.6,
        topP: 0.9,
        // Qwen3 : pas de phase de « réflexion » (trop lente pour un petit modèle sur processeur).
        budgets: { thoughtTokens: 0 },
        onTextChunk: (chunk) => {
          text += chunk
          opts.onChunk?.(text)
        }
      })
      return (answer || text).replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    } finally {
      sequence.dispose()
    }
  }
  const p = queue.then(run, run)
  queue = p.catch(() => undefined)
  return p.catch((e) => {
    if (e instanceof LocalLlmError) throw e
    logError('local', (e as Error).stack ?? String(e))
    throw new LocalLlmError(`Le modèle local n’a pas pu répondre : ${(e as Error).message}`)
  })
}
