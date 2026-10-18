import { Check } from 'lucide-react'
import { useStore } from '../store'
import { StudioGallery } from './StudioGallery'
import { isDesignTemplate } from '../templates/designCatalog'
import { useMemo, useState } from 'react'
import { profileAs, useActiveProfile } from '../lib/profile'
import { genderOf, sampleFor, sampleResume } from '../lib/sample'
import { CORE_TEMPLATES, STUDIO_TEMPLATES, TEMPLATE_TAGS, previewOf, type TemplateDef } from '../templates/registry'
import { PaperThumb } from './PaperThumb'
import { Modal } from './ui'

/** Aperçu d'un modèle : image pré-rendue, ou rendu live si l'image n'existe pas encore. */
export function TemplatePreview({ id, rounded }: { id: string; rounded?: boolean }) {
  const profile = useActiveProfile()
  const mineAs = useMemo(() => (profile ? profileAs(profile, id) : null), [profile, id])
  if (mineAs) return <PaperThumb resume={mineAs} rounded={rounded} />
  return <SamplePreview id={id} rounded={rounded} />
}

function SamplePreview({ id, rounded }: { id: string; rounded?: boolean }) {
  const gender = useStore((s) => s.previewGender)
  const usual = previewOf(id)
  // Image pré-rendue (profil habituel) si elle correspond au choix « Fille / Garçon ».
  const src = usual && (gender === 'all' || genderOf(sampleResume(id)) === gender) ? usual : undefined
  const sample = useMemo(() => (src ? null : sampleFor(id, gender)), [id, src, gender])
  if (src)
    return (
      <div className={`paper-thumb tpl-preview ${rounded ? 'rounded' : ''}`}>
        <img src={src} alt="" loading="lazy" decoding="async" />
      </div>
    )
  return <PaperThumb resume={sample!} rounded={rounded} />
}

/** Sélecteur visuel de modèle (éditeur) : filtres et grandes vignettes. */
export function TemplatePicker({ current, onPick, onClose }: { current: string; onPick: (t: TemplateDef) => void; onClose: () => void }) {
  const [tag, setTag] = useState('Tous')
  // Deux catalogues : les modèles d'origine, et les modèles du studio de design.
  const [cat, setCat] = useState<'core' | 'studio'>(() => (isDesignTemplate(current) ? 'studio' : 'core'))
  const list = CORE_TEMPLATES.filter((t) => tag === 'Tous' || t.tags.includes(tag))
  return (
    <Modal size="xl" title="Choisir un modèle" onClose={onClose}>
      <div className="tpl-filters">
      <div className="seg" style={{ width: 'fit-content' }}>
        <button className={cat === 'core' ? 'on' : ''} onClick={() => setCat('core')}>
          Modèles ({CORE_TEMPLATES.length})
        </button>
        <button className={cat === 'studio' ? 'on' : ''} onClick={() => setCat('studio')}>
          Studio de design ({STUDIO_TEMPLATES.length})
        </button>
      </div>
      <GenderToggle />
      </div>
      {cat === 'studio' ? (
        <StudioGallery compact current={current} onPick={onPick} />
      ) : (
      <>
      <div className="chips" style={{ marginBottom: 18 }}>
        {TEMPLATE_TAGS.map((t) => (
          <button key={t} className={`chip ${tag === t ? 'active' : ''}`} onClick={() => setTag(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="picker-grid">
        {list.map((t) => (
          <button key={t.id} className={`picker-item ${t.id === current ? 'on' : ''}`} onClick={() => onPick(t)}>
            <div className="picker-frame">
              <TemplatePreview id={t.id} />
              {t.id === current && (
                <span className="picker-check">
                  <Check size={14} />
                </span>
              )}
            </div>
            <div className="picker-meta">
              <strong>{t.name}</strong>
              <span className="mono-tag">{t.visual ? 'Visuel' : 'ATS'}</span>
            </div>
          </button>
        ))}
      </div>
      </>
      )}
    </Modal>
  )
}

/** « Aperçus : Mixtes / Fille / Garçon » : change le profil d'exemple de tous les aperçus. */
export function GenderToggle() {
  const g = useStore((s) => s.previewGender)
  const set = useStore((s) => s.setPreviewGender)
  return (
    <div className="gender-toggle" title="Profil d’exemple affiché dans les aperçus et dans les CV créés depuis l’exemple">
      <span className="mono-label">aperçus</span>
      <div className="seg">
        {(
          [
            ['all', 'Mixtes'],
            ['f', 'Fille'],
            ['m', 'Garçon']
          ] as const
        ).map(([v, l]) => (
          <button key={v} className={g === v ? 'on' : ''} onClick={() => set(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
