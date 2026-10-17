import { Check, FolderOpen, History, Info, KeyRound, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { ToursSettings } from '../components/ToursSettings'
import { UpdatesSettings } from '../components/Updates'
import { useEffect, useState } from 'react'
import type { FreeModel, ModelId, Settings } from '../../../shared/types'
import { useStore } from '../store'

const MODELS: { id: ModelId; name: string; desc: string }[] = [
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', desc: 'Meilleure qualité de rédaction et d’adaptation. Recommandé.' },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', desc: 'Très bon équilibre vitesse / qualité, moins coûteux.' },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', desc: 'Le plus rapide et économique, pour l’analyse d’offres en volume.' }
]

/** Modèles gratuits d'OpenRouter : le routeur « openrouter/free » choisit un modèle disponible à chaque requête. */
function FreeModels() {
  const s = useStore()
  const [list, setList] = useState<FreeModel[] | null>(null)
  const [error, setError] = useState('')
  const load = () => {
    setError('')
    setList(null)
    window.cvgen
      .listFreeModels()
      .then(setList)
      .catch((e: Error) => {
        setError(e.message)
        setList([])
      })
  }
  useEffect(() => {
    load()
  }, [])
  const current = s.settings.orModel
  if (!list) return <div className="muted">Chargement des modèles gratuits…</div>
  // Le modèle choisi reste visible même s'il a disparu de la liste.
  const shown: FreeModel[] = list.some((m) => m.id === current) ? list : [{ id: current, name: current, context: 0, structured: false }, ...list]
  return (
    <div className="stack" style={{ gap: 8 }}>
      {error && (
        <div className="row">
          <span className="muted" style={{ fontSize: 13 }}>
            {error}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )}
      <div className="stack model-list" style={{ gap: 8 }}>
        {shown.map((m) => (
          <button key={m.id} className={`model-opt ${current === m.id ? 'on' : ''}`} onClick={() => s.setSettings({ orModel: m.id })}>
            <span className="radio-dot" />
            <div>
              <strong>{m.id === 'openrouter/free' ? 'Automatique (recommandé)' : m.name}</strong>
              <p>
                {m.id === 'openrouter/free'
                  ? 'OpenRouter choisit un modèle gratuit disponible à chaque requête : le plus fiable face aux quotas.'
                  : [m.id, m.context ? `${Math.round(m.context / 1000)} k jetons` : '', m.structured ? 'JSON structuré' : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

type Backup = { name: string; at: number; resumes: number; offers: number; letters: number }

function Backups() {
  const s = useStore()
  const [list, setList] = useState<Backup[] | null>(null)
  useEffect(() => {
    window.cvgen.listBackups().then(setList).catch(() => setList([]))
  }, [])
  const restore = async (b: Backup) => {
    const when = new Date(b.at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
    if (!confirm(`Restaurer la sauvegarde du ${when} (${b.resumes} CV) ? Vos données actuelles seront remplacées ; vous pourrez annuler juste après.`)) return
    const data = await window.cvgen.readBackup(b.name)
    if (!data) return s.toast({ kind: 'error', title: 'Sauvegarde illisible' })
    s.replaceData(data, `Sauvegarde du ${when} restaurée`)
  }
  if (!list) return <div className="muted">Chargement…</div>
  if (list.length === 0) return <div className="muted" style={{ fontSize: 13.5 }}>Aucune sauvegarde pour l’instant : une copie est créée à chaque lancement quand vos données ont changé.</div>
  return (
    <div className="line-table" style={{ width: '100%' }}>
      {list.map((b) => (
        <div key={b.name} className="line-row" style={{ alignItems: 'center', gridTemplateColumns: '1.4fr 1fr auto' }}>
          <span>{new Date(b.at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          <span className="muted">
            {b.resumes} CV · {b.offers} offres · {b.letters} lettres
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => restore(b)}>
            <History size={14} /> Restaurer
          </button>
        </div>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const s = useStore()
  const [key, setKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [name, setName] = useState(s.settings.userName)
  const or = s.settings.provider === 'openrouter'
  const hasKey = or ? s.settings.hasOpenRouterKey : s.settings.hasClaudeKey
  const providerName = or ? 'OpenRouter' : 'Claude'

  const runTest = async (saved: boolean) => {
    setTesting(true)
    const res = await window.cvgen.testApiKey().catch((e: Error) => ({ ok: false, error: e.message }))
    setTesting(false)
    if (res.ok) s.toast({ kind: 'success', title: saved ? 'Clé enregistrée' : `Connexion à ${providerName} réussie`, detail: saved ? 'L’IA est prête.' : undefined })
    else s.toast({ kind: 'error', title: saved ? 'Clé enregistrée mais le test a échoué' : 'Échec du test', detail: res.error })
  }

  const saveKey = async () => {
    const settings = await window.cvgen.setApiKey(key, s.settings.provider)
    useStore.setState({ settings })
    setKey('')
    if (!(or ? settings.hasOpenRouterKey : settings.hasClaudeKey)) return s.toast({ kind: 'info', title: 'Clé supprimée' })
    await runTest(true)
  }

  return (
    <div className="page" style={{ maxWidth: 1040 }}>
      <div className="page-head">
        <h1>
          Paramètres
        </h1>
      </div>

      <div className="settings-grid">
        <div>
          <h3>Intelligence artificielle</h3>
          <p className="desc">Import de CV, analyse d’offres, adaptation, réécriture, lettres et assistant.</p>
        </div>
        <div className="stack">
          <div className="seg" style={{ width: 'fit-content' }}>
            <button className={!or ? 'on' : ''} onClick={() => s.setSettings({ provider: 'anthropic' })}>
              Claude
            </button>
            <button className={or ? 'on' : ''} onClick={() => s.setSettings({ provider: 'openrouter' })}>
              OpenRouter · gratuit
            </button>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {or
              ? 'Modèles open source gratuits via OpenRouter : pratique pour démarrer, mais qualité variable et quotas limités (environ 20 requêtes par minute).'
              : 'Meilleure qualité de rédaction et d’adaptation, facturé à l’usage par Anthropic.'}
          </p>
        </div>
      </div>

      <div className="settings-grid">
        <div>
          <h3>Clé API {providerName}</h3>
          <p className="desc">{or ? 'Gratuite : créez un compte puis une clé, sans carte bancaire.' : 'Utilisée uniquement quand Claude est le fournisseur actif.'}</p>
        </div>
        <div className="stack">
          <div className="row">
            <span className={`tag ${hasKey ? 'ok' : 'warn'}`}>{hasKey ? 'Clé configurée' : 'Aucune clé'}</span>
            {hasKey && (
              <button className="btn btn-ghost btn-sm" onClick={() => runTest(false)} disabled={testing}>
                {testing ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Tester la connexion
              </button>
            )}
          </div>
          <div className="row">
            <input
              className="input"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={hasKey ? '••••••••••••  (laisser vide puis Enregistrer pour supprimer)' : or ? 'sk-or-…' : 'sk-ant-…'}
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn btn-ink" onClick={saveKey} disabled={testing}>
              <KeyRound size={15} /> Enregistrer
            </button>
          </div>
          <div className="callout" style={{ fontSize: 13 }}>
            <ShieldCheck size={16} />
            <span>
              {s.settings.encryptionAvailable
                ? 'La clé est chiffrée avec le coffre Windows (DPAPI) et reste dans le processus principal : l’interface n’y a jamais accès.'
                : 'Le chiffrement système est indisponible : la clé est stockée localement sans chiffrement.'}{' '}
              Obtenez une clé sur{' '}
              <a href="#" onClick={(e) => (e.preventDefault(), window.cvgen.openExternal(or ? 'https://openrouter.ai/settings/keys' : 'https://platform.claude.com/'))}>
                {or ? 'openrouter.ai/settings/keys' : 'platform.claude.com'}
              </a>
              .
            </span>
          </div>
          {or && (
            <div className="callout" style={{ fontSize: 13 }}>
              <Info size={16} />
              <span>
                Les fournisseurs des modèles gratuits peuvent conserver vos requêtes (donc le contenu de votre CV) pour entraîner leurs modèles. Si un modèle est
                refusé, autorisez les modèles gratuits dans{' '}
                <a href="#" onClick={(e) => (e.preventDefault(), window.cvgen.openExternal('https://openrouter.ai/settings/privacy'))}>
                  vos réglages de confidentialité OpenRouter
                </a>
                .
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="settings-grid">
        <div>
          <h3>Modèle</h3>
          <p className="desc">{or ? 'Modèles gratuits, liste mise à jour par OpenRouter.' : 'Utilisé pour toutes les fonctions IA.'}</p>
        </div>
        {or ? (
          <FreeModels />
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {MODELS.map((m) => (
              <button key={m.id} className={`model-opt ${s.settings.model === m.id ? 'on' : ''}`} onClick={() => s.setSettings({ model: m.id })}>
                <span className="radio-dot" />
                <div>
                  <strong>{m.name}</strong>
                  <p>{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="settings-grid">
        <div>
          <h3>Apparence</h3>
          <p className="desc">Thème de l’application (les CV restent toujours sur fond blanc).</p>
        </div>
        <div className="seg" style={{ alignSelf: 'start', width: 'fit-content' }}>
          {(['light', 'dark', 'system'] as Settings['theme'][]).map((t) => (
            <button key={t} className={s.settings.theme === t ? 'on' : ''} onClick={() => s.setSettings({ theme: t })}>
              {t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : 'Système'}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-grid">
        <div>
          <h3>Votre prénom</h3>
          <p className="desc">Affiché sur le tableau de bord.</p>
        </div>
        <div className="row">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" />
          <button className="btn btn-soft" onClick={() => s.setSettings({ userName: name.trim() }).then(() => s.toast({ kind: 'success', title: 'Enregistré' }))}>
            Enregistrer
          </button>
        </div>
      </div>

      <div className="settings-grid">
        <div>
          <h3>Sauvegardes</h3>
          <p className="desc">Copies horodatées créées au lancement (les 15 plus récentes). Restaurer est annulable.</p>
        </div>
        <Backups />
      </div>

      <div className="settings-grid" data-tour="updates">
        <div>
          <h3>Mises à jour</h3>
          <p className="desc">Les nouvelles versions publiées sur GitHub se téléchargent en arrière-plan et s’installent à la fermeture de l’app.</p>
        </div>
        <UpdatesSettings />
      </div>

      <div className="settings-grid" data-tour="tours">
        <div>
          <h3>Tutoriels</h3>
          <p className="desc">Une visite guidée par page, affichée à la première visite. Le bouton ? de la barre relance celle de la page affichée.</p>
        </div>
        <ToursSettings />
      </div>

      <div className="settings-grid">
        <div>
          <h3>Données</h3>
          <p className="desc">Vos CV, offres et lettres sont stockés uniquement sur cet ordinateur.</p>
        </div>
        <div>
          <button className="btn btn-outline" onClick={() => window.cvgen.openDataFolder()}>
            <FolderOpen size={15} /> Ouvrir le dossier des données
          </button>
        </div>
      </div>

      <div className="settings-grid" style={{ borderBottom: 0 }}>
        <div>
          <h3>Comment CV GEN garantit la compatibilité ATS</h3>
        </div>
        <ul className="clean" style={{ fontSize: 14 }}>
          <li>Mise en page en une colonne : l’ordre de lecture du PDF suit l’ordre visuel.</li>
          <li>PDF balisé (tagged PDF) avec vrais titres et listes, polices intégrées, texte sélectionnable.</li>
          <li>Intitulés de sections standards reconnus par les parseurs, en français et en anglais.</li>
          <li>Coordonnées dans le corps du document, jamais dans un en-tête ou pied de page.</li>
          <li>Dates normalisées MM/AAAA et export Word natif pour les ATS les plus anciens.</li>
          <li>Score local transparent : structure, contenu et mots-clés de l’offre, sans envoyer vos données.</li>
        </ul>
      </div>
    </div>
  )
}
