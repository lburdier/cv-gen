import { ArrowRight, Check, ImagePlus, Palette, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { GenderToggle } from '../components/TemplatePicker'
import { StudioGallery } from '../components/StudioGallery'
import { useState } from 'react'
import { TemplatePreview } from '../components/TemplatePicker'
import { Mark } from '../components/Shell'
import { Modal } from '../components/ui'
import { actions } from '../lib/actions'
import { PRESETS, PRESET_SECTORS, type PresetDef } from '../lib/presets'
import { hasProfile, useActiveProfile } from '../lib/profile'
import { isEmptyResume, presetAs, presetName } from '../lib/sample'
import { useStore } from '../store'
import { CORE_TEMPLATES, STUDIO_TEMPLATES, TEMPLATES, TEMPLATE_TAGS, getTemplate, type TemplateDef } from '../templates/registry'

const GUARANTEES = [
  'Une seule colonne, ordre de lecture linéaire',
  'Vrais titres et listes à puces (PDF balisé)',
  'Aucune image, icône ou tableau porteur d’information',
  'Intitulés de sections standards FR / EN',
  'Dates au format MM/AAAA',
  'Export Word natif en un clic'
]

export default function Templates() {
  const s = useStore()
  const [tag, setTag] = useState('Tous')
  const [kind, setKind] = useState<'all' | 'ats' | 'visual'>('all')
  const profile = useStore((st) => (hasProfile(st.data) ? st.data.profile! : null))
  const profileOn = useStore((st) => st.data.profileMode !== false)
  const [open, setOpen] = useState<TemplateDef | null>(null)
  const [sector, setSector] = useState('Tous')
  const [preset, setPreset] = useState<PresetDef | null>(null)
  const list = CORE_TEMPLATES.filter((t) => (tag === 'Tous' || t.tags.includes(tag)) && (kind === 'all' || (kind === 'visual') === Boolean(t.visual)))
  const presets = PRESETS.filter((p) => sector === 'Tous' || p.sector === sector)

  const applyTo = (resumeId: string, t: TemplateDef) => {
    s.applyTemplate(resumeId, t.id)
    setOpen(null)
    s.go({ name: 'editor', id: resumeId })
  }
  // CV le plus récent avec du contenu : base pour « Avec mes infos ».
  const mine = [...s.data.resumes].sort((a, b) => b.updatedAt - a.updatedAt).find((r) => !isEmptyResume(r))
  const fromMine = (t: TemplateDef) => {
    if (!mine) return
    const c = s.duplicateResume(mine.id, { title: `${mine.title} · ${t.name}`, templateId: t.id, accent: t.accent, font: t.font })
    setOpen(null)
    if (c) s.go({ name: 'editor', id: c.id })
  }

  return (
    <div className="page">
      <div className="hero">
        <div className="mono-label">
          modèles
        </div>
        <h1>
          Un CV <em>vitrine</em> pour les recruteurs, un CV <em>ATS</em> pour les robots.
        </h1>
        <p>
          {TEMPLATES.length} modèles et {PRESETS.length} presets complets par métier. Les modèles visuels mettent en scène votre portfolio, les modèles une colonne passent tous les filtres ATS, et chaque modèle visuel s’exporte aussi en version ATS du même contenu.
        </p>
        <button className="btn btn-outline" style={{ marginTop: 18 }} onClick={() => document.getElementById('presets')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          Voir les presets par métier <ArrowRight size={15} />
        </button>
        <button className="btn btn-ink" style={{ marginTop: 18, marginLeft: 8 }} onClick={() => s.go({ name: 'colors' })}>
          <Palette size={15} /> Explorer par couleurs
        </button>
        <button className="btn btn-outline" style={{ marginTop: 18, marginLeft: 8 }} onClick={() => s.go({ name: 'from-image' })}>
          <ImagePlus size={15} /> Recréer depuis une image
        </button>
      </div>

      <div className={`pf-banner ${profile && profileOn ? 'on' : ''}`}>
        <UserRound size={18} />
        {profile ? (
          <>
            <span>
              {profileOn ? 'Tous les modèles et presets s’affichent avec votre profil' : 'Aperçus avec le contenu d’exemple'}
              <small>
                {profile.basics.firstName} {profile.basics.lastName} · {profile.basics.headline || 'titre à compléter'}
              </small>
            </span>
            <div className="seg">
              <button className={profileOn ? 'on' : ''} onClick={() => s.setProfileMode(true)}>
                Mon profil
              </button>
              <button className={!profileOn ? 'on' : ''} onClick={() => s.setProfileMode(false)}>
                Exemples
              </button>
            </div>
          </>
        ) : (
          <>
            <span>
              Remplissez votre profil une seule fois
              <small>Chaque modèle et chaque preset s’afficheront avec vos informations.</small>
            </span>
            <button className="btn btn-ink btn-sm" onClick={() => s.go({ name: 'profile' })}>
              Créer mon profil
            </button>
          </>
        )}
      </div>

      <div className="tpl-filters">
        <div className="seg">
          {(
            [
              ['all', 'Tous les types'],
              ['ats', 'ATS une colonne'],
              ['visual', 'Visuels']
            ] as const
          ).map(([v, l]) => (
            <button key={v} className={kind === v ? 'on' : ''} onClick={() => setKind(v)}>
              {l}
            </button>
          ))}
        </div>
        <GenderToggle />
      </div>
      <div className="chips" style={{ marginBottom: 26 }}>
        {TEMPLATE_TAGS.map((t) => (
          <button key={t} className={`chip ${tag === t ? 'active' : ''}`} onClick={() => setTag(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="gallery lg">
        {list.map((t) => (
          <button key={t.id} className="shot" onClick={() => setOpen(t)}>
            <div className="shot-frame" style={{ padding: '26px 30px 0' }}>
              <TemplatePreview id={t.id} />
            </div>
            <div className="shot-meta">
              <div className="shot-logo" style={{ color: t.accent === '#000000' || t.accent === '#111111' ? 'var(--text)' : t.accent }}>{t.name.slice(0, 2)}</div>
              <div>
                <strong>
                  {t.name} {t.isNew && <span className="badge">Nouveau</span>}
                </strong>
                <span>{t.tagline}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <section className="studio-section" id="studio">
        <div className="hero presets-head">
          <div className="mono-label">studio de design</div>
          <h2>
            {STUDIO_TEMPLATES.length} modèles <em>à composer</em>.
          </h2>
          <p>Cinquante structures inspirées des meilleurs CV réels, déclinées en dix palettes : colonnes latérales, bandeaux, mises en page éditoriales, CV compacts, corporate ou élégants, titres à filet, icônes de contact. Chacun se retouche entièrement, dans l’onglet Design ou directement sur la toile, et s’exporte aussi en version ATS.</p>
        </div>
        <StudioGallery onPick={setOpen} />
      </section>

      <section className="presets" id="presets">
        <div className="hero presets-head">
          <div className="mono-label">presets complets</div>
          <h2>
            Un CV <em>complet</em> par métier, prêt à adapter.
          </h2>
          <p>Contenu réaliste rédigé selon les règles ATS (verbes d’action, résultats chiffrés, mots-clés du métier), modèle et couleur assortis. Remplacez les informations par les vôtres.</p>
        </div>
        <div className="tpl-filters" style={{ marginBottom: 26 }}>
        <div className="chips">
          {PRESET_SECTORS.map((sc) => (
            <button key={sc} className={`chip ${sector === sc ? 'active' : ''}`} onClick={() => setSector(sc)}>
              {sc}
              {sc !== 'Tous' && <span className="chip-count">{PRESETS.filter((p) => p.sector === sc).length}</span>}
            </button>
          ))}
        </div>
        <GenderToggle />
        </div>
        <div className="gallery lg">
          {presets.map((p) => {
            const tpl = getTemplate(p.templateId)
            return (
              <button key={p.id} className="shot" onClick={() => setPreset(p)}>
                <div className="shot-frame" style={{ padding: '26px 30px 0' }}>
                  <TemplatePreview id={p.templateId} />
                </div>
                <div className="shot-meta">
                  <div className="shot-logo preset-dot" style={{ background: tpl.accent }} />
                  <div>
                    <strong>{presetName(p.id, p.name, s.previewGender)}</strong>
                    <span>{p.tagline}</span>
                    <span className="mono-tag" style={{ marginTop: 8, width: 'fit-content' }}>
                      {p.sector} · modèle {tpl.name}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <div className="panel guarantee">
        <div>
          <div className="panel-icon" style={{ marginBottom: 12 }}>
            <ShieldCheck size={16} />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, letterSpacing: '-0.01em' }}>Garanti ATS : modèles une colonne et « version ATS »</h3>
          <p className="text-2" style={{ fontSize: 13.5 }}>
            Conçu selon les règles de parsing documentées des ATS courants (Workday, Taleo, Greenhouse, Lever, SmartRecruiters).
          </p>
        </div>
        <div className="grid-2" style={{ alignContent: 'center' }}>
          {GUARANTEES.map((g) => (
            <div key={g} className="row" style={{ fontSize: 14 }}>
              <Check size={16} style={{ color: 'var(--success)' }} /> {g}
            </div>
          ))}
        </div>
      </div>

      {preset && <PresetModal preset={preset} onClose={() => setPreset(null)} />}

      {open && (
        <Modal
          size="xl"
          title={`Modèle ${open.name}`}
          icon={<Mark size={16} />}
          onClose={() => setOpen(null)}
          footer={
            <>
              <span style={{ marginRight: 'auto' }} />
              <button className="btn btn-ghost" onClick={() => (setOpen(null), actions.newResume(open.id, false, true))} title="CV vide avec ce modèle">
                Page vierge
              </button>
              <button className={`btn ${mine || profile ? 'btn-soft' : 'btn-ink'}`} onClick={() => (setOpen(null), actions.newResume(open.id, true))} title="Contenu d’exemple à remplacer par le vôtre">
                <Sparkles size={15} /> Avec l’exemple
              </button>
              {profile && (
                <button className="btn btn-ink" onClick={() => (setOpen(null), actions.newFromProfile(open.id))} title="Nouveau CV avec toutes les informations de votre profil">
                  <UserRound size={15} /> Avec mon profil
                </button>
              )}
              {mine && !profile && (
                <button className="btn btn-ink" onClick={() => fromMine(open)} title={`Nouveau CV reprenant le contenu de « ${mine.title} »`}>
                  Avec mes infos
                </button>
              )}
            </>
          }
        >
          <div className="tpl-modal">
            <div className="tpl-modal-preview">
              <TemplatePreview id={open.id} rounded />
            </div>
            <div className="tpl-modal-side">
              <span className="pill-label">{open.visual ? 'Modèle visuel' : 'Modèle ATS'}</span>
              <p className="tpl-modal-desc">{open.tagline}</p>
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                {open.visual
                  ? 'Mise en page portfolio avec images et colonnes, idéale pour un envoi direct à un recruteur. L’export propose aussi une « PDF version ATS » du même contenu.'
                  : 'Une colonne, texte réel et intitulés standards : lisible à 100 % par les logiciels de recrutement.'}
              </p>
              <div className="chips" style={{ gap: 6 }}>
                {open.tags.map((tg) => (
                  <span key={tg} className="mono-tag">
                    {tg}
                  </span>
                ))}
              </div>
              {s.data.resumes.length > 0 && (
                <div className="stack" style={{ gap: 8, marginTop: 6 }}>
                  <div className="mono-label">appliquer à un cv existant</div>
                  <div className="tpl-modal-list">
                    {s.data.resumes.map((r) => (
                      <button key={r.id} className="offer-item" onClick={() => applyTo(r.id, open)}>
                        <strong>{r.title}</strong>
                        <span>{r.templateId === open.id ? 'Utilise déjà ce modèle' : 'Contenu conservé, design remplacé'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/** Détail d'un preset : aperçu, contenu inclus et création du CV. */
function PresetModal({ preset: p, onClose }: { preset: PresetDef; onClose: () => void }) {
  const tpl = getTemplate(p.templateId)
  const profile = useActiveProfile()
  const gender = useStore((st) => st.previewGender)
  const r = profile ?? presetAs(p.id, gender)
  const skills = r.skills.reduce((n, g) => n + g.items.length, 0)
  const facts = [
    [profile ? 'Contenu' : 'Personne fictive', profile ? `Votre profil · ${r.basics.firstName} ${r.basics.lastName}` : `${r.basics.firstName} ${r.basics.lastName}`],
    ['Poste visé', r.basics.headline],
    ['Expériences', `${r.experiences.length} postes, ${r.experiences.reduce((n, e) => n + e.bullets.length, 0)} réalisations`],
    ['Formation', `${r.education.length} diplôme${r.education.length > 1 ? 's' : ''}`],
    ['Compétences', `${skills} compétences en ${r.skills.length} groupes`],
    ['Modèle', `${tpl.name}${tpl.visual ? ' (visuel, avec version ATS)' : ' (ATS une colonne)'}`]
  ]
  return (
    <Modal
      size="xl"
      title={`Preset ${presetName(p.id, p.name, gender)}`}
      icon={<Mark size={16} />}
      onClose={onClose}
      footer={
        <>
          <span style={{ marginRight: 'auto' }} />
          <button className="btn btn-ghost" onClick={onClose}>
            Fermer
          </button>
          {profile && (
            <button className="btn btn-soft" onClick={() => (onClose(), actions.newFromPreset(p.id))}>
              Avec l’exemple
            </button>
          )}
          <button className="btn btn-ink" onClick={() => (onClose(), profile ? actions.newFromProfile(p.templateId, `CV · ${presetName(p.id, p.name, gender)}`) : actions.newFromPreset(p.id))}>
            <Sparkles size={15} /> {profile ? 'Créer avec mon profil' : 'Créer ce CV'}
          </button>
        </>
      }
    >
      <div className="tpl-modal">
        <div className="tpl-modal-preview">
          <TemplatePreview id={p.templateId} rounded />
        </div>
        <div className="tpl-modal-side">
          <span className="pill-label">{p.sector}</span>
          <p className="tpl-modal-desc">{p.tagline}</p>
          <div className="line-table preset-facts">
            {facts.map(([k, v]) => (
              <div key={k} className="line-row">
                <span className="muted">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            Le CV est créé dans « Mes CV » : changez librement de modèle ou de couleur, puis remplacez chaque information par la vôtre.
          </p>
        </div>
      </div>
    </Modal>
  )
}
