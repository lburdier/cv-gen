import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import type { UpdateStatus } from '../../../shared/types'
import { useStore } from '../store'

/** État des mises à jour, partagé par la notification et les Paramètres. */
export function useUpdateStatus(): UpdateStatus | null {
  const [st, setSt] = useState<UpdateStatus | null>(null)
  useEffect(() => {
    if (!window.cvgen?.updates) return
    window.cvgen.updates.status().then(setSt).catch(() => {})
    return window.cvgen.updates.onStatus(setSt)
  }, [])
  return st
}

/** Notification quand une nouvelle version est prête (ou disponible pour la version portable). */
export function UpdateNotifier() {
  const st = useUpdateStatus()
  const toast = useStore((s) => s.toast)
  const shown = useRef('')
  useEffect(() => {
    if (!st?.version) return
    const key = `${st.state}:${st.version}`
    if (shown.current === key) return
    if (st.state === 'downloaded') {
      shown.current = key
      toast({
        kind: 'info',
        title: `CV GEN ${st.version} est prête`,
        detail: 'Elle s’installera à la fermeture de l’app, ou tout de suite en redémarrant.',
        action: { label: 'Redémarrer', run: () => void window.cvgen.updates.install() }
      })
    } else if (st.state === 'available' && st.portable) {
      shown.current = key
      toast({
        kind: 'info',
        title: `CV GEN ${st.version} est disponible`,
        detail: 'Version portable : téléchargez la nouvelle version.',
        action: { label: 'Télécharger', run: () => void window.cvgen.updates.install() }
      })
    }
  }, [st, toast])
  return null
}

const LABEL: Record<UpdateStatus['state'], string> = {
  disabled: 'Mises à jour automatiques actives uniquement dans l’app installée.',
  idle: 'Vérification automatique au démarrage puis toutes les 6 heures.',
  checking: 'Recherche d’une nouvelle version…',
  none: 'Vous avez la dernière version.',
  available: 'Une nouvelle version est disponible.',
  downloading: 'Téléchargement de la nouvelle version…',
  downloaded: 'Nouvelle version prête : elle s’installera à la fermeture de l’app.',
  error: 'La vérification a échoué.'
}

/** Paramètres › Mises à jour. */
export function UpdatesSettings() {
  const st = useUpdateStatus()
  if (!st) return <div className="muted">…</div>
  const busy = st.state === 'checking' || st.state === 'downloading'
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <span className="mono-tag">version {st.current}</span>
        {st.portable && <span className="mono-tag">portable</span>}
        {st.version && st.state !== 'none' && <span className="tag ok">nouvelle : {st.version}</span>}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        {st.state === 'downloading' && st.percent ? `${LABEL.downloading} ${st.percent} %` : LABEL[st.state]}
        {st.state === 'error' && st.error ? ` ${st.error}` : ''}
        {st.state === 'available' && st.portable ? ' Téléchargez-la sur la page des versions.' : ''}
      </p>
      {st.state === 'downloading' && (
        <div className="as-bar">
          <span style={{ width: `${st.percent ?? 0}%`, background: 'var(--text)' }} />
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        {st.state === 'downloaded' ? (
          <button className="btn btn-ink btn-sm" onClick={() => void window.cvgen.updates.install()}>
            <RotateCcw size={14} /> Redémarrer et installer
          </button>
        ) : st.state === 'available' && st.portable ? (
          <button className="btn btn-ink btn-sm" onClick={() => void window.cvgen.updates.install()}>
            <Download size={14} /> Télécharger {st.version}
          </button>
        ) : (
          <button className="btn btn-outline btn-sm" disabled={busy || st.state === 'disabled'} onClick={() => void window.cvgen.updates.check()}>
            {busy ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Rechercher une mise à jour
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => void window.cvgen.openExternal('https://github.com/lburdier/cv-gen/releases')}>
          Notes de version
        </button>
      </div>
    </div>
  )
}
