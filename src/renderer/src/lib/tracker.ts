import type { AppEvent, AppKind, AppStatus, Application, Offer } from '../../../shared/types'
import { uid } from './sample'

/** Étapes du suivi, dans l'ordre des colonnes du kanban. */
export const STATUSES: { id: AppStatus; label: string; hint: string }[] = [
  { id: 'todo', label: 'À postuler', hint: 'Offres repérées, candidature à préparer' },
  { id: 'applied', label: 'Envoyée', hint: 'En attente de réponse' },
  { id: 'followup', label: 'Relancée', hint: 'Relance envoyée, nouvelle attente' },
  { id: 'interview', label: 'Entretien', hint: 'Entretien prévu ou passé' },
  { id: 'offer', label: 'Offre', hint: 'Proposition reçue' },
  { id: 'rejected', label: 'Refus', hint: 'Réponse négative ou abandon' }
]
export const statusLabel = (s: AppStatus) => STATUSES.find((x) => x.id === s)?.label ?? s

/** Champs propres à chaque type de recherche. */
export const KINDS: { id: AppKind; label: string; contract: string; fields: { key: string; label: string; ph: string; type?: 'date' }[] }[] = [
  {
    id: 'emploi',
    label: 'Emploi',
    contract: 'CDI',
    fields: [
      { key: 'salary', label: 'Salaire', ph: '38-42 k€ brut / an' },
      { key: 'start', label: 'Prise de poste', ph: '', type: 'date' },
      { key: 'remote', label: 'Télétravail', ph: '2 jours / semaine' }
    ]
  },
  {
    id: 'stage',
    label: 'Stage',
    contract: 'Stage',
    fields: [
      { key: 'duration', label: 'Durée', ph: '6 mois' },
      { key: 'start', label: 'Début', ph: '', type: 'date' },
      { key: 'stipend', label: 'Gratification', ph: '4,35 € / h' },
      { key: 'school', label: 'École', ph: 'Votre école (convention de stage)' }
    ]
  },
  {
    id: 'alternance',
    label: 'Alternance',
    contract: 'Alternance',
    fields: [
      { key: 'rhythm', label: 'Rythme', ph: '3 sem. entreprise / 1 sem. école' },
      { key: 'duration', label: 'Durée', ph: '2 ans' },
      { key: 'school', label: 'École', ph: 'Nom de l’école' },
      { key: 'start', label: 'Début', ph: '', type: 'date' }
    ]
  },
  {
    id: 'mission',
    label: 'Mission',
    contract: 'Freelance',
    fields: [
      { key: 'rate', label: 'TJM', ph: '450 € / jour' },
      { key: 'duration', label: 'Durée', ph: '3 mois renouvelables' },
      { key: 'start', label: 'Démarrage', ph: '', type: 'date' },
      { key: 'remote', label: 'Télétravail', ph: 'Full remote' }
    ]
  }
]
export const kindLabel = (k: AppKind) => KINDS.find((x) => x.id === k)?.label ?? k

export const CONTRACTS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Intérim', 'VIE', 'Temps partiel']
export const PRIORITY_LABEL: Record<1 | 2 | 3, string> = { 1: 'Basse', 2: 'Normale', 3: 'Haute' }

/** Relance idéale : 6 à 7 jours après l’envoi (rappel posé à J+6). */
export const FOLLOW_UP_DAYS = 6

export const today = () => isoDate(new Date())
export function isoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return isoDate(d)
}
export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000)
}
/** « 12 nov. » ou « 12 nov. 2027 » si autre année. */
export function shortDate(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso.length > 10 ? iso : iso + 'T12:00:00')
  if (isNaN(d.getTime())) return ''
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const day = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
  return iso.length > 10 ? `${day} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : day
}

/** Type deviné d'après le texte de l'offre. */
export function detectKind(text: string): AppKind {
  const t = text.toLowerCase()
  if (/\balternan|apprenti|contrat de professionnalisation/.test(t)) return 'alternance'
  if (/\bstage\b|stagiaire|internship|\bintern\b/.test(t)) return 'stage'
  if (/freelance|\bmission\b.*\b(tjm|jours?)\b|\btjm\b|portage salarial|indépendant/.test(t)) return 'mission'
  return 'emploi'
}

function event(kind: AppEvent['kind'], label: string, status?: AppStatus): AppEvent {
  return { id: uid(), at: Date.now(), kind, label, ...(status ? { status } : {}) }
}

export function newApplication(p: Partial<Application> = {}): Application {
  const kind = p.kind ?? 'emploi'
  const now = Date.now()
  return {
    id: uid(),
    kind,
    status: 'todo',
    title: '',
    company: '',
    location: '',
    contract: KINDS.find((k) => k.id === kind)?.contract ?? '',
    source: '',
    url: '',
    priority: 2,
    details: {},
    contacts: [],
    notes: '',
    events: [event('create', 'Candidature ajoutée au suivi')],
    createdAt: now,
    updatedAt: now,
    ...p
  }
}

/** Candidature créée depuis une offre analysée ou importée de LinkedIn. */
export function fromOffer(o: Offer, resumeId?: string): Application {
  const kind = detectKind(`${o.title}\n${o.analysis?.contract ?? ''}\n${o.text.slice(0, 1500)}`)
  const contract = o.analysis?.contract && /cdi|cdd|stage|alternance|freelance|intérim|interim|temps/i.test(o.analysis.contract) ? o.analysis.contract : undefined
  return newApplication({
    kind,
    title: o.title,
    company: o.company,
    location: o.location || o.analysis?.location || '',
    ...(contract ? { contract } : {}),
    source: o.source === 'linkedin' ? 'LinkedIn' : o.source ? o.source[0].toUpperCase() + o.source.slice(1) : '',
    url: o.url ?? '',
    offerId: o.id,
    resumeId
  })
}

/** Changement d'étape : historique, date d'envoi et relance prévue mises à jour. */
export function withStatus(a: Application, status: AppStatus): Application {
  if (a.status === status) return a
  const t = today()
  const next: Application = { ...a, status, events: [...a.events, event('status', `${statusLabel(a.status)} → ${statusLabel(status)}`, status)] }
  if (status === 'applied') {
    next.appliedAt = a.appliedAt || t
    next.followUpAt = addDays(next.appliedAt, FOLLOW_UP_DAYS)
  } else if (status === 'followup') {
    next.appliedAt = a.appliedAt || t
    next.followUpAt = addDays(t, FOLLOW_UP_DAYS)
  } else if (status === 'interview') {
    next.appliedAt = a.appliedAt || t
    next.followUpAt = undefined
  } else if (status === 'offer' || status === 'rejected') {
    next.followUpAt = undefined
  }
  return next
}

/** « Relancé aujourd'hui » : passe en Relancée et repousse la prochaine relance. */
export function markFollowedUp(a: Application): Application {
  const t = today()
  const base = a.status === 'followup' ? a : withStatus(a, 'followup')
  return { ...base, followUpAt: addDays(t, FOLLOW_UP_DAYS), events: [...base.events, event('followup', 'Relance effectuée')] }
}

export function addNote(a: Application, text: string): Application {
  return { ...a, events: [...a.events, event('note', text.trim())] }
}

/** État de la relance : en retard, aujourd'hui, bientôt (3 jours) ou rien. */
export function followUpState(a: Application): 'late' | 'today' | 'soon' | null {
  if (!a.followUpAt || !['applied', 'followup', 'interview'].includes(a.status)) return null
  const d = daysBetween(today(), a.followUpAt)
  return d < 0 ? 'late' : d === 0 ? 'today' : d <= 3 ? 'soon' : null
}

/** Entretien à venir dans les 7 jours. */
export function interviewSoon(a: Application) {
  if (!a.interviewAt || a.status === 'rejected') return false
  const d = daysBetween(today(), a.interviewAt.slice(0, 10))
  return d >= 0 && d <= 7
}

/** Relances et entretiens à traiter, du plus urgent au moins urgent. */
export function agenda(apps: Application[]) {
  const items: { app: Application; kind: 'followup' | 'interview'; date: string; state: 'late' | 'today' | 'soon' }[] = []
  for (const a of apps) {
    const f = followUpState(a)
    if (f) items.push({ app: a, kind: 'followup', date: a.followUpAt!, state: f })
    if (interviewSoon(a)) {
      const d = daysBetween(today(), a.interviewAt!.slice(0, 10))
      items.push({ app: a, kind: 'interview', date: a.interviewAt!, state: d === 0 ? 'today' : 'soon' })
    }
  }
  return items.sort((x, y) => x.date.localeCompare(y.date))
}

const reached = (a: Application, s: AppStatus[]) => s.includes(a.status) || a.events.some((e) => e.status && s.includes(e.status))
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

export interface TrackerStats {
  total: number
  sent: number
  responses: number
  interviews: number
  offers: number
  responseRate: number
  interviewRate: number
  /** Délai moyen avant la première réponse (jours), null sans donnée. */
  avgDelay: number | null
  byStatus: Record<AppStatus, number>
  byKind: { id: AppKind; label: string; total: number; sent: number; responseRate: number; interviews: number }[]
  bySource: { source: string; sent: number; responseRate: number; interviews: number }[]
}

/** Taux de réponse, entretiens obtenus, délai moyen, par type et par source. */
export function trackerStats(apps: Application[]): TrackerStats {
  const isSent = (a: Application) => a.status !== 'todo'
  const responded = (a: Application) => reached(a, ['interview', 'offer', 'rejected'])
  const interviewed = (a: Application) => reached(a, ['interview', 'offer'])
  const sent = apps.filter(isSent)
  const delays: number[] = []
  for (const a of sent) {
    if (!a.appliedAt) continue
    const first = a.events.find((e) => e.status && ['interview', 'offer', 'rejected'].includes(e.status))
    if (first) delays.push(Math.max(0, daysBetween(a.appliedAt, isoDate(new Date(first.at)))))
  }
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s.id, apps.filter((a) => a.status === s.id).length])) as Record<AppStatus, number>
  const group = <K extends string>(key: (a: Application) => K) => {
    const m = new Map<K, Application[]>()
    for (const a of apps) m.set(key(a), [...(m.get(key(a)) ?? []), a])
    return m
  }
  const byKind = KINDS.map((k) => {
    const list = apps.filter((a) => a.kind === k.id)
    const s = list.filter(isSent)
    return { id: k.id, label: k.label, total: list.length, sent: s.length, responseRate: pct(s.filter(responded).length, s.length), interviews: s.filter(interviewed).length }
  }).filter((k) => k.total)
  const bySource = [...group((a) => (a.source.trim() || 'Non renseignée') as string)]
    .map(([source, list]) => {
      const s = list.filter(isSent)
      return { source, sent: s.length, responseRate: pct(s.filter(responded).length, s.length), interviews: s.filter(interviewed).length }
    })
    .filter((x) => x.sent)
    .sort((a, b) => b.sent - a.sent)
  return {
    total: apps.length,
    sent: sent.length,
    responses: sent.filter(responded).length,
    interviews: sent.filter(interviewed).length,
    offers: sent.filter((a) => reached(a, ['offer'])).length,
    responseRate: pct(sent.filter(responded).length, sent.length),
    interviewRate: pct(sent.filter(interviewed).length, sent.length),
    avgDelay: delays.length ? Math.round(delays.reduce((x, y) => x + y, 0) / delays.length) : null,
    byStatus,
    byKind,
    bySource
  }
}
