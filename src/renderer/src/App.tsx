import { Suspense, lazy, useEffect, useState, useCallback } from 'react'
import { IntroSplash } from './components/Intro'
import { TourHost } from './components/Tour'
import { UpdateNotifier } from './components/Updates'
import { actions } from './lib/actions'
import { Assistant } from './components/Assistant'
import { CommandPalette } from './components/CommandPalette'
import { CrashScreen, ErrorBoundary } from './components/ErrorBoundary'
import { Mark, Toasts, Topnav } from './components/Shell'
import Dashboard from './pages/Dashboard'
import { useStore } from './store'

// Pages chargées à la demande : démarrage plus rapide.
const Editor = lazy(() => import('./pages/Editor'))
const Letters = lazy(() => import('./pages/Letters'))
const Offers = lazy(() => import('./pages/Offers'))
const Resumes = lazy(() => import('./pages/Resumes'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const Templates = lazy(() => import('./pages/Templates'))
const ColorExplorer = lazy(() => import('./pages/ColorExplorer'))
const FromImage = lazy(() => import('./pages/FromImage'))
const AtsScan = lazy(() => import('./pages/AtsScan'))
const ProfilePage = lazy(() => import('./pages/Profile'))

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Chargement">
      <Mark size={34} wave />
    </div>
  )
}

export default function App() {
  // Animation d'ouverture : une fois par lancement.
  const [intro, setIntro] = useState(() => !window.cvgen?.quiet)
  const endIntro = useCallback(() => setIntro(false), [])
  // Abonnements ciblés : l'app ne se re-rend pas à chaque frappe dans un CV.
  const loaded = useStore((s) => s.loaded)
  const initError = useStore((s) => s.initError)
  const route = useStore((s) => s.route)
  const theme = useStore((s) => s.settings.theme)
  const paletteOpen = useStore((s) => s.paletteOpen)
  const assistantOpen = useStore((s) => s.assistantOpen)

  useEffect(() => {
    useStore.getState().init()
  }, [])

  // Thème : préférence explicite ou thème système.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      window.cvgen?.setTitleBarTheme(dark)
      useStore.getState().setDark(dark)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  // Raccourcis globaux.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !useStore.getState().loaded) return
      const s = useStore.getState()
      const key = e.key.toLowerCase()
      if (key === 'k') {
        e.preventDefault()
        s.setPalette(!s.paletteOpen)
      } else if (key === 'j') {
        e.preventDefault()
        s.setAssistant(!s.assistantOpen)
      } else if (key === 'n' && !e.shiftKey) {
        e.preventDefault()
        actions.newResume()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  if (initError) return <CrashScreen error={initError} title="Impossible de démarrer CV GEN." />
  if (!loaded || intro) return <IntroSplash ready={loaded} onDone={endIntro} />

  const r = route
  const page =
    r.name === 'dashboard' ? (
      <Dashboard />
    ) : r.name === 'resumes' ? (
      <Resumes />
    ) : r.name === 'templates' ? (
      <Templates />
    ) : r.name === 'profile' ? (
      <ProfilePage />
    ) : r.name === 'ats-scan' ? (
      <AtsScan />
    ) : r.name === 'from-image' ? (
      <FromImage />
    ) : r.name === 'colors' ? (
      <ColorExplorer key={(r.colors ?? []).join() + (r.resumeId ?? '')} initialColors={r.colors} resumeId={r.resumeId} />
    ) : r.name === 'editor' ? (
      <Editor key={r.id} id={r.id} />
    ) : r.name === 'offers' ? (
      <Offers id={r.id} />
    ) : r.name === 'letters' ? (
      <Letters key={r.id ?? 'list'} id={r.id} />
    ) : (
      <SettingsPage />
    )
  const pageKey = r.name + ('id' in r ? `:${r.id ?? ''}` : '')
  const home = () => useStore.getState().go({ name: 'dashboard' })

  return (
    <div className="shell">
      <Topnav />
      <main className="content" style={r.name === 'editor' ? { overflow: 'hidden' } : undefined}>
        <ErrorBoundary resetKey={pageKey} onHome={home}>
          <Suspense fallback={<Splash />}>{page}</Suspense>
        </ErrorBoundary>
      </main>
      <ErrorBoundary resetKey={String(paletteOpen)}>{paletteOpen && <CommandPalette />}</ErrorBoundary>
      <ErrorBoundary resetKey={String(assistantOpen)}>{assistantOpen && <Assistant />}</ErrorBoundary>
      <Toasts />
      <UpdateNotifier />
      <ErrorBoundary resetKey="tour">
        <TourHost />
      </ErrorBoundary>
    </div>
  )
}
