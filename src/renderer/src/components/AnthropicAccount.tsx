import { useEffect, useState } from 'react'
import { Info, Loader2, LogIn, LogOut, ShieldCheck, X } from 'lucide-react'
import type { AnthropicLoginState } from '../../../shared/types'
import { useStore } from '../store'

const clean = (m: string) => m.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '')

/** Paramètres › Claude : connexion avec un compte développeur Anthropic (sans clé à copier). */
export function AnthropicAccount() {
  const s = useStore()
  const [st, setSt] = useState<AnthropicLoginState | null>(null)
  const [step, setStep] = useState<'idle' | 'working'>('idle')
  const refresh = async () => {
    setSt(await window.cvgen.anthropicLogin.state())
    useStore.setState({ settings: await window.cvgen.getSettings() })
  }
  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async () => {
    setStep('working')
    try {
      const next = await window.cvgen.anthropicLogin.login()
      setSt(next)
      if (next.loggedIn) s.toast({ kind: 'success', title: 'Connecté à Anthropic', detail: 'Claude utilise maintenant votre compte développeur.' })
    } catch (e) {
      const msg = clean((e as Error).message)
      s.toast(/annulée/.test(msg) ? { kind: 'info', title: 'Connexion annulée' } : { kind: 'error', title: 'Connexion impossible', detail: msg })
    }
    setStep('idle')
    await refresh()
  }
  const logout = async () => {
    setSt(await window.cvgen.anthropicLogin.logout())
    await refresh()
    s.toast({ kind: 'info', title: 'Déconnecté d’Anthropic' })
  }

  if (!st) return <div className="muted">…</div>
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className={`tag ${st.loggedIn ? 'ok' : 'warn'}`}>{st.loggedIn ? 'Connecté' : 'Non connecté'}</span>
        {st.details.map((d) => (
          <span key={d} className="mono-tag">
            {d}
          </span>
        ))}
      </div>
      {step === 'working' ? (
        <div className="callout" style={{ fontSize: 13 }}>
          <Loader2 size={16} className="spin" />
          <span>
            {st.installed || st.busy === 'waiting'
              ? 'Terminez la connexion dans la page qui s’est ouverte dans votre navigateur (choix de l’organisation, puis autorisation). Cette fenêtre attend jusqu’à 5 minutes.'
              : 'Téléchargement de l’outil de connexion officiel d’Anthropic (13 Mo, empreinte vérifiée)…'}
          </span>
          <button className="icon-btn sm" title="Annuler" onClick={() => void window.cvgen.anthropicLogin.cancel()}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="row" style={{ gap: 8 }}>
          {st.loggedIn ? (
            <>
              <button className="btn btn-outline btn-sm" onClick={login}>
                <LogIn size={14} /> Changer de compte
              </button>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                <LogOut size={14} /> Se déconnecter
              </button>
            </>
          ) : (
            <button className="btn btn-ink" onClick={login}>
              <LogIn size={15} /> Se connecter avec Anthropic
            </button>
          )}
        </div>
      )}
      <div className="callout" style={{ fontSize: 13 }}>
        <ShieldCheck size={16} />
        <span>
          La connexion passe par l’outil officiel d’Anthropic{st.installed ? '' : ' (téléchargé au premier clic, 13 Mo)'} : vous vous connectez sur platform.claude.com, et l’app reçoit une session renouvelée automatiquement. Elle ne voit jamais votre mot de passe.
        </span>
      </div>
      <div className="callout" style={{ fontSize: 13 }}>
        <Info size={16} />
        <span>
          Il s’agit d’un compte <b>développeur</b> (Claude Console) : l’usage est facturé sur les crédits API de votre organisation, comme avec une clé. Un abonnement Claude Pro ou Max ne peut pas être utilisé par une autre application.
        </span>
      </div>
    </div>
  )
}
