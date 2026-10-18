import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useStore } from '../store'

interface Props {
  children: ReactNode
  /** Remet l'écran à zéro quand cette clé change (ex. changement de page). */
  resetKey?: string
  onHome?: () => void
}

/**
 * Filet de sécurité : une erreur de rendu affiche un message au lieu d'une page blanche,
 * et elle est consignée dans le journal d'erreurs du dossier de données.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    window.cvgen?.logError?.(`${error.stack ?? error.message}\n${info.componentStack ?? ''}`)
    reloadIfStale(error)
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (isReloading()) return null
    return <CrashScreen error={error} onHome={this.props.onHome ? () => (this.setState({ error: null }), this.props.onHome!()) : undefined} />
  }
}

export function CrashScreen({ error, onHome, title = 'Un problème est survenu sur cet écran.' }: { error: Error | string; onHome?: () => void; title?: string }) {
  const message = typeof error === 'string' ? error : error.message
  return (
    <div className="crash">
      <div className="crash-card">
        <span className="pill-label">Oups</span>
        <h1>
          {title.split(' ').slice(0, -1).join(' ')} <em>{title.split(' ').slice(-1)}</em>
        </h1>
        <p className="lede">Vos données sont enregistrées. Rechargez l’app ; si le problème revient, le détail est consigné dans le fichier cvgen-erreurs.log du dossier de données.</p>
        <pre className="crash-detail">{message}</pre>
        <div className="row wrap">
          <button className="btn btn-ink" onClick={reloadApp}>
            Recharger l’app
          </button>
          {onHome && (
            <button className="btn btn-outline" onClick={onHome}>
              Revenir à l’accueil
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(typeof error === 'string' ? error : `${error.message}\n${error.stack ?? ''}`)}>
            Copier le détail
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Page chargée à la demande introuvable : les fichiers de l'app ont été reconstruits pendant qu'elle
 * était ouverte (lancement depuis le dossier du projet). Un rechargement suffit ; une seule fois par
 * minute, pour ne jamais boucler si le fichier manque vraiment.
 */
export function reloadIfStale(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  if (!/dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(msg)) return false
  try {
    const last = Number(sessionStorage.getItem('cvgen.staleReload') ?? 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem('cvgen.staleReload', String(Date.now()))
    // La page affichée est rouverte après le rechargement.
    sessionStorage.setItem('cvgen.route', JSON.stringify(useStore.getState().route))
  } catch {
    /* stockage indisponible : on recharge quand même une fois */
  }
  reloading = true
  reloadApp()
  return true
}

/** Rechargement en cours : l'écran d'erreur ne s'affiche pas entre-temps. */
let reloading = false
export const isReloading = () => reloading

export function reloadApp(): void {
  if (window.cvgen?.reload) window.cvgen.reload()
  else location.reload()
}
