import type React from 'react'
import { AlertTriangle, Check, CircleHelp, Loader2, Moon, Search, Settings as SettingsIcon, Sparkles, Sun, X } from 'lucide-react'
import { startPageTour } from './Tour'
import { actions } from '../lib/actions'
import { useStore, type Route } from '../store'

/** Logo : matrice de 4 × 4 points. « animated » : apparition en vague diagonale (ouverture, chargement). */
export function Mark({ size = 22, animated = false, wave = false }: { size?: number; animated?: boolean; wave?: boolean }) {
  return (
    <span className={`mark ${animated ? 'mark-in' : ''} ${wave ? 'mark-wave' : ''}`} style={{ width: size, height: size }} aria-hidden>
      {Array.from({ length: 16 }, (_, i) => (
        <i key={i} style={{ '--d': (i % 4) + Math.floor(i / 4) } as React.CSSProperties} />
      ))}
    </span>
  )
}

const TABS: { label: string; route: Route; match: Route['name'][] }[] = [
  { label: 'Accueil', route: { name: 'dashboard' }, match: ['dashboard'] },
  { label: 'Mes CV', route: { name: 'resumes' }, match: ['resumes', 'editor'] },
  { label: 'Modèles', route: { name: 'templates' }, match: ['templates', 'colors', 'from-image'] },
  { label: 'Offres', route: { name: 'offers' }, match: ['offers'] },
  { label: 'Lettres', route: { name: 'letters' }, match: ['letters'] },
  { label: 'Score ATS', route: { name: 'ats-scan' }, match: ['ats-scan'] }
]

export function Topnav() {
  const route = useStore((s) => s.route)
  const go = useStore((s) => s.go)
  const dark = useStore((s) => s.dark)
  const settings = useStore((s) => s.settings)
  const resumes = useStore((s) => s.data.resumes)
  const offers = useStore((s) => s.data.offers)
  const assistantOpen = useStore((s) => s.assistantOpen)
  const setAssistant = useStore((s) => s.setAssistant)
  const setPalette = useStore((s) => s.setPalette)

  const profile = useStore((s) => s.data.profile)
  const first = profile?.basics.firstName ? profile.basics : resumes[0]?.basics
  const name = (profile?.basics.firstName ? `${profile.basics.firstName} ${profile.basics.lastName}`.trim() : '') || settings.userName || (first ? `${first.firstName} ${first.lastName}`.trim() : '')
  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CV'
  const counts: Partial<Record<Route['name'], number>> = { resumes: resumes.length, offers: offers.length }

  return (
    <header className="topnav">
      <button className="brand" onClick={() => go({ name: 'dashboard' })}>
        <Mark />
        <span className="brand-text">
          CV <em>Gen</em>
        </span>
      </button>
      <nav className="tabs" aria-label="Navigation principale">
        {TABS.map((t, i) => (
          <button key={t.label} className={`tab ${t.match.includes(route.name) ? 'on' : ''}`} onClick={() => go(t.route)}>
            <b>{String(i + 1).padStart(2, '0')}</b>
            {t.label}
            {counts[t.route.name] ? <span className="cnt">{counts[t.route.name]}</span> : null}
          </button>
        ))}
        <button className={`tab ${assistantOpen ? 'on' : ''}`} onClick={() => setAssistant(!assistantOpen)}>
          <b>06</b>Assistant
        </button>
      </nav>
      <div className="grow" />
      <button className="search-trigger" onClick={() => setPalette(true)} title="Rechercher (Ctrl K)">
        <Search size={15} />
        <span className="lbl">Rechercher</span>
        <span className="kbd">Ctrl K</span>
      </button>
      <button className="icon-btn" data-tour="help" onClick={startPageTour} aria-label="Tutoriel de cette page" title="Tutoriel de cette page">
        <CircleHelp size={18} />
      </button>
      <button className="icon-btn" onClick={actions.toggleTheme} aria-label="Changer de thème" title="Thème clair / sombre">
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button className="icon-btn" onClick={() => go({ name: 'settings' })} aria-label="Paramètres" title="Paramètres">
        <SettingsIcon size={18} />
      </button>
      <button className="btn btn-ink btn-new" onClick={() => actions.newResume()} title="Nouveau CV (Ctrl N)">
        <span className="lbl">Nouveau CV</span> <span className="mono">+</span>
      </button>
      <button className="avatar" onClick={() => go({ name: 'profile' })} title={name ? `${name} — mon profil` : 'Mon profil'}>
        {profile?.basics.photo ? <img src={profile.basics.photo} alt="" /> : initials}
      </button>
    </header>
  )
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismiss)
  const busy = useStore((s) => s.busy)
  return (
    <>
      {busy && (
        <div className="busy-pill" role="status">
          <Loader2 size={15} className="spin" />
          {busy}
        </div>
      )}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} role="status">
            <div className="ic">{t.kind === 'success' ? <Check size={16} /> : t.kind === 'error' ? <AlertTriangle size={16} /> : <Sparkles size={15} />}</div>
            <div className="body">
              <strong>{t.title}</strong>
              {t.detail && <span>{t.detail}</span>}
            </div>
            {t.action && (
              <button
                className="btn btn-ink btn-sm"
                onClick={() => {
                  t.action!.run()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
            <button className="icon-btn sm" onClick={() => dismiss(t.id)} aria-label="Fermer">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
