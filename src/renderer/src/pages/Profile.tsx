import { Copy, FileUp, LayoutGrid, RefreshCcw, Sparkles, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EducationForm, ExperienceForm, ExtrasForm, IdentityForm, SkillsForm, SummaryForm } from '../components/EditorForms'
import { PaperThumb } from '../components/PaperThumb'
import { GalleryForm } from '../components/VisualForms'
import { Modal } from '../components/ui'
import { applyProfileTo, hasProfile, profileAs, profileCompletion, type SyncScope } from '../lib/profile'
import { blankResume, isEmptyResume } from '../lib/sample'
import { useStore } from '../store'
import { TEMPLATES } from '../templates/registry'

const TABS = [
  { id: 'identity', label: 'Identité' },
  { id: 'summary', label: 'Profil' },
  { id: 'experience', label: 'Expériences' },
  { id: 'skills', label: 'Compétences' },
  { id: 'education', label: 'Formation' },
  { id: 'extras', label: 'Plus' },
  { id: 'gallery', label: 'Portfolio' }
] as const
type Tab = (typeof TABS)[number]['id']

/**
 * Mon profil : toutes vos informations saisies une seule fois. Les modèles, presets,
 * l'explorateur de couleurs et les nouveaux CV les reprennent automatiquement.
 */
export default function ProfilePage() {
  const s = useStore()
  const [tab, setTab] = useState<Tab>('identity')
  const [tpl, setTpl] = useState('vitrine')
  const [sync, setSync] = useState(false)
  const profile = useMemo(() => s.data.profile ?? { ...blankResume('vitrine'), id: 'profile', title: 'Mon profil' }, [s.data.profile])
  const filled = hasProfile(s.data)
  const on = s.data.profileMode !== false
  const { percent, missing } = profileCompletion(s.data.profile)
  const mine = s.data.resumes.filter((r) => !isEmptyResume(r)).sort((a, b) => b.updatedAt - a.updatedAt)
  const up = (fn: (r: typeof profile) => void) => s.updateProfile(fn)
  const preview = useMemo(() => profileAs(profile, tpl), [profile, tpl])

  const fillFrom = (id: string) => {
    const r = mine.find((x) => x.id === id)
    if (!r) return
    s.withUndo(`Profil rempli depuis « ${r.title} »`, () => s.setProfile(structuredClone(r)))
  }
  const importCv = async () => {
    const imported = await s.run('Lecture du CV par l’IA…', () => window.cvgen.ai.importResume())
    if (!imported) return
    s.withUndo('Profil rempli depuis le CV importé', () => s.setProfile({ ...blankResume('vitrine'), ...imported }))
  }

  return (
    <div className="page">
      <div className="hero">
        <div className="mono-label">mon profil</div>
        <h1>
          Vos infos, <em>une seule fois</em>.
        </h1>
        <p>Remplissez votre profil : tous les modèles, presets et explorateurs s’affichent avec votre contenu, et chaque nouveau CV part de vos informations. Vous pouvez aussi reporter vos changements sur vos CV existants.</p>
      </div>

      <div className="pf-top">
        <div className="pf-meter">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Profil complété à {percent} %</strong>
            <span className="mono-label">{filled ? 'actif' : 'à remplir'}</span>
          </div>
          <div className="as-bar">
            <span style={{ width: `${percent}%`, background: percent >= 80 ? 'var(--success)' : percent >= 50 ? 'var(--warn)' : 'var(--text)' }} />
          </div>
          {missing.length > 0 && <small className="muted">À compléter : {missing.slice(0, 5).join(', ')}</small>}
        </div>
        <label className="pf-switch" title="Afficher les modèles, presets et explorateurs avec vos informations">
          <input type="checkbox" checked={on} onChange={(e) => s.setProfileMode(e.target.checked)} />
          <span>
            <b>Utiliser mon profil partout</b>
            <small>Modèles, presets, explorateur de couleurs, nouveaux CV</small>
          </span>
        </label>
        <div className="pf-actions">
          {mine.length > 0 && (
            <label className="pf-from">
              <Copy size={14} />
              <select
                className="select"
                value=""
                onChange={(e) => {
                  if (e.target.value) fillFrom(e.target.value)
                }}
              >
                <option value="">Remplir depuis un de mes CV…</option>
                {mine.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="btn btn-outline btn-sm" onClick={importCv} disabled={!s.settings.hasApiKey} title={s.settings.hasApiKey ? 'PDF, DOCX ou TXT lu par l’IA' : 'Clé API requise (Paramètres)'}>
            <FileUp size={14} /> Importer un CV
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setSync(true)} disabled={!filled || !s.data.resumes.length}>
            <RefreshCcw size={14} /> Appliquer à mes CV…
          </button>
          <button className="btn btn-ink btn-sm" onClick={() => s.go({ name: 'templates' })} disabled={!filled}>
            <LayoutGrid size={14} /> Voir tous les modèles avec mon profil
          </button>
        </div>
      </div>

      <div className="pf-grid">
        <div className="pf-form">
          <div className="section-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="form-body editor-form">
            {tab === 'identity' && <IdentityForm r={profile} up={up} />}
            {tab === 'summary' && <SummaryForm r={profile} up={up} />}
            {tab === 'experience' && <ExperienceForm r={profile} up={up} />}
            {tab === 'skills' && <SkillsForm r={profile} up={up} />}
            {tab === 'education' && <EducationForm r={profile} up={up} />}
            {tab === 'extras' && <ExtrasForm r={profile} up={up} />}
            {tab === 'gallery' && <GalleryForm r={profile} up={up} />}
          </div>
        </div>
        <aside className="pf-preview">
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <div className="mono-label">aperçu en direct</div>
            <select className="select pf-tpl" value={tpl} onChange={(e) => setTpl(e.target.value)}>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.visual ? ' · visuel' : ' · ATS'}
                </option>
              ))}
            </select>
          </div>
          {filled ? (
            <PaperThumb resume={preview} rounded />
          ) : (
            <div className="pf-empty">
              <UserRound size={26} />
              <strong>Votre CV apparaîtra ici</strong>
              <span>Commencez par votre identité, ou remplissez le profil depuis un CV existant.</span>
            </div>
          )}
        </aside>
      </div>

      {sync && <SyncModal onClose={() => setSync(false)} />}
    </div>
  )
}

/** Reporter le profil sur des CV existants (coordonnées ou tout le contenu), annulable. */
function SyncModal({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [scope, setScope] = useState<SyncScope>('contact')
  const [ids, setIds] = useState<string[]>(() => s.data.resumes.map((r) => r.id))
  const apply = () => {
    const p = s.data.profile
    if (!p) return
    s.withUndo(`Profil appliqué à ${ids.length} CV`, () => ids.forEach((id) => s.updateResume(id, (r) => applyProfileTo(r, p, scope))), scope === 'contact' ? 'Coordonnées et photo mises à jour' : 'Tout le contenu remplacé')
    onClose()
  }
  return (
    <Modal
      title="Appliquer mon profil à mes CV"
      icon={<Sparkles size={16} />}
      onClose={onClose}
      footer={
        <>
          <span style={{ marginRight: 'auto' }} />
          <button className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-ink" onClick={apply} disabled={!ids.length}>
            Appliquer à {ids.length} CV
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <div className="seg" style={{ width: 'fit-content' }}>
          <button className={scope === 'contact' ? 'on' : ''} onClick={() => setScope('contact')}>
            Coordonnées et photo
          </button>
          <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>
            Tout le contenu
          </button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          {scope === 'contact'
            ? 'Nom, e-mail, téléphone, ville, liens et photo sont mis à jour ; le titre, le profil et le parcours propres à chaque CV sont conservés.'
            : 'Chaque CV reprend tout le contenu du profil. Le modèle et les couleurs de chaque CV sont conservés.'}{' '}
          Annulable juste après.
        </p>
        <div className="pf-list">
          {s.data.resumes.map((r) => (
            <label key={r.id} className="check">
              <input type="checkbox" checked={ids.includes(r.id)} onChange={(e) => setIds((cur) => (e.target.checked ? [...cur, r.id] : cur.filter((x) => x !== r.id)))} />
              {r.title}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}
