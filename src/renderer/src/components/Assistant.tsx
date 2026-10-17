import { ArrowUp, Loader2, Trash2, X } from 'lucide-react'
import { Mark } from './Shell'
import { useEffect, useRef, useState } from 'react'
import { Markdown } from '../lib/markdown'
import { useStore } from '../store'

const SUGGESTIONS = ['Comment améliorer mon profil ?', 'Explique mon score ATS', 'Quels mots-clés me manquent ?', 'Prépare-moi à l’entretien']

export function Assistant() {
  const s = useStore()
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Contexte : le CV ouvert dans l'éditeur, sinon le plus récent, et son offre liée.
  const route = s.route
  const resume = route.name === 'editor' ? s.data.resumes.find((r) => r.id === route.id) : s.data.resumes[0]
  const offer = resume?.offerId ? s.data.offers.find((o) => o.id === resume.offerId) : undefined

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [s.chat, loading])

  const send = async (text: string) => {
    const t = text.trim()
    if (!t || loading) return
    const history = [...s.chat, { role: 'user' as const, content: t }]
    s.setChat(history)
    setDraft('')
    setLoading(true)
    try {
      const answer = await window.cvgen.ai.chat(history, resume, offer)
      s.setChat([...history, { role: 'assistant', content: answer }])
    } catch (e) {
      s.setChat([...history, { role: 'assistant', content: `⚠️ ${(e as Error).message}` }])
    } finally {
      setLoading(false)
    }
  }

  // Message transmis depuis la barre d'assistant du tableau de bord.
  useEffect(() => {
    const h = (e: Event) => send((e as CustomEvent<string>).detail)
    window.addEventListener('cvgen:ask', h)
    return () => window.removeEventListener('cvgen:ask', h)
  })

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
          <button className="icon-btn sm" onClick={() => s.setChat([])} title="Effacer la conversation">
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
            <div style={{ fontSize: 22, fontWeight: 680, letterSpacing: '-0.02em' }}>
              Une question sur votre CV ?
            </div>
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
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
          </div>
        ))}
        {loading && (
          <div className="msg assistant row" style={{ gap: 8 }}>
            <Loader2 size={14} className="spin" /> Réflexion…
          </div>
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
        <div className="row">
          <span className="mono-label">
            {s.settings.hasApiKey ? (
              s.settings.provider === 'openrouter' ? `OpenRouter · ${s.settings.orModel}` : s.settings.model
            ) : (
              'Clé API requise (Paramètres)'
            )}
          </span>
          <button className="btn btn-ink btn-sm" style={{ marginLeft: 'auto' }} disabled={!draft.trim() || loading} onClick={() => send(draft)}>
            Demander <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
