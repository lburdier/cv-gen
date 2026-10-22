import { Check, Copy, FolderOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { BridgeStatus } from '../../../shared/types'

/** Demande d'affichage de la section à l'ouverture des Paramètres (bouton « Extension LinkedIn » des Offres). */
export const extensionFocus = { pending: false }

/** Paramètres › Extension navigateur : état du pont local et installation de l'extension LinkedIn. */
export function ExtensionSettings() {
  const [st, setSt] = useState<BridgeStatus | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void window.cvgen.bridge.status().then(setSt)
    if (extensionFocus.pending) {
      extensionFocus.pending = false
      document.getElementById('extension')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }, [])

  const copy = async () => {
    if (!st) return
    try {
      await navigator.clipboard.writeText(st.extensionDir)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* presse-papiers indisponible */
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }} data-tour="extension">
      <div className="row" style={{ gap: 10 }}>
        <span className={`tag ${st?.running ? 'ok' : 'miss'}`}>{st == null ? 'Vérification…' : st.running ? `Connexion prête · port ${st.port}` : 'Connexion indisponible'}</span>
        {st?.error && !st.running && <span className="muted" style={{ fontSize: 12.5 }}>{st.error}</span>}
      </div>
      <ol className="clean" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, listStyle: 'decimal' }}>
        <li>
          Dans Chrome ou Edge, ouvrez <code>chrome://extensions</code> (ou <code>edge://extensions</code>) et activez le <strong>mode développeur</strong>.
        </li>
        <li>
          Cliquez sur <strong>Charger l’extension non empaquetée</strong> et choisissez le dossier ci-dessous.
        </li>
        <li>Sur une offre LinkedIn, le bouton CV GEN apparaît en bas à droite : « Importer » l’ajoute à vos offres, « Appliquer » l’ouvre ici et adapte votre CV le plus proche.</li>
        <li>L’icône de l’extension permet aussi de chercher des offres LinkedIn et d’en importer plusieurs d’un coup, ou d’importer une annonce d’un autre site.</li>
      </ol>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <code className="plain-text" style={{ flex: '1 1 260px', padding: '8px 12px', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={st?.extensionDir}>
          {st?.extensionDir ?? '…'}
        </code>
        <button className="btn btn-soft btn-sm" onClick={copy} disabled={!st}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copié' : 'Copier le chemin'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => window.cvgen.bridge.openExtensionFolder()}>
          <FolderOpen size={14} /> Ouvrir le dossier
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
        L’extension ne parle qu’à CV GEN sur cet ordinateur (adresse 127.0.0.1) : aucune donnée n’est envoyée ailleurs. CV GEN doit être ouvert pour recevoir les offres ; sinon l’extension les garde et les renvoie dès son ouverture.
      </p>
    </div>
  )
}
