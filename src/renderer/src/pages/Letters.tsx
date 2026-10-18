import { Check, Copy, Download, FileText, Mail, Plus, Sparkles, Trash2, Wand2, X as XIcon, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { contactParts, fullName } from '../../../shared/format'
import { LETTER_ANGLES, LETTER_LENGTHS, LETTER_TONES, defaultLetterOptions, defaultRecipient, defaultSubject, draftLetter, letterChecks, letterScore, placeDate, withHeader } from '../../../shared/letter'
import type { CoverLetter, LetterOptions } from '../../../shared/types'
import { Dropdown, Empty, timeAgo } from '../components/ui'
import { uid } from '../lib/sample'
import { actions } from '../lib/actions'
import { useStore } from '../store'

const REVISIONS: { label: string; instruction: string }[] = [
  { label: 'Raccourcir', instruction: 'Raccourcis la lettre d’environ un tiers en gardant les réalisations les plus fortes.' },
  { label: 'Plus percutant', instruction: 'Rends la lettre plus percutante : accroche plus forte, phrases plus courtes, verbes d’action, résultats mis en avant.' },
  { label: 'Plus formel', instruction: 'Rends le ton plus formel et soutenu, adapté à un grand groupe ou au secteur public.' },
  { label: 'Plus chaleureux', instruction: 'Rends le ton plus chaleureux et personnel, sans familiarité.' },
  { label: 'Corriger', instruction: 'Corrige uniquement l’orthographe, la grammaire, la ponctuation et la typographie, sans changer le fond.' }
]

export default function Letters({ id }: { id?: string }) {
  const s = useStore()
  const { letters, resumes, offers } = s.data

  // Route « new:<cv>:<offre> » : création préremplie depuis la page Offres.
  const preset = id?.startsWith('new:') ? id.split(':') : null
  const current = id && !preset ? letters.find((l) => l.id === id) : undefined

  const [resumeId, setResumeId] = useState(preset?.[1] || resumes[0]?.id || '')
  const [offerId, setOfferId] = useState(preset?.[2] || '')
  const offerOf = (oid: string) => offers.find((o) => o.id === oid)
  const [opts, setOpts] = useState<LetterOptions>(() => defaultLetterOptions(offerOf(preset?.[2] || '')))
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (current) {
      setResumeId(current.resumeId)
      setOfferId(current.offerId ?? '')
      setOpts(current.options ?? defaultLetterOptions(offerOf(current.offerId ?? '')))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  const resume = resumes.find((r) => r.id === resumeId)
  const offer = offerOf(offerId)
  const hasAi = s.settings.hasApiKey
  // Mini modèle local : il part du brouillon guidé et reformule chaque paragraphe sans changer les faits.
  const localAi = s.settings.provider === 'local'
  const set = (patch: Partial<LetterOptions>) => setOpts((o) => ({ ...o, ...patch }))

  /** Enregistre le texte rédigé : nouvelle lettre, ou remplacement annulable de la lettre ouverte. */
  const store = (body: string, how: string) => {
    if (current) {
      s.withUndo(`Lettre ${how}`, () => s.saveLetter({ ...withHeader(current, resume, offer), body, resumeId, offerId: offerId || undefined, options: opts, updatedAt: Date.now() }))
      return
    }
    const letter: CoverLetter = withHeader(
      {
        id: uid(),
        title: offer ? `${offer.title}${offer.company ? ' · ' + offer.company : ''}` : 'Candidature spontanée',
        resumeId,
        offerId: offerId || undefined,
        body,
        options: opts,
        recipient: defaultRecipient(offer),
        subject: defaultSubject(offer, resume, opts.lang),
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      resume,
      offer
    )
    s.saveLetter(letter)
    s.log('letter', `Lettre rédigée : ${letter.title}`)
    s.go({ name: 'letters', id: letter.id })
  }

  const generate = async () => {
    if (!resume) return
    const body = await s.run(localAi ? 'Rédaction avec l’IA locale (paragraphe par paragraphe)…' : 'Rédaction de la lettre par l’IA…', () => window.cvgen.ai.coverLetter(resume, offer, opts))
    if (body) store(body, current ? 'régénérée' : 'rédigée')
  }

  const draft = () => {
    if (!resume) return
    store(draftLetter(resume, offer, opts), current ? 'remplacée par le brouillon guidé' : 'rédigée')
    s.toast({ kind: 'info', title: 'Brouillon guidé prêt', detail: 'Construit uniquement à partir de votre CV et de l’offre : personnalisez-le, surtout l’accroche.' })
  }

  const revise = async (instruction: string, label: string) => {
    if (!current || !resume || !instruction.trim()) return
    const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length
    const shorten = label === 'Raccourcir'
    const body = await s.run(`${label}…`, async () => {
      const first = await window.cvgen.ai.reviseLetter(current.body, instruction, resume, offer, opts.lang)
      // Les petits modèles gratuits ignorent parfois la consigne de longueur : un second essai, plus explicite.
      if (shorten && words(first) > words(current.body) * 0.9) {
        const target = Math.round(words(current.body) * 0.65)
        return window.cvgen.ai.reviseLetter(current.body, `${instruction} La lettre doit faire au maximum ${target} mots.`, resume, offer, opts.lang)
      }
      return first
    })
    if (!body) return
    if (body.trim() === current.body.trim() || (shorten && words(body) > words(current.body) * 0.9)) {
      s.toast({ kind: 'info', title: 'Lettre inchangée', detail: 'Le modèle n’a pas appliqué la retouche. Réessayez, ou choisissez un autre modèle dans l’assistant.' })
      return
    }
    store(body, 'retouchée')
    setCustom('')
  }

  const exportAs = async (format: 'pdf' | 'docx' | 'txt') => {
    if (!current) return
    const res = await s.run(`Export ${format.toUpperCase()}…`, () => window.cvgen.exportLetter(withHeader(current, author, offer), author, format))
    if (res?.ok) s.toast({ kind: 'success', title: 'Lettre exportée', detail: res.path })
    else if (res && !res.canceled) s.toast({ kind: 'error', title: 'Export impossible', detail: res.error })
  }

  const blank = () => {
    const l = withHeader({ id: uid(), title: 'Nouvelle lettre', resumeId, offerId: offerId || undefined, body: '', options: opts, createdAt: Date.now(), updatedAt: Date.now() }, resume, offer)
    s.saveLetter(l)
    s.go({ name: 'letters', id: l.id })
  }

  const author = current ? resumes.find((r) => r.id === current.resumeId) : resume
  const shown = current ? withHeader(current, author, offer) : undefined
  const update = (patch: Partial<CoverLetter>) => current && s.saveLetter({ ...withHeader(current, author, offer), ...patch, updatedAt: Date.now() })
  const checks = useMemo(() => (current ? letterChecks(current.body, author, offer, current.options ?? opts) : []), [current, author, offer, opts])
  const score = letterScore(checks)

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
              <h3>{current ? 'Réglages de la lettre' : 'Préparer la lettre'}</h3>
            </div>
            <div className="letter-opts">
              <label className="field">
                <span>CV</span>
                <select className="select" value={resumeId} onChange={(e) => (setResumeId(e.target.value), set({ highlights: [] }))}>
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
                <select
                  className="select"
                  value={offerId}
                  onChange={(e) => {
                    setOfferId(e.target.value)
                    if (!e.target.value) set({ angle: 'spontanee' })
                    else if (opts.angle === 'spontanee') set({ angle: 'poste' })
                  }}
                >
                  <option value="">Candidature spontanée</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                      {o.company ? ` · ${o.company}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ton</span>
                <select className="select" value={opts.tone} onChange={(e) => set({ tone: e.target.value })}>
                  {LETTER_TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Langue</span>
                <select className="select" value={opts.lang} onChange={(e) => set({ lang: e.target.value as LetterOptions['lang'] })}>
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                </select>
              </label>
            </div>

            <div className="lt-row">
              <div className="field">
                <span>Angle</span>
                <div className="chips">
                  {LETTER_ANGLES.map((a) => (
                    <button key={a.id} className={`chip ${opts.angle === a.id ? 'active' : ''}`} title={a.hint} onClick={() => set({ angle: a.id })}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span>Longueur</span>
                <div className="seg">
                  {LETTER_LENGTHS.map((l) => (
                    <button key={l.id} className={opts.length === l.id ? 'on' : ''} onClick={() => set({ length: l.id })} title={`${l.words[0]} à ${l.words[1]} mots`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="field lt-motivation">
              <span>
                Ce qui vous attire dans {offer?.company || 'cette entreprise'} <small className="muted">(facultatif, fortement conseillé)</small>
              </span>
              <textarea
                className="textarea"
                rows={2}
                value={opts.motivation}
                placeholder="Ex. : leur outil est utilisé par mon équipe actuelle ; je veux travailler sur des produits B2B à fort impact ; j’ai vu leur conférence sur…"
                onChange={(e) => set({ motivation: e.target.value })}
              />
              <small className="muted">L’IA n’invente jamais votre motivation : sans ce champ, la lettre s’appuie seulement sur l’offre et votre CV.</small>
            </label>

            {resume && resume.experiences.length > 0 && (
              <div className="field">
                <span>Expériences à mettre en avant {opts.highlights.length === 0 && <small className="muted">(par défaut : les plus récentes)</small>}</span>
                <div className="chips">
                  {resume.experiences.map((e) => {
                    const on = opts.highlights.includes(e.id)
                    return (
                      <button key={e.id} className={`chip ${on ? 'active' : ''}`} onClick={() => set({ highlights: on ? opts.highlights.filter((x) => x !== e.id) : [...opts.highlights, e.id] })}>
                        {on && <Check size={12} />} {e.role}
                        {e.company ? ` · ${e.company}` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="row wrap" style={{ marginTop: 16, gap: 8 }}>
              {!current && (
                <button className="btn btn-ghost btn-sm" onClick={blank} disabled={!resume}>
                  Page blanche
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn btn-outline" onClick={draft} disabled={!resume || Boolean(s.busy)} title="Lettre construite à partir de votre CV et de l’offre, sans IA">
                <FileText size={15} /> Brouillon guidé{current ? '' : ' (sans IA)'}
              </button>
              <button className="btn btn-accent" onClick={generate} disabled={!resume || !hasAi || Boolean(s.busy)} title={hasAi ? '' : 'Clé API requise (Paramètres)'}>
                <Sparkles size={15} /> {current ? 'Régénérer avec l’IA' : 'Rédiger avec l’IA'}
                {localAi ? ' locale' : ''}
              </button>
            </div>
            {localAi && hasAi && (
              <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
                IA locale : elle part du brouillon guidé (vos vrais faits) et reformule chaque paragraphe ; une reformulation qui change un chiffre ou un nom est écartée.
              </p>
            )}
            {!hasAi && (
              <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
                Sans clé IA, le brouillon guidé reprend votre poste, vos réalisations et les mots-clés de l’offre.{' '}
                <a href="#" onClick={(e) => (e.preventDefault(), s.go({ name: 'settings' }))}>
                  Activer l’IA gratuite
                </a>
              </p>
            )}
          </div>

          {current && shown && (
            <div className="lt-work">
              <div className="stack" style={{ gap: 12, minWidth: 0 }}>
                <div className="row">
                  <input className="title-input" style={{ fontSize: 18 }} value={current.title} onChange={(e) => update({ title: e.target.value })} aria-label="Nom de la lettre" />
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
                      actions.deleteLetter(current.id)
                      s.go({ name: 'letters' })
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="letter-paper">
                  {author && (
                    <div className="lt-from">
                      <strong>{fullName(author)}</strong>
                      {contactParts(author).map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </div>
                  )}
                  <textarea className="lt-to" rows={3} value={shown.recipient} placeholder={'Destinataire\nEntreprise\nAdresse'} onChange={(e) => update({ recipient: e.target.value })} aria-label="Destinataire" />
                  <div className="lt-when">
                    <input value={shown.place} placeholder="Ville" onChange={(e) => update({ place: e.target.value })} aria-label="Lieu" />
                    <input type="date" value={shown.date} onChange={(e) => update({ date: e.target.value })} aria-label="Date" />
                    <span className="muted">{placeDate(shown.place ?? '', shown.date ?? '', current.options?.lang ?? 'fr')}</span>
                  </div>
                  <label className="lt-subject">
                    <b>{(current.options?.lang ?? 'fr') === 'en' ? 'Subject:' : 'Objet :'}</b>
                    <input value={shown.subject} onChange={(e) => update({ subject: e.target.value })} aria-label="Objet" />
                  </label>
                  <textarea className="letter-editor" value={current.body} placeholder="Votre lettre…" onChange={(e) => update({ body: e.target.value })} />
                </div>
              </div>

              <aside className="lt-side">
                <div className="lt-score">
                  <span className="big">{score}</span>
                  <div>
                    <strong>Vérification</strong>
                    <small className="muted">Longueur, entreprise, mots-clés, formules creuses</small>
                  </div>
                </div>
                <div className="checks">
                  {checks.map((c) => (
                    <div key={c.label} className="check-item">
                      <span className={`ic ${c.status}`}>{c.status === 'pass' ? <Check size={12} /> : c.status === 'warn' ? <AlertTriangle size={12} /> : <XIcon size={12} />}</span>
                      <div>
                        <strong>{c.label}</strong>
                        {c.detail && <p>{c.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lt-revise">
                  <div className="mono-label">
                    <Wand2 size={12} style={{ verticalAlign: -2 }} /> retouches IA
                  </div>
                  <div className="chips">
                    {REVISIONS.map((r) => (
                      <button key={r.label} className="chip" disabled={!hasAi || Boolean(s.busy) || !current.body.trim()} onClick={() => revise(r.instruction, r.label)} title={hasAi ? r.instruction : 'Clé API requise'}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 8 }}>
                    <input
                      className="input"
                      value={custom}
                      placeholder="Autre consigne : « parle de mon mémoire »…"
                      disabled={!hasAi}
                      onChange={(e) => setCustom(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && revise(custom, 'Retouche')}
                    />
                    <button className="btn btn-soft btn-sm" disabled={!hasAi || !custom.trim() || Boolean(s.busy)} onClick={() => revise(custom, 'Retouche')}>
                      OK
                    </button>
                  </div>
                  <small className="muted">Chaque retouche est annulable depuis la notification.</small>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
