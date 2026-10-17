import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { profileAs, useActiveProfile } from '../lib/profile'
import { sampleResume } from '../lib/sample'
import { TEMPLATES, TEMPLATE_TAGS, previewOf, type TemplateDef } from '../templates/registry'
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
  const src = previewOf(id)
  const sample = useMemo(() => (src ? null : sampleResume(id)), [id, src])
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
  const list = TEMPLATES.filter((t) => tag === 'Tous' || t.tags.includes(tag))
  return (
    <Modal size="xl" title="Choisir un modèle" onClose={onClose}>
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
    </Modal>
  )
}
