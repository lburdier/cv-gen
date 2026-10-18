import { ArrowUp, Loader2, RotateCcw, Trash2, X } from 'lucide-react'
import { Mark } from './Shell'
import { useEffect, useRef, useState } from 'react'
import type { FreeModel, ModelId } from '../../../shared/types'
import { CLAUDE_MODELS, freeModels, freeName } from '../lib/freeModels'
import { useLocalModels } from './LocalModels'
import { Markdown } from '../lib/markdown'
import { useStore } from '../store'
import { Select } from './Select'

const SUGGESTIONS = ['Comment améliorer mon profil ?', 'Explique mon score ATS', 'Quels mots-clés me manquent ?', 'Prépare-moi à l’entretien']

/** Choix du modèle de l'assistant : modèles gratuits d'OpenRouter et modèles Claude, dans une seule liste. */
function ModelPicker({ disabled }: { disabled: boolean }) {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const [list, setList] = useState<FreeModel[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    freeModels()
      .then(setList)
      .catch(() => setError(true))
  }, [])

  const locals = useLocalModels() ?? []
  const or = settings.provider === 'openrouter'
  const value = settings.provider === 'local' ? `local:${settings.localModel}` : or ? `or:${settings.orModel}` : `claude:${settings.model}`
  const free: FreeModel[] = list ?? []
  // Le modèle choisi reste dans la liste même s'il n'est plus proposé.
  const shown = or && !free.some((m) => m.id === settings.orModel) ? [{ id: settings.orModel, name: settings.orModel, context: 0, structured: false }, ...free] : free

  return (
    <Select
      className="select chat-model"
      value={value}
      disabled={disabled}
      title="Modèle utilisé par l’assistant"
      aria-label="Modèle de l’assistant"
      onChange={(e) => {
        const [kind, id] = [e.target.value.slice(0, e.target.value.indexOf(':')), e.target.value.slice(e.target.value.indexOf(':') + 1)]
        void (kind === 'local'
          ? setSettings({ provider: 'local', localModel: id })
          : kind === 'or'
            ? setSettings({ provider: 'openrouter', orModel: id })
            : setSettings({ provider: 'anthropic', model: id as ModelId }))
      }}
    >
      <optgroup label={`OpenRouter · gratuit${settings.hasOpenRouterKey ? '' : ' (clé requise)'}`}>
        {shown.length === 0 && <option value="or:openrouter/free">{error ? 'Automatique (liste indisponible)' : 'Automatique (recommandé)'}</option>}
        {shown.map((m) => (
          <option key={m.id} value={`or:${m.id}`}>
            {freeName(m)}
          </option>
        ))}
        {!list && !error && <option disabled>Chargement des modèles…</option>}
      </optgroup>
      <optgroup label="Sur cet ordinateur · hors ligne, sans limite">
        {locals.map((m) => (
          <option key={m.id} value={`local:${m.id}`} disabled={!m.installed}>
            {m.label} · {m.name}
            {m.installed ? '' : m.downloading ? ` (téléchargement ${m.percent ?? 0} %)` : ' (à télécharger dans Paramètres)'}
          </option>
        ))}
      </optgroup>
      <optgroup label={`Claude${settings.hasClaudeKey || (settings.claudeAuth === 'account' && settings.hasClaudeLogin) ? '' : ' (clé ou connexion requise)'}`}>
        {CLAUDE_MODELS.map((m) => (
          <option key={m.id} value={`claude:${m.id}`}>
            {m.name}
          </option>
        ))}
      </optgroup>
    </Select>
  )
}

export function Assistant() {
  const s = useStore()
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)
  // Numéro de la requête en cours : une réponse arrivée après « Annuler » est ignorée.
  const reqId = useRef(0)

  // Contexte : le CV ouvert dans l'éditeur, sinon le plus récent, et son offre liée.
  const route = s.route
  const resume = route.name === 'editor' ? s.data.resumes.find((r) => r.id === route.id) : s.data.resumes[0]
  const offer = resume?.offerId ? s.data.offers.find((o) => o.id === resume.offerId) : undefined
  const local = s.settings.provider === 'local'
  const hasKey = local ? s.settings.hasApiKey : s.settings.provider === 'openrouter' ? s.settings.hasOpenRouterKey : s.settings.claudeAuth === 'account' ? s.settings.hasClaudeLogin : s.settings.hasClaudeKey
  // Texte en cours d'écriture par un modèle local (affiché en direct).
  const [partial, setPartial] = useState('')
  useEffect(() => {
    if (!loading) {
      setPartial('')
      return
    }
    return window.cvgen.ai.onPartial(setPartial)
  }, [loading])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [s.chat, loading])

  useEffect(() => {
    if (!loading) return
    setElapsed(0)
    const t0 = Date.now()
    const t = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(t)
  }, [loading])

  const ask = async (history: typeof s.chat) => {
    const id = ++reqId.current
    setLoading(true)
    try {
      const answer = await window.cvgen.ai.chat(history, resume, offer)
      if (id !== reqId.current) return
      useStore.getState().setChat([...history, { role: 'assistant', content: answer.text, model: answer.model }])
    } catch (e) {
      if (id !== reqId.current) return
      useStore.getState().setChat([...history, { role: 'assistant', content: `⚠️ ${(e as Error).message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '')}`, error: true }])
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }

  const send = (text: string) => {
    const t = text.trim()
    if (!t || loading) return
    const history = [...s.chat, { role: 'user' as const, content: t }]
    s.setChat(history)
    setDraft('')
    void ask(history)
  }

  // Réessayer : renvoie la conversation sans le dernier message d'erreur.
  const retry = () => {
    if (loading) return
    const history = s.chat.slice(0, -1)
    s.setChat(history)
    void ask(history)
  }

  const cancel = () => {
    reqId.current++
    setLoading(false)
  }

  // Message transmis depuis la barre d'assistant du tableau de bord.
  useEffect(() => {
    const h = (e: Event) => send((e as CustomEvent<string>).detail)
    window.addEventListener('cvgen:ask', h)
    return () => window.removeEventListener('cvgen:ask', h)
  })

  const last = s.chat[s.chat.length - 1]

  return (
    <aside className="drawer" aria-label="Assistant IA">
      <div className="drawer-head">
        <div className="panel-icon">
          <Mark size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>Assistant IA</h3>
          <div className="mono-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {resume ? resume.title : 'aucun CV'}
            {offer ? ` · ${offer.title}` : ''}
          </div>
        </div>
        {s.chat.length > 0 && (
          <button className="icon-btn sm" onClick={() => (cancel(), s.setChat([]))} title="Effacer la conversation">
            <Trash2 size={15} />
          </button>
        )}
        <button className="icon-btn sm" onClick={() => s.setAssistant(false)} aria-label="Fermer">
          <X size={16} />
        </button>
      </div>
      <div className="chat">
        {s.chat.length === 0 && (
          <div style={{ margin: 'auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 680, letterSpacing: '-0.02em' }}>Une question sur votre CV ?</div>
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 18px' }}>
              L’assistant connaît votre CV{offer ? ' et l’offre ciblée' : ''}. Il ne vous fera jamais inventer d’expérience.
            </p>
            <div className="chips" style={{ justifyContent: 'center' }}>
              {SUGGESTIONS.map((q) => (
                <button key={q} className="chip" onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {s.chat.map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.error || m.content.startsWith('⚠️') ? 'err' : ''}`}>
            {m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
            {m.role === 'assistant' && m.model && <div className="msg-model">{m.model}</div>}
          </div>
        ))}
        {!loading && last?.role === 'assistant' && (last.error || last.content.startsWith('⚠️')) && s.chat.length > 1 && (
          <button className="btn btn-ghost btn-sm chat-retry" onClick={retry}>
            <RotateCcw size={14} /> Réessayer
          </button>
        )}
        {loading && partial && (
          <div className="msg assistant streaming">
            <Markdown text={partial} />
          </div>
        )}
        {loading && (
          <div className="msg assistant row" style={{ gap: 8 }}>
            <Loader2 size={14} className="spin" /> {partial ? 'Écriture…' : 'Réflexion…'}
            {elapsed >= 5 && <span className="muted">{elapsed} s</span>}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={cancel}>
              Annuler
            </button>
          </div>
        )}
        {loading && elapsed >= 20 && !partial && (
          <p className="muted chat-hint">Les modèles gratuits peuvent être en file d’attente. Si l’un ne répond pas, l’app passe automatiquement à un autre modèle gratuit.</p>
        )}
        <div ref={endRef} />
      </div>
      <div className="chat-input">
        <textarea
          value={draft}
          autoFocus
          placeholder="Demandez quelque chose… (Entrée pour envoyer)"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(draft)
            }
          }}
        />
        <div className="row" style={{ gap: 8 }}>
          <ModelPicker disabled={loading} />
          <button className="btn btn-ink btn-sm" style={{ marginLeft: 'auto' }} disabled={!draft.trim() || loading} onClick={() => send(draft)}>
            Demander <ArrowUp size={14} />
          </button>
        </div>
        {!hasKey && (
          <button className="link-muted chat-key" onClick={() => s.go({ name: 'settings' })}>
            {local
              ? 'Modèle local à télécharger : Paramètres →'
              : `Clé ${s.settings.provider === 'openrouter' ? 'OpenRouter' : 'Claude'} requise : l’ajouter dans Paramètres${s.settings.hasLocalModel ? ' (en attendant, le modèle local répond)' : ', ou utiliser le modèle hors ligne'} →`}
          </button>
        )}
      </div>
    </aside>
  )
}
