import { Copy, Download, Mail, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { contactParts, fullName } from '../../../shared/format'
import type { CoverLetter, Lang } from '../../../shared/types'
import { Dropdown, Empty, timeAgo } from '../components/ui'
import { uid } from '../lib/sample'
import { actions } from '../lib/actions'
import { useStore } from '../store'

const TONES = ['professionnel et chaleureux', 'enthousiaste et dynamique', 'direct et concis', 'formel (grands groupes, secteur public)']

export default function Letters({ id }: { id?: string }) {
  const s = useStore()
  const { letters, resumes, offers } = s.data

  // Route « new:<cv>:<offre> » : création préremplie depuis la page Offres.
  const preset = id?.startsWith('new:') ? id.split(':') : null
  const current = id && !preset ? letters.find((l) => l.id === id) : undefined

  const [resumeId, setResumeId] = useState(preset?.[1] || resumes[0]?.id || '')
  const [offerId, setOfferId] = useState(preset?.[2] || '')
  const [tone, setTone] = useState(TONES[0])
  const [lang, setLang] = useState<Lang>('fr')

  useEffect(() => {
    if (current) {
      setResumeId(current.resumeId)
      setOfferId(current.offerId ?? '')
    }
  }, [current?.id])

  const resume = resumes.find((r) => r.id === resumeId)
  const offer = offers.find((o) => o.id === offerId)

  const generate = async () => {
    if (!resume) return
    const body = await s.run('Rédaction de la lettre…', () => window.cvgen.ai.coverLetter(resume, offer, tone, lang))
    if (!body) return
    const letter: CoverLetter = current
      ? { ...current, body, resumeId, offerId: offerId || undefined, updatedAt: Date.now() }
      : {
          id: uid(),
          title: offer ? `${offer.title}${offer.company ? ' — ' + offer.company : ''}` : 'Candidature spontanée',
          resumeId,
          offerId: offerId || undefined,
          body,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
    s.saveLetter(letter)
    s.log('letter', `Lettre rédigée : ${letter.title}`)
    s.go({ name: 'letters', id: letter.id })
  }

  const exportAs = async (format: 'pdf' | 'docx' | 'txt') => {
    if (!current) return
    const res = await s.run(`Export ${format.toUpperCase()}…`, () => window.cvgen.exportLetter(current, resumes.find((r) => r.id === current.resumeId), format))
    if (res?.ok) s.toast({ kind: 'success', title: 'Lettre exportée', detail: res.path })
    else if (res && !res.canceled) s.toast({ kind: 'error', title: 'Export impossible', detail: res.error })
  }

  const blank = () => {
    const l: CoverLetter = { id: uid(), title: 'Nouvelle lettre', resumeId, offerId: offerId || undefined, body: '', createdAt: Date.now(), updatedAt: Date.now() }
    s.saveLetter(l)
    s.go({ name: 'letters', id: l.id })
  }

  const author = current ? resumes.find((r) => r.id === current.resumeId) : resume

  return (
    <div className="page">
      <div className="page-head">
        <h1>
          Lettres de motivation <span className="count">{letters.length} lettres</span>
        </h1>
        <div className="actions">
          <button className="btn btn-soft" onClick={() => s.go({ name: 'letters' })}>
            <Plus size={16} /> Nouvelle lettre
          </button>
        </div>
      </div>
      <div className="split">
        <div className="offer-list">
          <div className="mono-label" style={{ padding: '0 4px 4px' }}>
            mes lettres
          </div>
          {letters.length === 0 && <Empty icon={<Mail size={24} />} title="Aucune lettre" />}
          {letters.map((l) => (
            <div key={l.id} className="list-wrap">
              <button className={`offer-item ${current?.id === l.id ? 'on' : ''}`} onClick={() => s.go({ name: 'letters', id: l.id })}>
              <strong>{l.title}</strong>
              <span>modifiée {timeAgo(l.updatedAt)}</span>
            </button>
              <button className="icon-btn sm item-del" title="Supprimer la lettre" onClick={() => actions.deleteLetter(l.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="stack" style={{ gap: 20 }}>
          <div className="panel">
            <div className="panel-head">
              <div className="panel-icon">
                <Sparkles size={16} />
              </div>
              <h3>{current ? 'Régénérer la lettre' : 'Rédiger avec l’IA'}</h3>
            </div>
            <div className="letter-opts">
              <label className="field">
                <span>CV</span>
                <select className="select" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                  {resumes.length === 0 && <option value="">Aucun CV</option>}
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Offre</span>
                <select className="select" value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                  <option value="">Candidature spontanée</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                      {o.company ? ` — ${o.company}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ton</span>
                <select className="select" value={tone} onChange={(e) => setTone(e.target.value)}>
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Langue</span>
                <select className="select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                </select>
              </label>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              {!current && (
                <button className="btn btn-ghost btn-sm" onClick={blank} disabled={!resume}>
                  Partir d’une page blanche
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn btn-accent" onClick={generate} disabled={!resume || !s.settings.hasApiKey || Boolean(s.busy)} title={s.settings.hasApiKey ? '' : 'Clé API requise'}>
                <Sparkles size={15} /> {current ? 'Régénérer' : 'Générer la lettre'}
              </button>
            </div>
          </div>

          {current && (
            <div className="stack" style={{ gap: 12 }}>
              <div className="row">
                <input
                  className="title-input"
                  style={{ fontSize: 18 }}
                  value={current.title}
                  onChange={(e) => s.saveLetter({ ...current, title: e.target.value, updatedAt: Date.now() })}
                />
                <span className="mono-label">{current.body.trim().split(/\s+/).filter(Boolean).length} mots</span>
                <button
                  className="btn btn-soft btn-sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(current.body)
                    s.toast({ kind: 'success', title: 'Lettre copiée' })
                  }}
                >
                  <Copy size={14} /> Copier
                </button>
                <Dropdown
                  align="right"
                  trigger={(t) => (
                    <button className="btn btn-ink btn-sm" onClick={t}>
                      <Download size={14} /> Exporter
                    </button>
                  )}
                >
                  {(close) => (
                    <>
                      <button onClick={() => (close(), exportAs('pdf'))}>PDF</button>
                      <button onClick={() => (close(), exportAs('docx'))}>Word (.docx)</button>
                      <button onClick={() => (close(), exportAs('txt'))}>Texte brut</button>
                    </>
                  )}
                </Dropdown>
                <button
                  className="icon-btn"
                  title="Supprimer"
                  onClick={() => {
                    {
                      actions.deleteLetter(current.id)
                      s.go({ name: 'letters' })
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="letter-paper">
                {author && (
                  <div style={{ marginBottom: 28 }}>
                    <strong style={{ fontSize: 17 }}>{fullName(author)}</strong>
                    <div style={{ color: '#666', fontSize: 12.5 }}>{contactParts(author).join('  |  ')}</div>
                  </div>
                )}
                <textarea
                  className="letter-editor"
                  value={current.body}
                  placeholder="Votre lettre…"
                  onChange={(e) => s.saveLetter({ ...current, body: e.target.value, updatedAt: Date.now() })}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
