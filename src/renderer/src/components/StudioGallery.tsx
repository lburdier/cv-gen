import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { DESIGN_FAMILIES, DESIGN_PALETTES } from '../templates/designCatalog'
import { STUDIO_TEMPLATES, type TemplateDef } from '../templates/registry'
import { TemplatePreview } from './TemplatePicker'

const PAGE = 24
const HUES = [...new Set(DESIGN_PALETTES.map((p) => p.hue))]
const HUE_COLOR = Object.fromEntries(DESIGN_PALETTES.map((p) => [p.hue, p.primary]))

/**
 * Studio de design : 200 modèles filtrables par famille, couleur, fond et nom.
 * Les aperçus sont rendus à la volée, par lots, au fil du défilement.
 */
export function StudioGallery({ onPick, current, compact }: { onPick: (t: TemplateDef) => void; current?: string; compact?: boolean }) {
  const [family, setFamily] = useState('Toutes')
  const [hue, setHue] = useState('Toutes')
  const [tone, setTone] = useState<'all' | 'light' | 'dark'>('all')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return STUDIO_TEMPLATES.filter(
      (t) =>
        (family === 'Toutes' || t.studio!.family === family) &&
        (hue === 'Toutes' || t.studio!.hue === hue) &&
        (tone === 'all' || (tone === 'dark') === t.studio!.dark) &&
        (!n || t.name.toLowerCase().includes(n) || t.tagline.toLowerCase().includes(n))
    )
  }, [family, hue, tone, q])

  const reset = (fn: () => void) => {
    fn()
    setShown(PAGE)
  }

  return (
    <div className="studio">
      <div className="studio-filters">
        <label className="studio-search">
          <Search size={15} />
          <input value={q} placeholder="Rechercher : Atlas, Corail, vagues…" onChange={(e) => reset(() => setQ(e.target.value))} aria-label="Rechercher un modèle du studio" />
        </label>
        <div className="seg">
          {(
            [
              ['all', 'Tous les fonds'],
              ['light', 'Clairs'],
              ['dark', 'Contrastés']
            ] as const
          ).map(([v, l]) => (
            <button key={v} className={tone === v ? 'on' : ''} onClick={() => reset(() => setTone(v))}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="chips studio-chips">
        {['Toutes', ...DESIGN_FAMILIES].map((f) => (
          <button key={f} className={`chip ${family === f ? 'active' : ''}`} onClick={() => reset(() => setFamily(f))}>
            {f}
          </button>
        ))}
      </div>
      <div className="chips studio-chips">
        {['Toutes', ...HUES].map((h) => (
          <button key={h} className={`chip ${hue === h ? 'active' : ''}`} onClick={() => reset(() => setHue(h))}>
            {h !== 'Toutes' && <span className="studio-dot" style={{ background: HUE_COLOR[h] }} />}
            {h === 'Toutes' ? 'Toutes les couleurs' : h}
          </button>
        ))}
      </div>
      <p className="muted studio-count">
        {list.length} modèle{list.length > 1 ? 's' : ''}
      </p>
      <div className={compact ? 'picker-grid' : 'gallery lg'}>
        {list.slice(0, shown).map((t) =>
          compact ? (
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
                <span>{t.studio!.family}</span>
              </div>
            </button>
          ) : (
            <button key={t.id} className="shot" onClick={() => onPick(t)}>
              <div className="shot-frame" style={{ padding: '26px 30px 0' }}>
                <TemplatePreview id={t.id} />
              </div>
              <div className="shot-meta">
                <div className="shot-logo" style={{ color: t.accent }}>
                  {t.name.slice(0, 2)}
                </div>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.tagline}</span>
                </div>
              </div>
            </button>
          )
        )}
      </div>
      {shown < list.length && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
          <button className="btn btn-outline" onClick={() => setShown((n) => n + PAGE)}>
            Afficher {Math.min(PAGE, list.length - shown)} modèles de plus ({list.length - shown} restants)
          </button>
        </div>
      )}
    </div>
  )
}
