import { useEffect, useState } from 'react'
import { Check, Download, HardDrive, Loader2, Trash2, X } from 'lucide-react'
import type { LocalModelState } from '../../../shared/types'
import { useStore } from '../store'

const mo = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1).replace('.', ',')} Go` : `${Math.round(b / 1e6)} Mo`)

/** État des modèles locaux, tenu à jour pendant les téléchargements. */
export function useLocalModels(): LocalModelState[] | null {
  const [list, setList] = useState<LocalModelState[] | null>(null)
  useEffect(() => {
    window.cvgen.local
      .list()
      .then(setList)
      .catch(() => setList([]))
    return window.cvgen.local.onState(setList)
  }, [])
  return list
}

/** Paramètres › IA sur cet ordinateur : télécharger, choisir ou supprimer un petit modèle hors ligne. */
export function LocalModels() {
  const list = useLocalModels()
  const s = useStore()
  const refresh = async () => useStore.setState({ settings: await window.cvgen.getSettings() })
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
    } catch (e) {
      s.toast({ kind: 'error', title: 'Modèle local', detail: (e as Error).message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '') })
    }
    await refresh()
  }
  if (!list) return <div className="muted">…</div>
  const active = s.settings.provider === 'local'
  return (
    <div className="stack" style={{ gap: 8 }}>
      {list.map((m) => {
        const chosen = active && s.settings.localModel === m.id
        return (
          <div key={m.id} className={`model-opt lm-card ${chosen ? 'on' : ''}`}>
            <button
              className="lm-pick"
              disabled={!m.installed}
              title={m.installed ? 'Utiliser ce modèle' : 'Téléchargez-le d’abord'}
              onClick={() => run(() => s.setSettings({ provider: 'local', localModel: m.id }))}
            >
              <span className="radio-dot" />
              <div>
                <strong>
                  {m.label} · {m.name}
                </strong>
                <p>
                  {m.desc} {mo(m.size)}.
                </p>
              </div>
            </button>
            <div className="lm-actions">
              {m.installed ? (
                <>
                  <span className="tag ok">
                    <Check size={12} /> installé
                  </span>
                  <button className="icon-btn sm" title="Supprimer le modèle (libère l’espace disque)" onClick={() => run(() => window.cvgen.local.remove(m.id))}>
                    <Trash2 size={14} />
                  </button>
                </>
              ) : m.downloading ? (
                <>
                  <div className="lm-progress" title={`${m.percent ?? 0} %`}>
                    <span style={{ width: `${m.percent ?? 0}%` }} />
                  </div>
                  <span className="mono-label">{m.percent ?? 0} %</span>
                  <button className="icon-btn sm" title="Interrompre (reprise possible)" onClick={() => run(() => window.cvgen.local.cancel(m.id))}>
                    <X size={14} />
                  </button>
                </>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={() => run(() => window.cvgen.local.download(m.id))}>
                  <Download size={14} /> Télécharger ({mo(m.size)})
                </button>
              )}
            </div>
          </div>
        )
      })}
      <div className="callout" style={{ fontSize: 13 }}>
        <HardDrive size={16} />
        <span>
          Le modèle tourne entièrement sur cet ordinateur : rien n’est envoyé en ligne, sans clé ni limite. Il est moins doué qu’un grand modèle, mais répond toujours. Il sert aussi de secours automatique quand le fournisseur en ligne est indisponible.
        </span>
      </div>
      {list.some((m) => m.downloading) && (
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>
          <Loader2 size={12} className="spin" style={{ verticalAlign: -2 }} /> Vous pouvez continuer à utiliser l’app pendant le téléchargement.
        </p>
      )}
    </div>
  )
}
