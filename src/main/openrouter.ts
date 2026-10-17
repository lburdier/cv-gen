// Fournisseur OpenRouter : API compatible OpenAI, avec des modèles gratuits (suffixe « :free »).
// Comme pour Claude, la clé reste dans le processus principal.
import type { FreeModel } from '../shared/types'

const BASE = 'https://openrouter.ai/api/v1'

export class OpenRouterError extends Error {}

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

async function post(key: string, body: unknown): Promise<{ text: string; finish?: string }> {
  let res: Response
  try {
    res = await fetch(`${BASE}/chat/completions`, { method: 'POST', headers: headers(key), body: JSON.stringify(body) })
  } catch {
    throw new OpenRouterError('Impossible de joindre OpenRouter. Vérifiez votre connexion Internet.')
  }
  const raw = await res.text()
  let json: {
    error?: { message?: string; code?: number }
    choices?: { message?: { content?: string | null }; finish_reason?: string; error?: { message?: string } }[]
  } = {}
  try {
    json = JSON.parse(raw)
  } catch {
    if (!res.ok) throw new OpenRouterError(explain(res.status, raw.slice(0, 200)))
  }
  if (!res.ok || json.error) throw new OpenRouterError(explain(json.error?.code ?? res.status, json.error?.message ?? res.statusText))
  const choice = json.choices?.[0]
  if (choice?.error) throw new OpenRouterError(explain(502, choice.error.message ?? 'réponse en erreur'))
  const text = (choice?.message?.content ?? '').trim()
  if (!text) throw new OpenRouterError('Le modèle gratuit a renvoyé une réponse vide. Réessayez ou choisissez un autre modèle.')
  return { text, finish: choice?.finish_reason }
}

export async function orText(key: string, model: string, messages: OrMessage[], maxTokens: number): Promise<string> {
  const { text, finish } = await post(key, { model, messages, max_tokens: maxTokens, plugins: pdfPlugin(messages) })
  if (finish === 'length') throw new OpenRouterError('La réponse a été tronquée (contenu trop long). Réessayez avec un texte plus court.')
  // Certains modèles de raisonnement laissent leurs balises de réflexion dans la réponse.
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
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
  const base = { model, messages: all, max_tokens: maxTokens, plugins: pdfPlugin(messages) }
  let text: string
  try {
    ;({ text } = await post(key, { ...base, response_format: { type: 'json_schema', json_schema: { name: 'reponse', strict: true, schema } } }))
  } catch (e) {
    // Modèle sans sorties structurées : on réessaie avec la seule consigne.
    if (!(e instanceof OpenRouterError) || !/\(400\)|\(404\)|response_format|structured|json_schema/i.test(e.message)) throw e
    ;({ text } = await post(key, base))
  }
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
