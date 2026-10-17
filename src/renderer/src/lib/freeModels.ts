// Liste des modèles gratuits d'OpenRouter, chargée une fois par session (Paramètres, assistant).
import type { FreeModel } from '../../../shared/types'

let cache: Promise<FreeModel[]> | null = null

export function freeModels(refresh = false): Promise<FreeModel[]> {
  if (!cache || refresh) {
    cache = window.cvgen.listFreeModels().catch((e) => {
      cache = null
      throw e
    })
  }
  return cache
}

export const CLAUDE_MODELS = [
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5' }
] as const

/** Nom court d'un modèle OpenRouter. */
export function freeName(m: FreeModel): string {
  return m.id === 'openrouter/free' ? 'Automatique (recommandé)' : m.name.replace(/^[^:]+:\s*/, '')
}
