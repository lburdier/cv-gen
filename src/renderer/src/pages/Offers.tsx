import { BriefcaseBusiness, FileText, Mail, Plus, RefreshCw, Sparkles, Target, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Offer, OfferKeyword } from '../../../shared/types'
import { TailorModal } from '../components/TailorModal'
import { Empty, ScorePill, ScoreRing, timeAgo } from '../components/ui'
import { analyze, localAnalyze, matchKeywords } from '../lib/ats'
import { SAMPLE_OFFER, uid } from '../lib/sample'
import { actions } from '../lib/actions'
import { useStore } from '../store'

const CAT: Record<OfferKeyword['category'], string> = {
  hard: 'Compétences',
  tool: 'Outils & technos',
  domain: 'Domaine',
  soft: 'Savoir-être',
  certification: 'Certifications',
  language: 'Langues'
}

function NewOffer({ onCreated }: { onCreated: (id: string) => void }) {
  const s = useStore()
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')

  const create = async (useAi: boolean) => {
    const base: Offer = { id: uid(), title: title.trim(), company: company.trim(), text: text.trim(), createdAt: Date.now() }
    let analysis = localAnalyze(base.text)
    if (useAi) {
      const ai = await s.run('Analyse de l’offre par l’IA…', () => window.cvgen.ai.analyzeOffer(base.text))
      if (ai) analysis = ai
    }
    const offer: Offer = { ...base, title: base.title || analysis.title || 'Offre sans titre', company: base.company || analysis.company, analysis }
    s.saveOffer(offer)
    s.log('analyze', `Offre analysée : ${offer.title}`)
    onCreated(offer.id)
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-icon">
          <Target size={16} />
        </div>
        <h3>Nouvelle offre</h3>
        <div className="actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setText(SAMPLE_OFFER)}>
            Coller un exemple
          </button>
        </div>
      </div>
      <p className="panel-desc">Collez le texte complet de l’annonce : l’analyse extrait les mots-clés que les ATS vont rechercher.</p>
      <div className="stack">
        <div className="grid-2">
          <label className="field">
            <span>Intitulé (facultatif)</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Détecté automatiquement" />
          </label>
          <label className="field">
            <span>Entreprise (facultatif)</span>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
        </div>
        <textarea className="textarea" style={{ minHeight: 320 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Collez ici l’offre d’emploi (missions, profil recherché, compétences)…" />
        <div className="row">
          <span className="mono-label">{text.trim().split(/\s+/).filter(Boolean).length} mots</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-soft" disabled={text.trim().length < 80} onClick={() => create(false)}>
            Analyse rapide (locale)
          </button>
          <button className="btn btn-accent" disabled={text.trim().length < 80 || !s.settings.hasApiKey || Boolean(s.busy)} onClick={() => create(true)} title={s.settings.hasApiKey ? '' : 'Clé API requise'}>
            <Sparkles size={15} /> Analyser avec l’IA
          </button>
        </div>
      </div>
    </div>
  )
}

function OfferDetail({ offer }: { offer: Offer }) {
  const s = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [tailorId, setTailorId] = useState<string | null>(null)
  const [showText, setShowText] = useState(false)
  const a = useMemo(() => offer.analysis ?? localAnalyze(offer.text), [offer])

  const rows = useMemo(
    () =>
      s.data.resumes
        .map((r) => ({ r, match: matchKeywords(r, a.keywords), score: analyze(r, { ...offer, analysis: a }).score }))
        .sort((x, y) => y.match.coverage - x.match.coverage),
    [s.data.resumes, offer, a]
  )
  useEffect(() => {
    setSelected(rows[0]?.r.id ?? null)
  }, [offer.id])
  const sel = rows.find((x) => x.r.id === selected)
  const tailorResume = s.data.resumes.find((r) => r.id === tailorId)

  const reanalyze = async () => {
    const ai = await s.run('Analyse de l’offre par l’IA…', () => window.cvgen.ai.analyzeOffer(offer.text))
    if (ai) s.saveOffer({ ...offer, analysis: ai, company: offer.company || ai.company })
  }

  const grouped = (['hard', 'tool', 'domain', 'certification', 'language', 'soft'] as const)
    .map((c) => ({ c, items: a.keywords.filter((k) => k.category === c).sort((x, y) => y.importance - x.importance) }))
    .filter((g) => g.items.length)

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="mono-label">
            offre · {timeAgo(offer.createdAt)}
          </div>
          <input
            className="title-input"
            style={{ fontSize: 26, fontWeight: 680, letterSpacing: '-0.02em', width: '100%', padding: '2px 6px', marginLeft: -6 }}
            value={offer.title}
            onChange={(e) => s.saveOffer({ ...offer, title: e.target.value })}
          />
          <input
            className="title-input"
            style={{ fontSize: 15, fontWeight: 450, color: 'var(--text-2)', width: '100%', marginLeft: -6 }}
            value={offer.company}
            placeholder="Entreprise"
            onChange={(e) => s.saveOffer({ ...offer, company: e.target.value })}
          />
        </div>
        <button className="btn btn-soft btn-sm" onClick={() => setShowText(!showText)}>
          {showText ? 'Masquer' : 'Voir'} le texte
        </button>
        {s.settings.hasApiKey && (
          <button className="btn btn-ai btn-sm" onClick={reanalyze} disabled={Boolean(s.busy)}>
            <RefreshCw size={14} /> {a.source === 'ai' ? 'Réanalyser' : 'Analyser avec l’IA'}
          </button>
        )}
        <button
          className="icon-btn"
          title="Supprimer l’offre"
          onClick={() => {
            actions.deleteOffer(offer.id)
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {showText && <pre className="plain-text" style={{ fontFamily: 'var(--font)', fontSize: 13.5, maxHeight: 360, overflow: 'auto' }}>{offer.text}</pre>}

      <div className="kv">
        <div>
          <span>niveau</span>
          <strong>{a.seniority || '—'}</strong>
        </div>
        <div>
          <span>contrat</span>
          <strong>{a.contract || '—'}</strong>
        </div>
        <div>
          <span>lieu</span>
          <strong>{a.location || '—'}</strong>
        </div>
        <div>
          <span>analyse</span>
          <strong>{a.source === 'ai' ? 'IA' : 'Locale'}</strong>
        </div>
      </div>
      {a.summary && <p className="text-2" style={{ margin: 0 }}>{a.summary}</p>}

      <div className="panel">
        <div className="panel-head">
          <div className="panel-icon">
            <Sparkles size={16} />
          </div>
          <h3>Mots-clés recherchés par l’ATS</h3>
          <span className="mono-label" style={{ marginLeft: 'auto' }}>
            ●●● prioritaire · ● apprécié
          </span>
        </div>
        <div className="stack" style={{ gap: 14 }}>
          {grouped.map((g) => (
            <div key={g.c}>
              <div className="label" style={{ marginBottom: 6 }}>
                {CAT[g.c]}
              </div>
              <div className="chips" style={{ gap: 6 }}>
                {g.items.map((k) => {
                  const has = sel ? sel.match.found.some((f) => f.term === k.term) : null
                  return (
                    <span key={k.term} className={`tag ${has == null ? (k.importance === 3 ? 'accent' : '') : has ? 'ok' : 'miss'}`}>
                      {k.term} <span className="imp">{'●'.repeat(k.importance)}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {(a.mustHaves.length > 0 || a.niceToHaves.length > 0) && (
          <div className="grid-2" style={{ marginTop: 18 }}>
            {a.mustHaves.length > 0 && (
              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Exigé
                </div>
                <ul className="clean">
                  {a.mustHaves.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {a.niceToHaves.length > 0 && (
              <div>
                <div className="label" style={{ marginBottom: 6 }}>
                  Apprécié
                </div>
                <ul className="clean">
                  {a.niceToHaves.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-icon">
            <Target size={16} />
          </div>
          <h3>Correspondance avec vos CV</h3>
        </div>
        {rows.length === 0 ? (
          <Empty icon={<FileText size={24} />} title="Aucun CV">
            Créez ou importez un CV pour mesurer sa correspondance.
          </Empty>
        ) : (
          <div className="match-grid">
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="match-table">
                <thead>
                  <tr>
                    <th>CV</th>
                    <th>Mots-clés</th>
                    <th>Score ATS</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ r, match, score }) => (
                    <tr key={r.id} className={selected === r.id ? 'on' : ''} onClick={() => setSelected(r.id)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 550 }}>{r.title}</td>
                      <td>
                        <ScorePill score={match.coverage} label="" />
                      </td>
                      <td>
                        <ScorePill score={score} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ai btn-sm" onClick={(e) => (e.stopPropagation(), setTailorId(r.id))} disabled={!s.settings.hasApiKey} title={s.settings.hasApiKey ? '' : 'Clé API requise'}>
                          <Sparkles size={14} /> Adapter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sel && (
              <div className="ats-score-card">
                <div className="row" style={{ gap: 14 }}>
                  <ScoreRing score={sel.match.coverage} size={78} stroke={7} label="match" />
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sel.r.title}</strong>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {sel.match.found.length} / {a.keywords.length} mots-clés présents
                    </span>
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    s.updateResume(sel.r.id, (r) => void (r.offerId = offer.id))
                    s.go({ name: 'editor', id: sel.r.id })
                  }}
                >
                  <FileText size={14} /> Ouvrir avec cette offre
                </button>
                <button className="btn btn-soft btn-sm" onClick={() => s.go({ name: 'letters', id: `new:${sel.r.id}:${offer.id}` })}>
                  <Mail size={14} /> Lettre de motivation
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {tailorResume && <TailorModal resume={tailorResume} offer={{ ...offer, analysis: a }} onClose={() => setTailorId(null)} />}
    </div>
  )
}

export default function Offers({ id }: { id?: string }) {
  const s = useStore()
  const offers = s.data.offers
  const current = id && id !== 'new' ? offers.find((o) => o.id === id) : undefined
  const creating = id === 'new' || (!current && offers.length === 0)

  return (
    <div className="page">
      <div className="page-head">
        <h1>
          Offres & matching <span className="count">{offers.length} offres</span>
        </h1>
        <div className="actions">
          <button className="btn btn-accent" onClick={() => s.go({ name: 'offers', id: 'new' })}>
            <Plus size={16} /> Nouvelle offre
          </button>
        </div>
      </div>
      <div className="split">
        <div className="offer-list">
          <div className="mono-label" style={{ padding: '0 4px 4px' }}>
            offres analysées
          </div>
          {offers.length === 0 && (
            <Empty icon={<BriefcaseBusiness size={24} />} title="Aucune offre">
              Collez votre première offre à droite.
            </Empty>
          )}
          {offers.map((o) => (
            <div key={o.id} className="list-wrap">
              <button className={`offer-item ${current?.id === o.id ? 'on' : ''}`} onClick={() => s.go({ name: 'offers', id: o.id })}>
              <strong>{o.title || 'Offre sans titre'}</strong>
              <span>
                {o.company ? `${o.company} · ` : ''}
                {o.analysis?.keywords.length ?? 0} mots-clés · {timeAgo(o.createdAt)}
              </span>
            </button>
              <button className="icon-btn sm item-del" title="Supprimer l’offre" onClick={() => actions.deleteOffer(o.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div>
          {creating ? (
            <NewOffer onCreated={(oid) => s.go({ name: 'offers', id: oid })} />
          ) : current ? (
            <OfferDetail key={current.id} offer={current} />
          ) : (
            <Empty icon={<Target size={26} />} title="Sélectionnez une offre">
              ou créez-en une nouvelle.
            </Empty>
          )}
        </div>
      </div>
    </div>
  )
}
