// Fournisseur OpenRouter : API compatible OpenAI, avec des modèles gratuits (suffixe « :free »).
// Comme pour Claude, la clé reste dans le processus principal.
import type { FreeModel } from '../shared/types'

const BASE = 'https://openrouter.ai/api/v1'

export class OpenRouterError extends Error {
  /** Erreur passagère propre au modèle (quota, panne, délai) : un autre modèle gratuit peut répondre. */
  constructor(message: string, readonly retryable = false) {
    super(message)
  }
}

/** Routeur d'OpenRouter : choisit à chaque requête un modèle gratuit disponible. */
export const FREE_ROUTER = 'openrouter/free'
/** Silence maximal (réponse en flux) avant d'abandonner un modèle gratuit au profit d'un autre. */
const TIMEOUT_MS = 45_000

type Part =
  | { type: 'text'; text: string }
  | { type: 'file'; file: { filename: string; file_data: string } }
  | { type: 'image_url'; image_url: { url: string } }

export interface OrMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Part[]
}

type JsonSchema = {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  [k: string]: unknown
}

function headers(key: string) {
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://cvgen.local',
    'X-Title': 'CV GEN'
  }
}

/** Messages d'erreur compréhensibles à partir des réponses d'OpenRouter. */
function explain(status: number, message: string): string {
  if (status === 401) return 'Clé OpenRouter invalide ou révoquée. Vérifiez-la dans Paramètres.'
  if (status === 402) return 'Crédits OpenRouter insuffisants pour ce modèle. Choisissez un modèle gratuit dans Paramètres.'
  if (status === 429) return 'Limite des modèles gratuits atteinte (requêtes par minute ou par jour). Réessayez dans un instant ou changez de modèle.'
  if (/data policy|privacy/i.test(message))
    return 'Vos réglages de confidentialité OpenRouter bloquent ce modèle gratuit. Autorisez les modèles gratuits sur openrouter.ai/settings/privacy.'
  if (status === 404) return `Modèle indisponible sur OpenRouter : ${message}. Choisissez-en un autre dans Paramètres.`
  if (status >= 500) return `OpenRouter ou le fournisseur du modèle est indisponible (${status}). Réessayez ou changez de modèle.`
  return `Erreur OpenRouter (${status}) : ${message}`
}

type ErrorBody = { error?: { message?: string; code?: number } }

function httpError(status: number, raw: string, statusText: string): OpenRouterError {
  let json: ErrorBody = {}
  try {
    json = JSON.parse(raw)
  } catch {
    /* corps non JSON */
  }
  const code = json.error?.code ?? status
  const message = json.error?.message ?? (raw.slice(0, 200) || statusText)
  // Modèle retiré ou inconnu (« not a valid model ID », « No endpoints found ») : un autre modèle peut répondre.
  return new OpenRouterError(explain(code, message), retryableStatus(code) || /valid model|no endpoints|not found|unavailable/i.test(message))
}

/**
 * Requête en flux (SSE) : le délai ne porte que sur le silence du modèle (rien reçu depuis `idleMs`),
 * pas sur la durée totale. Une longue lettre peut donc s'écrire sans être coupée, tandis qu'un modèle
 * bloqué en file d'attente est abandonné au profit d'un autre.
 */
async function post(key: string, body: Record<string, unknown>, idleMs = TIMEOUT_MS): Promise<{ text: string; finish?: string; model?: string }> {
  const ctrl = new AbortController()
  let idle = setTimeout(() => ctrl.abort(), idleMs)
  const alive = () => {
    clearTimeout(idle)
    idle = setTimeout(() => ctrl.abort(), idleMs)
  }
  const cap = setTimeout(() => ctrl.abort(), 6 * 60_000)
  let text = ''
  let model: string | undefined
  let finish: string | undefined
  try {
    let res: Response
    try {
      res = await fetch(`${BASE}/chat/completions`, { method: 'POST', headers: headers(key), body: JSON.stringify({ ...body, stream: true }), signal: ctrl.signal })
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e
      throw new OpenRouterError('Impossible de joindre OpenRouter. Vérifiez votre connexion Internet.')
    }
    if (!res.ok || !res.body) throw httpError(res.status, await res.text().catch(() => ''), res.statusText)
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        // « : OPENROUTER PROCESSING » : simple signe de vie pendant l'attente, sans contenu.
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') continue
        let chunk: ErrorBody & { model?: string; choices?: { delta?: { content?: string | null; reasoning?: string | null }; finish_reason?: string | null; error?: { message?: string } }[] }
        try {
          chunk = JSON.parse(data)
        } catch {
          continue
        }
        if (chunk.error) throw new OpenRouterError(explain(chunk.error.code ?? 502, chunk.error.message ?? 'réponse en erreur'), true)
        model ??= chunk.model
        // Le routeur gratuit choisit parfois un classifieur de modération : sa sortie (« User Safety: safe ») n'est pas une réponse.
        if (model && /safety|guard/i.test(model)) throw new OpenRouterError('Le routeur a choisi un modèle de modération au lieu d’un modèle de conversation. Réessayez.', true)
        const c = chunk.choices?.[0]
        if (c?.error) throw new OpenRouterError(explain(502, c.error.message ?? 'réponse en erreur'), true)
        if (c?.delta?.content) text += c.delta.content
        if (c?.delta?.content || c?.delta?.reasoning) alive()
        if (c?.finish_reason) finish = c.finish_reason
      }
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError')
      throw new OpenRouterError(`Le modèle gratuit ne répond plus depuis ${Math.round(idleMs / 1000)} s (file d’attente chargée). Réessayez ou choisissez un autre modèle.`, true)
    // Connexion coupée en cours de réponse (« terminated », « other side closed ») : un autre essai peut aboutir.
    if (!(e instanceof OpenRouterError)) throw new OpenRouterError('La connexion avec le modèle gratuit a été coupée pendant la réponse. Réessayez.', true)
    throw e
  } finally {
    clearTimeout(idle)
    clearTimeout(cap)
  }
  text = text.trim()
  if (!text) throw new OpenRouterError('Le modèle gratuit a renvoyé une réponse vide. Réessayez ou choisissez un autre modèle.', true)
  return { text, finish, model }
}

const retryableStatus = (status: number) => status === 404 || status === 408 || status === 429 || status >= 500

/**
 * Exécute la requête avec le modèle choisi ; s'il est saturé, indisponible, trop lent ou hors sujet,
 * réessaie avec le routeur gratuit, qui prend un autre modèle disponible (deux essais au plus).
 */
async function withFallback<T>(model: string, run: (model: string) => Promise<T>): Promise<T> {
  const attempts = model === FREE_ROUTER ? [model, FREE_ROUTER] : [model, FREE_ROUTER, FREE_ROUTER]
  let last: unknown
  for (const m of attempts) {
    try {
      return await run(m)
    } catch (e) {
      if (!(e instanceof OpenRouterError) || !e.retryable) throw e
      last = e
    }
  }
  throw last
}

/** Nom lisible d'un identifiant de modèle (« meta-llama/llama-3.3-70b-instruct:free » → « llama-3.3-70b-instruct »). */
export function modelLabel(id?: string): string | undefined {
  if (!id) return undefined
  return id.replace(/^[^/]+\//, '').replace(/:free$/, '')
}

export async function orText(key: string, model: string, messages: OrMessage[], maxTokens: number, timeoutMs = TIMEOUT_MS): Promise<string> {
  return (await orReply(key, model, messages, maxTokens, timeoutMs)).text
}

/** Réponse texte et modèle qui l'a réellement produite (le routeur gratuit en choisit un à chaque requête). */
export async function orReply(key: string, model: string, messages: OrMessage[], maxTokens: number, timeoutMs = TIMEOUT_MS): Promise<{ text: string; model: string }> {
  return withFallback(model, async (m) => {
    const { text, finish, model: used } = await post(key, { model: m, messages, max_tokens: maxTokens, plugins: pdfPlugin(messages) }, timeoutMs)
    if (finish === 'length') throw new OpenRouterError('La réponse a été tronquée (contenu trop long). Réessayez avec un texte plus court.')
    // Certains modèles de raisonnement laissent leurs balises de réflexion dans la réponse.
    return { text: text.replace(/<think>[\s\S]*?<\/think>/g, '').trim(), model: used ?? m }
  })
}

/**
 * Réponse JSON conforme au schéma. Les modèles gratuits respectent inégalement le format :
 * on demande un json_schema strict, on retombe sur une consigne simple si le modèle le refuse,
 * puis on complète les champs manquants avec des valeurs vides.
 */
export async function orJson<T>(key: string, model: string, schema: JsonSchema, messages: OrMessage[], maxTokens: number): Promise<T> {
  const instruction: OrMessage = {
    role: 'system',
    content: `Réponds UNIQUEMENT par un objet JSON valide (sans Markdown ni texte autour) conforme à ce schéma JSON :\n${JSON.stringify(schema)}`
  }
  const all = [...messages, instruction]
  // Import et analyses : réponses longues, délai plus large.
  const text = await withFallback(model, async (m) => {
    const base = { model: m, messages: all, max_tokens: maxTokens, plugins: pdfPlugin(messages) }
    try {
      return (await post(key, { ...base, response_format: { type: 'json_schema', json_schema: { name: 'reponse', strict: true, schema } } }, 90_000)).text
    } catch (e) {
      // Modèle sans sorties structurées (« No endpoints found that can handle the requested parameters ») :
      // on réessaie avec la seule consigne.
      if (!(e instanceof OpenRouterError) || !/\(400\)|indisponible|requested parameters|response_format|structured|json_schema/i.test(e.message)) throw e
      return (await post(key, base, 90_000)).text
    }
  })
  const value = extractJson(text)
  if (value === undefined) throw new OpenRouterError("La réponse du modèle gratuit n'est pas un JSON valide. Réessayez ou choisissez un autre modèle.")
  return fill(schema, value) as T
}

/** Isole le premier objet JSON d'une réponse (blocs ```json, texte autour, balises <think>). */
function extractJson(text: string): unknown {
  const clean = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/gi, '')
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start < 0 || end <= start) return undefined
  try {
    return JSON.parse(clean.slice(start, end + 1))
  } catch {
    return undefined
  }
}

/** Ramène une valeur au type du schéma : champs absents = chaîne vide, 0, false ou liste vide. */
function fill(schema: JsonSchema, v: unknown): unknown {
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type
  switch (type) {
    case 'object': {
      const src = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
      const out: Record<string, unknown> = {}
      for (const [k, s] of Object.entries(schema.properties ?? {})) out[k] = fill(s, src[k])
      return out
    }
    case 'array':
      return Array.isArray(v) ? v.map((x) => fill(schema.items ?? {}, x)) : v == null || v === '' ? [] : [fill(schema.items ?? {}, v)]
    case 'string':
      return v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : String(v)
    case 'number':
    case 'integer': {
      const n = Number(v)
      return Number.isFinite(n) ? n : 0
    }
    case 'boolean':
      return v === true || v === 'true'
    default:
      return v
  }
}

/** Les PDF sont convertis en texte par OpenRouter (moteur gratuit) pour tous les modèles. */
function pdfPlugin(messages: OrMessage[]) {
  const hasFile = messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'file'))
  return hasFile ? [{ id: 'file-parser', pdf: { engine: 'pdf-text' } }] : undefined
}

/** Modèles gratuits disponibles (liste publique, mise à jour par OpenRouter). */
export async function listFreeModels(): Promise<FreeModel[]> {
  let json: { data?: { id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string }; architecture?: { output_modalities?: string[] }; supported_parameters?: string[] }[] }
  try {
    const res = await fetch(`${BASE}/models`)
    json = await res.json()
  } catch {
    throw new OpenRouterError('Impossible de récupérer la liste des modèles OpenRouter. Vérifiez votre connexion Internet.')
  }
  return (json.data ?? [])
    .filter(
      (m) =>
        Number(m.pricing?.prompt) === 0 &&
        Number(m.pricing?.completion) === 0 &&
        (m.architecture?.output_modalities ?? ['text']).includes('text') &&
        !/safety|guard|lyria/i.test(m.id)
    )
    .map((m) => ({
      id: m.id,
      name: (m.name ?? m.id).replace(/\s*\(free\)\s*$/i, ''),
      context: m.context_length ?? 0,
      structured: (m.supported_parameters ?? []).includes('structured_outputs')
    }))
    .sort((a, b) => Number(b.id === 'openrouter/free') - Number(a.id === 'openrouter/free') || Number(b.structured) - Number(a.structured) || a.name.localeCompare(b.name))
}

/** Vérifie la clé sans consommer de requête de modèle. */
export async function orCheckKey(key: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${BASE}/key`, { headers: headers(key) })
  } catch {
    throw new OpenRouterError('Impossible de joindre OpenRouter. Vérifiez votre connexion Internet.')
  }
  if (!res.ok) throw new OpenRouterError(explain(res.status, res.statusText))
}
