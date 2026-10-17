import { ArrowRight, ArrowUp, FilePlus2, FileUp, PenLine, Plus, Sparkles, Target, Trash2, UserRound } from 'lucide-react'
import { profileCompletion } from '../lib/profile'
import { useMemo, useState } from 'react'
import { PaperThumb } from '../components/PaperThumb'
import { Empty, timeAgo } from '../components/ui'
import { analyze, scoreColor } from '../lib/ats'
import { actions } from '../lib/actions'
import { useStore } from '../store'
import { getTemplate } from '../templates/registry'

const ASK_CHIPS = ['Améliorer mon profil', 'Explique mon score ATS', 'Mots-clés manquants', 'Idées de réalisations', 'Préparer l’entretien']

const KIND_LABEL: Record<string, string> = {
  create: 'Création',
  export: 'Export',
  tailor: 'Adaptation IA',
  analyze: 'Analyse d’offre',
  import: 'Import',
  letter: 'Lettre'
}

export default function Dashboard() {
  const s = useStore()
  const { resumes, offers, activity } = s.data
  const [ask, setAsk] = useState('')

  const reports = useMemo(
    () =>
      new Map(
        resumes.map((r) => {
          const offer = r.offerId ? offers.find((o) => o.id === r.offerId) : undefined
          return [r.id, { report: analyze(r, offer), offer }]
        })
      ),
    [resumes, offers]
  )
  const sorted = useMemo(() => [...resumes].sort((a, b) => b.updatedAt - a.updatedAt), [resumes])
  // CV mis en avant : le plus récemment modifié.
  const focus = sorted[0]
  const focusData = focus ? reports.get(focus.id) : undefined
  const report = focusData?.report
  const missing = report?.match?.missing ?? []
  const avg = resumes.length ? Math.round([...reports.values()].reduce((a, b) => a + b.report.score, 0) / resumes.length) : 0

  const firstName = s.settings.userName.split(' ')[0] || resumes[0]?.basics.firstName || ''
  const photo = resumes.find((r) => r.basics.photo)?.basics.photo
  const initials = (s.settings.userName || `${resumes[0]?.basics.firstName ?? ''} ${resumes[0]?.basics.lastName ?? ''}`)
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sendAsk = (text: string) => {
    if (!text.trim()) return
    s.setAssistant(true)
    setAsk('')
    setTimeout(() => window.dispatchEvent(new CustomEvent('cvgen:ask', { detail: text })), 60)
  }

  return (
    <div className="page home">
      {/* ---------- Accroche ---------- */}
      <section className="home-hero">
        <div className="home-top">
          {photo ? <img className="home-avatar" src={photo} alt="" /> : <div className="home-avatar">{initials || 'CV'}</div>}
          <button className="pill-label" onClick={() => s.go({ name: 'profile' })} title="Vos infos, saisies une fois, reprises par tous les modèles">
            <UserRound size={14} /> {s.data.profile ? `Mon profil · ${profileCompletion(s.data.profile).percent} %` : 'Créer mon profil'}
          </button>
          {!s.settings.hasApiKey && (
            <button className="pill-label" onClick={() => s.go({ name: 'settings' })} title="Activer l’IA">
              <Sparkles size={14} /> Activer l’IA
            </button>
          )}
        </div>
        {focus ? (
          <h1>
            Prêt à <em>postuler</em>
            {firstName ? `, ${firstName}` : ''}.
          </h1>
        ) : (
          <h1>
            Votre premier <em>CV</em> commence ici.
          </h1>
        )}
        {focus && report ? (
          <p className="lede">
            « {focus.title} » atteint <b>{report.score} / 100</b>.
            {focusData?.offer && missing.length > 0 ? (
              <>
                {' '}
                L’offre <b>{focusData.offer.title}</b> attend encore{' '}
                {missing
                  .slice(0, 3)
                  .map((k) => k.term)
                  .join(', ')}
                .
              </>
            ) : (
              !focusData?.offer && ' Liez-le à une offre pour mesurer la correspondance des mots-clés.'
            )}
          </p>
        ) : (
          <p className="lede">Partez de l’exemple, importez un CV existant (PDF, Word) ou commencez sur une page blanche. Chaque modèle se décline en version lisible par les ATS.</p>
        )}
        <div className="row wrap" style={{ marginTop: 22 }}>
          {focus ? (
            <>
              {focusData?.offer ? (
                <button className="btn btn-ink btn-lg" onClick={() => s.go({ name: 'editor', id: focus.id })}>
                  Adapter à l’offre <ArrowRight size={16} />
                </button>
              ) : (
                <button className="btn btn-ink btn-lg" onClick={() => s.go({ name: 'offers', id: 'new' })}>
                  Analyser une offre <ArrowRight size={16} />
                </button>
              )}
              <button className="btn btn-outline btn-lg" onClick={() => s.go({ name: 'editor', id: focus.id })}>
                <PenLine size={16} /> Ouvrir l’éditeur
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ink btn-lg" onClick={() => actions.newResume('atelier', true)}>
                Partir de l’exemple <ArrowRight size={16} />
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => s.go({ name: 'ats-scan' })}>
                Tester un CV PDF
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => s.go({ name: 'from-image' })}>
                Recréer depuis une image
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => actions.importResume()}>
                <FileUp size={16} /> Importer un CV
              </button>
            </>
          )}
        </div>
      </section>

      {/* ---------- Mes CV : carrousel de grandes cartes ---------- */}
      <section className="home-section">
        <div className="home-section-head">
          <span className="pill-label">Mes CV</span>
          <button className="link-muted" onClick={() => s.go({ name: 'resumes' })}>
            Tout voir <ArrowRight size={14} />
          </button>
        </div>
        <div className="carousel">
          {sorted.map((r) => {
            const d = reports.get(r.id)!
            const tpl = getTemplate(r.templateId)
            return (
              <div
                key={r.id}
                className="cv-card"
                role="button"
                tabIndex={0}
                onClick={() => s.go({ name: 'editor', id: r.id })}
                onKeyDown={(e) => e.key === 'Enter' && s.go({ name: 'editor', id: r.id })}
              >
                <div className="cv-card-visual">
                  <button
                    className="icon-btn card-del"
                    title="Supprimer ce CV"
                    onClick={(e) => {
                      e.stopPropagation()
                      actions.deleteResume(r.id)
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                  <div className="cv-card-paper">
                    <PaperThumb resume={r} />
                  </div>
                </div>
                <div className="cv-card-meta">
                  <div>
                    <strong>{r.title}</strong>
                    <span>modifié {timeAgo(r.updatedAt)}</span>
                  </div>
                  <div className="cv-card-tags">
                    <span className="mono-tag">{tpl.name}</span>
                    <span className="mono-tag" style={{ color: scoreColor(d.report.score) }}>
                      ATS {d.report.score}
                    </span>
                    {d.offer && <span className="mono-tag">{d.offer.company || 'Offre liée'}</span>}
                  </div>
                </div>
              </div>
            )
          })}
          <button className="cv-card cv-card-new" onClick={() => actions.newResume()}>
            <div className="cv-card-visual">
              <span className="plus-circle">
                <Plus size={22} />
              </span>
            </div>
            <div className="cv-card-meta">
              <div>
                <strong>Nouveau CV</strong>
                <span>ou partez d’un modèle</span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* ---------- Score et mots-clés ---------- */}
      <section className="home-split">
        <div className="home-score">
          <span className="pill-label">Score ATS</span>
          <div className="big">
            {report ? report.score : '00'}
            <small>/100</small>
          </div>
          <div className="bars">
            {(
              [
                ['Format', report?.format],
                ['Contenu', report?.content],
                ['Mots-clés', report?.keywords]
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="thin-bar">
                <span>{label}</span>
                <span className="t">
                  <i style={{ width: `${v ?? 0}%` }} />
                </span>
                <b>{v ?? '—'}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="home-keywords">
          <span className="pill-label">Mots-clés de l’offre</span>
          {report?.match ? (
            <>
              <p className="home-kw-title">
                {focusData?.offer?.title} — <em className="serif">{report.match.coverage} % couverts</em>
              </p>
              <div className="chips" style={{ gap: 6 }}>
                {report.match.found.slice(0, 10).map((k) => (
                  <span key={k.term} className="tag ok">
                    {k.term}
                  </span>
                ))}
                {report.match.missing.slice(0, 8).map((k) => (
                  <span key={k.term} className="tag miss">
                    {k.term}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <Empty icon={<Target size={24} />} title="Aucune offre liée">
              <button className="btn btn-ink btn-sm" style={{ marginTop: 10 }} onClick={() => s.go({ name: 'offers', id: 'new' })}>
                Analyser une offre
              </button>
            </Empty>
          )}
        </div>
      </section>

      {/* ---------- Assistant ---------- */}
      <section className="home-section">
        <div className="home-section-head">
          <span className="pill-label">Assistant IA</span>
          <span className="mono-label">Ctrl J</span>
        </div>
        <div className="assistant-bar">
          <Sparkles size={16} className="lead" />
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendAsk(ask)}
            placeholder="Demandez quelque chose : « réécris mon profil pour un poste d’artiste 3D »"
          />
          <button className="btn btn-ink btn-sm" onClick={() => sendAsk(ask)} disabled={!ask.trim()} aria-label="Envoyer">
            <ArrowUp size={15} />
          </button>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          {ASK_CHIPS.map((c) => (
            <button key={c} className="chip" onClick={() => sendAsk(c)}>
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- Activité : tableau à filets fins ---------- */}
      <section className="home-section">
        <div className="home-section-head">
          <h2 className="home-h2">
            Activité <em>récente</em>
          </h2>
          <span className="row" style={{ gap: 14 }}>
            <span className="mono-label">
              {resumes.length} CV · {offers.length} offres · moyenne {resumes.length ? avg : '—'}
            </span>
            {activity.length > 0 && (
              <button className="link-muted" onClick={() => s.clearActivity()}>
                <Trash2 size={13} /> Effacer
              </button>
            )}
          </span>
        </div>
        {activity.length === 0 ? (
          <Empty icon={<FilePlus2 size={22} />} title="Rien pour l’instant" />
        ) : (
          <div className="line-table">
            {activity.slice(0, 6).map((a) => (
              <div key={a.id} className="line-row">
                <span>{a.label}</span>
                <span className="muted">{KIND_LABEL[a.kind] ?? a.kind}</span>
                <span className="muted">{timeAgo(a.at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
