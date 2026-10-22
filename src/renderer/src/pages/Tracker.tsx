import { BarChart3, CalendarClock, Columns3, Copy, ExternalLink, FileText, Mail, MailCheck, Plus, Search, Settings2, Sparkles, Table2, Trash2, UserPlus, Wand2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppKind, AppStatus, Application, FollowUpRequest } from '../../../shared/types'
import { AutoTextarea, Empty, ScorePill, timeAgo } from '../components/ui'
import { Select } from '../components/Select'
import { analyze, localAnalyze, matchKeywords } from '../lib/ats'
import { guidedFollowUp, splitSubject } from '../lib/followUpDraft'
import {
  CONTRACTS,
  FOLLOW_UP_DAYS,
  KINDS,
  PRIORITY_LABEL,
  STATUSES,
  addDays,
  addNote,
  agenda,
  followUpState,
  kindLabel,
  markFollowedUp,
  newApplication,
  shortDate,
  statusLabel,
  today,
  trackerStats,
  withStatus
} from '../lib/tracker'
import { uid } from '../lib/sample'
import { useStore } from '../store'

const SOURCES = ['LinkedIn', 'Indeed', 'Welcome to the Jungle', 'Site de l’entreprise', 'France Travail', 'APEC', 'HelloWork', 'Candidature spontanée', 'Réseau / cooptation', 'École / forum']

type View = 'kanban' | 'table' | 'stats'
type ColKey = 'priority' | 'title' | 'company' | 'kind' | 'status' | 'contract' | 'location' | 'source' | 'appliedAt' | 'followUpAt' | 'interviewAt' | 'contact' | 'notes' | 'score'

const COLS: { key: ColKey; label: string; fixed?: boolean }[] = [
  { key: 'priority', label: 'Priorité' },
  { key: 'title', label: 'Poste', fixed: true },
  { key: 'company', label: 'Entreprise' },
  { key: 'kind', label: 'Type' },
  { key: 'status', label: 'Statut' },
  { key: 'contract', label: 'Contrat' },
  { key: 'location', label: 'Localisation' },
  { key: 'source', label: 'Source' },
  { key: 'appliedAt', label: 'Candidature' },
  { key: 'followUpAt', label: 'Relance' },
  { key: 'interviewAt', label: 'Entretien' },
  { key: 'contact', label: 'Contact' },
  { key: 'notes', label: 'Notes perso' },
  { key: 'score', label: 'Match' }
]

function readPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function writePref(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* préférence non mémorisée */
  }
}

/** Correspondance CV / offre liés (mots-clés couverts), si les deux sont renseignés. */
function useMatch() {
  const resumes = useStore((s) => s.data.resumes)
  const offers = useStore((s) => s.data.offers)
  return useMemo(() => {
    const cache = new Map<string, number | undefined>()
    return (a: Application) => {
      const key = `${a.resumeId}|${a.offerId}`
      if (cache.has(key)) return cache.get(key)
      const r = resumes.find((x) => x.id === a.resumeId)
      const o = offers.find((x) => x.id === a.offerId)
      const v = r && o ? matchKeywords(r, (o.analysis ?? localAnalyze(o.text)).keywords).coverage : undefined
      cache.set(key, v)
      return v
    }
  }, [resumes, offers])
}

function Priority({ p }: { p: 1 | 2 | 3 }) {
  return (
    <span className={`tk-prio p${p}`} title={`Priorité ${PRIORITY_LABEL[p].toLowerCase()}`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= p ? 'on' : ''} />
      ))}
    </span>
  )
}

function FollowBadge({ a }: { a: Application }) {
  const st = followUpState(a)
  if (st) return <span className={`tk-badge ${st}`}>{st === 'late' ? `Relance en retard · ${shortDate(a.followUpAt)}` : st === 'today' ? 'Relancer aujourd’hui' : `Relance le ${shortDate(a.followUpAt)}`}</span>
  if (a.interviewAt && a.status === 'interview') return <span className="tk-badge interview">Entretien · {shortDate(a.interviewAt)}</span>
  return null
}

// ---------- Kanban ----------

function Kanban({ apps, open }: { apps: Application[]; open: (id: string) => void }) {
  const save = useStore((s) => s.saveApplication)
  const match = useMatch()
  const [over, setOver] = useState<AppStatus | null>(null)
  const drop = (status: AppStatus, id: string) => {
    const a = apps.find((x) => x.id === id)
    if (a && a.status !== status) save(withStatus(a, status))
    setOver(null)
  }
  return (
    <div className="tk-board">
      {STATUSES.map((col) => {
        const list = apps.filter((a) => a.status === col.id).sort((x, y) => y.priority - x.priority || y.updatedAt - x.updatedAt)
        return (
          <section
            key={col.id}
            className={`tk-col ${over === col.id ? 'over' : ''}`}
            data-status={col.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.id)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
            }}
            onDrop={(e) => drop(col.id, e.dataTransfer.getData('text/cvgen-app'))}
          >
            <header title={col.hint}>
              <span>{col.label}</span>
              <b>{list.length}</b>
            </header>
            <div className="tk-col-body">
              {list.map((a) => {
                const m = match(a)
                return (
                  <article
                    key={a.id}
                    className="tk-card"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/cvgen-app', a.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => open(a.id)}
                  >
                    <div className="tk-card-top">
                      <span className="tag">{kindLabel(a.kind)}</span>
                      <Priority p={a.priority} />
                    </div>
                    <strong>{a.title || 'Sans intitulé'}</strong>
                    <span className="tk-card-sub">{[a.company, a.location].filter(Boolean).join(' · ') || ' '}</span>
                    <div className="tk-card-foot">
                      <FollowBadge a={a} />
                      {m != null && <ScorePill score={m} label="match" />}
                    </div>
                  </article>
                )
              })}
              {list.length === 0 && <div className="tk-col-empty">Glissez une carte ici</div>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ---------- Tableau ----------

function Cell({ value, onChange, type = 'text', placeholder, list }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; list?: string }) {
  return <input className="tk-cell" type={type} value={value} placeholder={placeholder} list={list} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()} />
}

function TableView({ apps, open }: { apps: Application[]; open: (id: string) => void }) {
  const save = useStore((s) => s.saveApplication)
  const match = useMatch()
  const [cols, setCols] = useState<ColKey[]>(() => readPref('cvgen.tracker.cols', COLS.map((c) => c.key)))
  const [sort, setSort] = useState<{ key: ColKey; dir: 1 | -1 }>(() => readPref('cvgen.tracker.sort', { key: 'appliedAt', dir: -1 }))
  const [colMenu, setColMenu] = useState(false)
  const up = (a: Application, patch: Partial<Application>) => save({ ...a, ...patch })
  const shown = COLS.filter((c) => c.fixed || cols.includes(c.key))

  const value = (a: Application, k: ColKey): string | number => {
    switch (k) {
      case 'priority':
        return a.priority
      case 'status':
        return STATUSES.findIndex((s) => s.id === a.status)
      case 'contact':
        return a.contacts[0]?.name ?? ''
      case 'score':
        return match(a) ?? -1
      case 'kind':
        return kindLabel(a.kind)
      default:
        return (a[k as keyof Application] as string | undefined) ?? ''
    }
  }
  const sorted = [...apps].sort((x, y) => {
    const a = value(x, sort.key)
    const b = value(y, sort.key)
    // Valeurs vides toujours en bas.
    if (a === '' || a === -1) return 1
    if (b === '' || b === -1) return -1
    return (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'fr')) * sort.dir
  })
  const toggleSort = (key: ColKey) => {
    const next = { key, dir: (sort.key === key ? -sort.dir : 1) as 1 | -1 }
    setSort(next)
    writePref('cvgen.tracker.sort', next)
  }
  const toggleCol = (key: ColKey) => {
    const next = cols.includes(key) ? cols.filter((c) => c !== key) : [...cols, key]
    setCols(next)
    writePref('cvgen.tracker.cols', next)
  }

  const render = (a: Application, k: ColKey): ReactNode => {
    switch (k) {
      case 'priority':
        return (
          <Select value={String(a.priority)} onChange={(e) => up(a, { priority: Number(e.target.value) as 1 | 2 | 3 })} aria-label="Priorité">
            <option value="3">Haute</option>
            <option value="2">Normale</option>
            <option value="1">Basse</option>
          </Select>
        )
      case 'title':
        return (
          <button className="tk-title-link" onClick={() => open(a.id)} title="Ouvrir la fiche">
            {a.title || 'Sans intitulé'}
          </button>
        )
      case 'company':
        return <Cell value={a.company} onChange={(v) => up(a, { company: v })} placeholder="Entreprise" />
      case 'kind':
        return (
          <Select value={a.kind} onChange={(e) => up(a, { kind: e.target.value as AppKind })} aria-label="Type">
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </Select>
        )
      case 'status':
        return (
          <Select value={a.status} onChange={(e) => save(withStatus(a, e.target.value as AppStatus))} aria-label="Statut">
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        )
      case 'contract':
        return <Cell value={a.contract} onChange={(v) => up(a, { contract: v })} list="tk-contracts" placeholder="Contrat" />
      case 'location':
        return <Cell value={a.location} onChange={(v) => up(a, { location: v })} placeholder="Ville" />
      case 'source':
        return <Cell value={a.source} onChange={(v) => up(a, { source: v })} list="tk-sources" placeholder="Source" />
      case 'appliedAt':
        return <Cell type="date" value={a.appliedAt ?? ''} onChange={(v) => up(a, { appliedAt: v || undefined, ...(v && !a.followUpAt && a.status !== 'todo' ? { followUpAt: addDays(v, FOLLOW_UP_DAYS) } : {}) })} />
      case 'followUpAt':
        return (
          <div className={`tk-date ${followUpState(a) ?? ''}`}>
            <Cell type="date" value={a.followUpAt ?? ''} onChange={(v) => up(a, { followUpAt: v || undefined })} />
          </div>
        )
      case 'interviewAt':
        return <Cell type="datetime-local" value={a.interviewAt ?? ''} onChange={(v) => up(a, { interviewAt: v || undefined })} />
      case 'contact': {
        const c = a.contacts[0]
        return (
          <button className="tk-title-link sub" onClick={() => open(a.id)} title={c?.email || 'Ajouter un contact'}>
            {c ? c.name || c.email : '+ Contact'}
          </button>
        )
      }
      case 'notes':
        return <Cell value={a.notes.split('\n')[0]} onChange={(v) => up(a, { notes: [v, ...a.notes.split('\n').slice(1)].join('\n') })} placeholder="Notes" />
      case 'score': {
        const m = match(a)
        return m == null ? <span className="muted">-</span> : <ScorePill score={m} label="" />
      }
    }
  }

  return (
    <div className="tk-table-wrap card">
      <div className="tk-table-tools">
        <span className="mono-label">{apps.length} candidatures · cliquez un intitulé pour la fiche complète</span>
        <div style={{ position: 'relative' }}>
          <button className="btn btn-soft btn-sm" onClick={() => setColMenu(!colMenu)}>
            <Settings2 size={14} /> Colonnes
          </button>
          {colMenu && (
            <div className="tk-colmenu" onMouseLeave={() => setColMenu(false)}>
              {COLS.filter((c) => !c.fixed).map((c) => (
                <label key={c.key} className="check">
                  <input type="checkbox" checked={cols.includes(c.key)} onChange={() => toggleCol(c.key)} /> {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="tk-table-scroll">
        <table className="tk-table">
          <thead>
            <tr>
              {shown.map((c) => (
                <th key={c.key} className={`c-${c.key}`} onClick={() => toggleSort(c.key)}>
                  {c.label}
                  {sort.key === c.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} className={`st-${a.status}`}>
                {shown.map((c) => (
                  <td key={c.key} className={`c-${c.key}`}>
                    {render(a, c.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- Statistiques ----------

function StatsView({ apps }: { apps: Application[] }) {
  const st = useMemo(() => trackerStats(apps), [apps])
  const max = Math.max(1, ...Object.values(st.byStatus))
  const kpis: [string, string, string?][] = [
    ['Candidatures', String(st.total), `${st.sent} envoyées`],
    ['Taux de réponse', `${st.responseRate} %`, `${st.responses} réponses`],
    ['Entretiens', String(st.interviews), `${st.interviewRate} % des envois`],
    ['Offres reçues', String(st.offers)],
    ['Délai de réponse', st.avgDelay == null ? '-' : `${st.avgDelay} j`, 'moyenne après envoi']
  ]
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="tk-kpis">
        {kpis.map(([l, v, d]) => (
          <div key={l} className="tk-kpi">
            <span className="mono-label">{l}</span>
            <strong>{v}</strong>
            {d && <small>{d}</small>}
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Par étape</h3>
          </div>
          <div className="tk-bars">
            {STATUSES.map((s) => (
              <div key={s.id} className="tk-bar">
                <span>{s.label}</span>
                <i style={{ width: `${(st.byStatus[s.id] / max) * 100}%` }} className={`st-${s.id}`} />
                <b>{st.byStatus[s.id]}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <h3>Par type de recherche</h3>
          </div>
          {st.byKind.length === 0 ? (
            <p className="muted">Aucune candidature.</p>
          ) : (
            <table className="match-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Envoyées</th>
                  <th>Réponses</th>
                  <th>Entretiens</th>
                </tr>
              </thead>
              <tbody>
                {st.byKind.map((k) => (
                  <tr key={k.id}>
                    <td>{k.label}</td>
                    <td>
                      {k.sent} / {k.total}
                    </td>
                    <td>{k.responseRate} %</td>
                    <td>{k.interviews}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <h3>Par source</h3>
          <span className="mono-label" style={{ marginLeft: 'auto' }}>
            où vos candidatures obtiennent des réponses
          </span>
        </div>
        {st.bySource.length === 0 ? (
          <p className="muted">Les sources apparaissent dès qu’une candidature est envoyée.</p>
        ) : (
          <table className="match-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Envoyées</th>
                <th>Taux de réponse</th>
                <th>Entretiens</th>
              </tr>
            </thead>
            <tbody>
              {st.bySource.map((s) => (
                <tr key={s.source}>
                  <td>{s.source}</td>
                  <td>{s.sent}</td>
                  <td>{s.responseRate} %</td>
                  <td>{s.interviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ---------- Relance ----------

function FollowUpComposer({ a, up }: { a: Application; up: (patch: Partial<Application>) => void }) {
  const s = useStore()
  const resume = s.data.resumes.find((r) => r.id === a.resumeId)
  const offer = s.data.offers.find((o) => o.id === a.offerId)
  const contact = a.contacts.find((c) => c.email) ?? a.contacts[0]
  const [step, setStep] = useState<FollowUpRequest['step']>(a.status === 'interview' ? 'apres-entretien' : a.status === 'followup' ? 'relance2' : 'relance')
  const [channel, setChannel] = useState<FollowUpRequest['channel']>(contact?.email ? 'email' : 'linkedin')
  const [copied, setCopied] = useState(false)
  const text = a.followUpDraft ?? ''
  const hasAi = s.settings.hasApiKey

  const req = (): FollowUpRequest => ({
    channel,
    step,
    kind: a.kind,
    title: a.title,
    company: a.company,
    contactName: contact?.name ?? '',
    appliedAt: a.appliedAt,
    interviewAt: a.interviewAt,
    motivation: a.motivation ?? '',
    lang: resume?.lang ?? 'fr',
    offerText: offer?.text
  })
  const assets = () => {
    if (!resume) return []
    const kws = offer ? (offer.analysis ?? localAnalyze(offer.text)).keywords : []
    const found = kws.length ? matchKeywords(resume, kws).found.sort((x, y) => y.importance - x.importance).map((k) => k.term) : []
    return found.length ? found : resume.skills.flatMap((g) => g.items).slice(0, 3)
  }
  const guided = () => up({ followUpDraft: guidedFollowUp(req(), resume, assets()) })
  const ai = async (mode: 'fix' | 'draft') => {
    const out = await s.run(mode === 'fix' ? 'Correction du message…' : 'Rédaction d’un premier jet…', () => window.cvgen.ai.followUp({ ...req(), ...(mode === 'fix' ? { draft: text } : {}) }, resume))
    if (out) up({ followUpDraft: out })
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* presse-papiers indisponible */
    }
  }
  const mail = () => {
    const { subject, body } = splitSubject(text)
    const to = contact?.email ?? ''
    void window.cvgen.openExternal(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }
  const ideal = a.appliedAt ? `${shortDate(addDays(a.appliedAt, 6))} ou ${shortDate(addDays(a.appliedAt, 7))}` : ''

  return (
    <div className="tk-compose">
      <p className="tk-reco">
        <b>Recommandé : écrivez la relance vous-même.</b> Un message personnel se remarque. L’IA peut corriger votre texte ou proposer un premier jet à réécrire.
        {ideal && step === 'relance' && <> Relance idéale : 6 à 7 jours après l’envoi, soit le {ideal.replace(/\.$/, '')}.</>}
      </p>
      <div className="row wrap" style={{ gap: 8 }}>
        <div className="seg">
          {(
            [
              ['relance', '1re relance'],
              ['relance2', '2e relance'],
              ['apres-entretien', 'Après entretien']
            ] as const
          ).map(([v, l]) => (
            <button key={v} className={step === v ? 'on' : ''} onClick={() => setStep(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="seg">
          <button className={channel === 'email' ? 'on' : ''} onClick={() => setChannel('email')}>
            E-mail
          </button>
          <button className={channel === 'linkedin' ? 'on' : ''} onClick={() => setChannel('linkedin')}>
            LinkedIn
          </button>
        </div>
      </div>
      <AutoTextarea
        className="textarea"
        style={{ minHeight: 170 }}
        value={text}
        placeholder={`Écrivez votre message ici.${channel === 'email' ? ' Première ligne « Objet : … » pour l’e-mail.' : ''} Ou partez de la trame guidée.`}
        onChange={(e) => up({ followUpDraft: e.target.value })}
      />
      <div className="row wrap" style={{ gap: 8 }}>
        <button className="btn btn-soft btn-sm" onClick={guided} title="Trame à compléter avec vos mots, sans IA">
          <FileText size={14} /> Trame guidée
        </button>
        <button className="btn btn-ai btn-sm" disabled={!hasAi || text.trim().length < 30 || Boolean(s.busy)} onClick={() => ai('fix')} title={hasAi ? 'Corrige l’orthographe et le style en gardant vos mots' : 'Clé IA requise'}>
          <Wand2 size={14} /> Corriger mon message
        </button>
        <button className="btn btn-ghost btn-sm" disabled={!hasAi || Boolean(s.busy)} onClick={() => ai('draft')} title={hasAi ? 'Premier jet à réécrire avec vos mots' : 'Clé IA requise'}>
          <Sparkles size={14} /> Premier jet IA
        </button>
        <div style={{ flex: 1 }} />
        <button className="icon-btn sm" disabled={!text} onClick={copy} title="Copier">
          {copied ? <MailCheck size={14} /> : <Copy size={14} />}
        </button>
        {channel === 'email' && (
          <button className="btn btn-outline btn-sm" disabled={!text} onClick={mail} title={contact?.email ? `Ouvrir un e-mail à ${contact.email}` : 'Ajoutez l’e-mail du contact pour le préremplir'}>
            <Mail size={14} /> Ouvrir l’e-mail
          </button>
        )}
      </div>
      {!a.motivation?.trim() && <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Astuce : remplissez « Pourquoi ce {kindLabel(a.kind).toLowerCase()} ? » ci-dessus, la trame et l’IA reprennent vos mots.</p>}
    </div>
  )
}

// ---------- Fiche ----------

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="tk-sec">
      <div className="tk-sec-head">
        <h4>{title}</h4>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Drawer({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore()
  const a = (s.data.applications ?? []).find((x) => x.id === id)
  const [note, setNote] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  if (!a) return null
  const up = (patch: Partial<Application>) => s.saveApplication({ ...a, ...patch })
  const kind = KINDS.find((k) => k.id === a.kind)!
  const resume = s.data.resumes.find((r) => r.id === a.resumeId)
  const offer = s.data.offers.find((o) => o.id === a.offerId)
  const letters = [...s.data.letters].sort((x, y) => Number(y.offerId === a.offerId) - Number(x.offerId === a.offerId))
  const letter = s.data.letters.find((l) => l.id === a.letterId)
  const ats = resume ? analyze(resume, offer).score : undefined
  const cover = resume && offer ? matchKeywords(resume, (offer.analysis ?? localAnalyze(offer.text)).keywords).coverage : undefined
  const remove = () => {
    onClose()
    s.withUndo(`Candidature « ${a.title || 'sans titre'} » supprimée`, () => s.deleteApplication(a.id))
  }
  const setContact = (cid: string, patch: Partial<Application['contacts'][number]>) => up({ contacts: a.contacts.map((c) => (c.id === cid ? { ...c, ...patch } : c)) })

  return (
    <div className="overlay tk-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="tk-drawer" ref={ref} role="dialog" aria-modal="true" aria-label="Fiche de candidature">
        <div className="tk-drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono-label">
              {kind.label} · ajoutée {timeAgo(a.createdAt)}
            </div>
            <input className="title-input tk-h1" value={a.title} placeholder="Intitulé du poste, du stage ou de la mission" onChange={(e) => up({ title: e.target.value })} />
            <input className="title-input tk-h2" value={a.company} placeholder="Entreprise" onChange={(e) => up({ company: e.target.value })} />
          </div>
          <button className="icon-btn" title="Supprimer" onClick={remove}>
            <Trash2 size={16} />
          </button>
          <button className="icon-btn" title="Fermer (Échap)" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="tk-drawer-body">
          <div className="row wrap" style={{ gap: 8 }}>
            <div className="seg">
              {KINDS.map((k) => (
                <button key={k.id} className={a.kind === k.id ? 'on' : ''} onClick={() => up({ kind: k.id, contract: a.contract && a.contract !== kind.contract ? a.contract : k.contract })}>
                  {k.label}
                </button>
              ))}
            </div>
            <div className="seg">
              {([3, 2, 1] as const).map((p) => (
                <button key={p} className={a.priority === p ? 'on' : ''} onClick={() => up({ priority: p })} title={`Priorité ${PRIORITY_LABEL[p].toLowerCase()}`}>
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="tk-steps">
            {STATUSES.map((st) => (
              <button key={st.id} className={`tk-step st-${st.id} ${a.status === st.id ? 'on' : ''}`} onClick={() => s.saveApplication(withStatus(a, st.id))} title={st.hint}>
                {st.label}
              </button>
            ))}
          </div>

          <div className="grid-2">
            <label className="field">
              <span>Contrat</span>
              <input className="input" list="tk-contracts" value={a.contract} onChange={(e) => up({ contract: e.target.value })} />
            </label>
            <label className="field">
              <span>Localisation</span>
              <input className="input" value={a.location} placeholder="Ville, télétravail…" onChange={(e) => up({ location: e.target.value })} />
            </label>
            <label className="field">
              <span>Source</span>
              <input className="input" list="tk-sources" value={a.source} placeholder="LinkedIn, site de l’entreprise…" onChange={(e) => up({ source: e.target.value })} />
            </label>
            <label className="field">
              <span>Lien de l’annonce</span>
              <div className="row" style={{ gap: 6 }}>
                <input className="input" value={a.url} placeholder="https://…" onChange={(e) => up({ url: e.target.value })} />
                {/^https?:\/\//.test(a.url) && (
                  <button className="icon-btn" title="Ouvrir l’annonce" onClick={() => window.cvgen.openExternal(a.url)}>
                    <ExternalLink size={15} />
                  </button>
                )}
              </div>
            </label>
          </div>

          <Section title="Dates">
            <div className="tk-dates">
              <label className="field">
                <span>Candidature envoyée</span>
                <input className="input" type="date" value={a.appliedAt ?? ''} onChange={(e) => up({ appliedAt: e.target.value || undefined, ...(e.target.value && a.status !== 'todo' ? { followUpAt: addDays(e.target.value, FOLLOW_UP_DAYS) } : {}) })} />
              </label>
              <label className="field">
                <span>Relance prévue</span>
                <input className={`input tk-date ${followUpState(a) ?? ''}`} type="date" value={a.followUpAt ?? ''} onChange={(e) => up({ followUpAt: e.target.value || undefined })} />
              </label>
              <label className="field">
                <span>Entretien</span>
                <input className="input" type="datetime-local" value={a.interviewAt ?? ''} onChange={(e) => up({ ...(e.target.value && ['todo', 'applied', 'followup'].includes(a.status) ? withStatus(a, 'interview') : {}), interviewAt: e.target.value || undefined })} />
              </label>
            </div>
            {['applied', 'followup'].includes(a.status) && (
              <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => s.saveApplication(markFollowedUp(a))}>
                <CalendarClock size={14} /> J’ai relancé aujourd’hui
              </button>
            )}
          </Section>

          <Section title={`Détails ${kind.label.toLowerCase()}`}>
            <div className="grid-2">
              {kind.fields.map((f) => (
                <label key={f.key} className="field">
                  <span>{f.label}</span>
                  <input className="input" type={f.type ?? 'text'} value={a.details[f.key] ?? ''} placeholder={f.ph} onChange={(e) => up({ details: { ...a.details, [f.key]: e.target.value } })} />
                </label>
              ))}
            </div>
          </Section>

          <Section title="Documents">
            <div className="tk-docs">
              <div className="tk-doc">
                <span className="label">Offre</span>
                <Select value={a.offerId ?? ''} onChange={(e) => up({ offerId: e.target.value || undefined })}>
                  <option value="">Aucune</option>
                  {s.data.offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                      {o.company ? ` · ${o.company}` : ''}
                    </option>
                  ))}
                </Select>
                {offer && (
                  <button className="btn btn-ghost btn-sm" onClick={() => s.go({ name: 'offers', id: offer.id })}>
                    Ouvrir
                  </button>
                )}
              </div>
              <div className="tk-doc">
                <span className="label">CV envoyé</span>
                <Select value={a.resumeId ?? ''} onChange={(e) => up({ resumeId: e.target.value || undefined })}>
                  <option value="">Aucun</option>
                  {s.data.resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </Select>
                {resume && (
                  <button className="btn btn-ghost btn-sm" onClick={() => s.go({ name: 'editor', id: resume.id })}>
                    Ouvrir
                  </button>
                )}
              </div>
              <div className="tk-doc">
                <span className="label">Lettre</span>
                <Select value={a.letterId ?? ''} onChange={(e) => up({ letterId: e.target.value || undefined })}>
                  <option value="">Aucune</option>
                  {letters.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </Select>
                {letter ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => s.go({ name: 'letters', id: letter.id })}>
                    Ouvrir
                  </button>
                ) : (
                  resume && (
                    <button className="btn btn-ghost btn-sm" onClick={() => s.go({ name: 'letters', id: `new:${resume.id}:${a.offerId ?? ''}` })}>
                      Rédiger
                    </button>
                  )
                )}
              </div>
              {(ats != null || cover != null) && (
                <div className="row" style={{ gap: 8 }}>
                  {ats != null && <ScorePill score={ats} />}
                  {cover != null && <ScorePill score={cover} label="match" />}
                </div>
              )}
            </div>
          </Section>

          <Section title={`Pourquoi ce ${kind.label.toLowerCase()} ?`}>
            <AutoTextarea
              className="textarea"
              style={{ minHeight: 70 }}
              value={a.motivation ?? ''}
              placeholder="Avec vos mots : ce qui vous attire dans l’entreprise, les missions, ce que vous voulez apprendre ou apporter. Repris dans les relances."
              onChange={(e) => up({ motivation: e.target.value })}
            />
          </Section>

          <Section title="Message de relance">
            <FollowUpComposer a={a} up={up} />
          </Section>

          <Section
            title="Contacts"
            aside={
              <button className="btn btn-soft btn-sm" onClick={() => up({ contacts: [...a.contacts, { id: uid(), name: '', role: '', email: '', phone: '' }] })}>
                <UserPlus size={14} /> Ajouter
              </button>
            }
          >
            {a.contacts.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Recruteur, manager, personne rencontrée sur un salon…</p>}
            {a.contacts.map((c) => (
              <div key={c.id} className="tk-contact">
                <input className="input" value={c.name} placeholder="Nom" onChange={(e) => setContact(c.id, { name: e.target.value })} />
                <input className="input" value={c.role} placeholder="Rôle" onChange={(e) => setContact(c.id, { role: e.target.value })} />
                <input className="input" type="email" value={c.email} placeholder="E-mail" onChange={(e) => setContact(c.id, { email: e.target.value })} />
                <input className="input" value={c.phone} placeholder="Téléphone" onChange={(e) => setContact(c.id, { phone: e.target.value })} />
                <button className="icon-btn sm" title="Retirer" onClick={() => up({ contacts: a.contacts.filter((x) => x.id !== c.id) })}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </Section>

          <Section title="Notes perso">
            <AutoTextarea className="textarea" style={{ minHeight: 90 }} value={a.notes} placeholder="Questions d’entretien, impressions, salaire évoqué…" onChange={(e) => up({ notes: e.target.value })} />
          </Section>

          <Section title="Historique">
            <form
              className="row"
              style={{ gap: 8 }}
              onSubmit={(e) => {
                e.preventDefault()
                if (!note.trim()) return
                s.saveApplication(addNote(a, note))
                setNote('')
              }}
            >
              <input className="input" value={note} placeholder="Ajouter un échange : appel, e-mail reçu…" onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-soft btn-sm" type="submit" disabled={!note.trim()}>
                Ajouter
              </button>
            </form>
            <ol className="tk-timeline">
              {[...a.events].reverse().map((ev) => (
                <li key={ev.id} className={`ev-${ev.kind}`}>
                  <span>{ev.label}</span>
                  <small>{new Date(ev.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </aside>
    </div>
  )
}

// ---------- Page ----------

export default function Tracker({ id }: { id?: string }) {
  const s = useStore()
  const apps = s.data.applications ?? []
  const [view, setView] = useState<View>(() => readPref('cvgen.tracker.view', 'kanban'))
  const [kind, setKind] = useState<AppKind | 'all'>(() => readPref('cvgen.tracker.kind', 'all'))
  const [q, setQ] = useState('')
  const [hideClosed, setHideClosed] = useState(false)
  const openId = id && apps.some((a) => a.id === id) ? id : undefined

  const choose = (v: View) => {
    setView(v)
    writePref('cvgen.tracker.view', v)
  }
  const chooseKind = (k: AppKind | 'all') => {
    setKind(k)
    writePref('cvgen.tracker.kind', k)
  }
  const open = (aid: string) => s.go({ name: 'tracker', id: aid })
  const close = () => s.go({ name: 'tracker' })
  const create = () => {
    const a = newApplication({ kind: kind === 'all' ? 'emploi' : kind })
    s.saveApplication(a)
    open(a.id)
  }

  const filtered = apps.filter((a) => {
    if (kind !== 'all' && a.kind !== kind) return false
    if (hideClosed && a.status === 'rejected') return false
    if (!q.trim()) return true
    const hay = `${a.title} ${a.company} ${a.location} ${a.source} ${a.contract} ${a.notes} ${a.contacts.map((c) => c.name).join(' ')}`.toLowerCase()
    return q
      .toLowerCase()
      .split(/\s+/)
      .every((w) => hay.includes(w))
  })
  const todo = agenda(filtered).filter((x) => x.state !== 'soon' || x.kind === 'interview')

  return (
    <div className="page tk-page">
      <datalist id="tk-contracts">
        {CONTRACTS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="tk-sources">
        {SOURCES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="page-head">
        <h1>
          Suivi des candidatures <span className="count">{apps.length} suivies</span>
        </h1>
        <div className="actions">
          <button className="btn btn-accent" onClick={create}>
            <Plus size={16} /> Nouvelle candidature
          </button>
        </div>
      </div>

      <div className="tk-toolbar">
        <div className="chips">
          <button className={`chip ${kind === 'all' ? 'active' : ''}`} onClick={() => chooseKind('all')}>
            Tout <span className="muted">{apps.length}</span>
          </button>
          {KINDS.map((k) => (
            <button key={k.id} className={`chip ${kind === k.id ? 'active' : ''}`} onClick={() => chooseKind(k.id)}>
              {k.label} <span className="muted">{apps.filter((a) => a.kind === k.id).length}</span>
            </button>
          ))}
        </div>
        <div className="tk-search">
          <Search size={15} />
          <input value={q} placeholder="Rechercher" onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="check">
          <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} /> Masquer les refus
        </label>
        <div style={{ flex: 1 }} />
        <div className="seg">
          <button className={view === 'kanban' ? 'on' : ''} onClick={() => choose('kanban')}>
            <Columns3 size={14} /> Kanban
          </button>
          <button className={view === 'table' ? 'on' : ''} onClick={() => choose('table')}>
            <Table2 size={14} /> Tableau
          </button>
          <button className={view === 'stats' ? 'on' : ''} onClick={() => choose('stats')}>
            <BarChart3 size={14} /> Statistiques
          </button>
        </div>
      </div>

      {todo.length > 0 && view !== 'stats' && (
        <div className="tk-agenda">
          <span className="mono-label">à faire</span>
          {todo.slice(0, 6).map((x) => (
            <button key={x.app.id + x.kind} className={`tk-todo ${x.state}`} onClick={() => open(x.app.id)}>
              <b>{x.kind === 'interview' ? 'Entretien' : x.state === 'late' ? 'Relance en retard' : 'Relancer'}</b>
              <span>
                {x.app.title || 'Sans intitulé'}
                {x.app.company ? ` · ${x.app.company}` : ''}
              </span>
              <small>{shortDate(x.date)}</small>
            </button>
          ))}
        </div>
      )}

      {apps.length === 0 ? (
        <Empty icon={<Columns3 size={26} />} title="Aucune candidature suivie">
          Ajoutez-en une, ou depuis la page Offres avec « Suivre la candidature ». Les offres importées avec « Appliquer » depuis l’extension LinkedIn arrivent ici automatiquement.
        </Empty>
      ) : view === 'kanban' ? (
        <Kanban apps={filtered} open={open} />
      ) : view === 'table' ? (
        <TableView apps={filtered} open={open} />
      ) : (
        <StatsView apps={filtered} />
      )}

      {openId && <Drawer key={openId} id={openId} onClose={close} />}
      <p className="muted tk-foot">
        Statut « {statusLabel('applied')} » : relance rappelée à J+{FOLLOW_UP_DAYS}, idéalement entre J+6 et J+7. Aujourd’hui : {shortDate(today()).replace(/\.$/, '')}.
      </p>
    </div>
  )
}
