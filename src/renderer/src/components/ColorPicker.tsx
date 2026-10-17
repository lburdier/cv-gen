import { Check, LayoutGrid, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { ACCENTS } from '../templates/registry'
import { Dropdown } from './ui'

/** Palette complète, rangée par familles. */
export const PALETTE: { name: string; colors: string[] }[] = [
  { name: 'Neutres', colors: ['#000000', '#111111', '#2B2B2E', '#3F3F46', '#57534E', '#6B7280', '#78716C', '#A1A1AA'] },
  { name: 'Bleus', colors: ['#0B1F3A', '#1E2A4A', '#1E3A8A', '#2323E6', '#2563EB', '#0369A1', '#0284C7', '#0EA5E9'] },
  { name: 'Violets & roses', colors: ['#4C1D95', '#6D28D9', '#7C3AED', '#9333EA', '#C026D3', '#DB2777', '#BE185D', '#E11D74'] },
  { name: 'Verts', colors: ['#064E3B', '#0F6E5C', '#047857', '#15803D', '#16A34A', '#2FBF71', '#65A30D', '#4D7C0F'] },
  { name: 'Chauds', colors: ['#7F1D1D', '#B91C1C', '#DC2626', '#E4572E', '#EA580C', '#C2410C', '#B45309', '#A16207'] },
  { name: 'Vifs & pastels', colors: ['#C6F432', '#A3E635', '#FACC15', '#FDE047', '#F0A6F7', '#F9A8D4', '#93C5FD', '#5EEAD4'] }
]

const ALL = PALETTE.flatMap((g) => g.colors.map((c) => c.toLowerCase()))
const HEX = /^#?([\da-f]{6}|[\da-f]{3})$/i

function normalizeHex(v: string): string | null {
  const m = HEX.exec(v.trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return '#' + h.toUpperCase()
}

/**
 * Couleurs de l'éditeur : quelques pastilles rapides et un bouton « + » qui ouvre
 * la palette complète (familles, couleurs déjà utilisées, code hexadécimal, pipette).
 */
export function ColorPicker({
  value,
  templateDefault,
  onChange,
  onExplore
}: {
  value: string
  templateDefault: string
  onChange: (c: string) => void
  /** Ouvre l'explorateur : tous les modèles avec cette couleur. */
  onExplore?: () => void
}) {
  const resumes = useStore((s) => s.data.resumes)
  const current = value.toLowerCase()
  // La couleur choisie reste visible dans les pastilles même si elle vient de la palette complète.
  const quick = ACCENTS.some((c) => c.toLowerCase() === current) ? ACCENTS : [...ACCENTS.slice(0, ACCENTS.length - 1), value]
  // Couleurs personnalisées déjà utilisées dans d'autres CV.
  const used = [...new Set(resumes.map((r) => r.accent.toUpperCase()))].filter((c) => !ALL.includes(c.toLowerCase())).slice(0, 8)

  return (
    <div className="swatches">
      {quick.map((c) => (
        <button
          key={c}
          className={`swatch ${current === c.toLowerCase() ? 'on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`Couleur ${c}`}
          title={c.toUpperCase()}
        />
      ))}
      <Dropdown
        trigger={(toggle) => (
          <button className="swatch swatch-more" onClick={toggle} title="Plus de couleurs" aria-label="Plus de couleurs">
            <Plus size={12} strokeWidth={2.6} />
          </button>
        )}
      >
        {(close) => (
          <Palette
            value={value}
            templateDefault={templateDefault}
            used={used}
            onPick={(c, keepOpen) => {
              onChange(c)
              if (!keepOpen) close()
            }}
            onExplore={
              onExplore &&
              (() => {
                close()
                onExplore()
              })
            }
          />
        )}
      </Dropdown>
    </div>
  )
}

function Palette({
  value,
  templateDefault,
  used,
  onPick,
  onExplore
}: {
  value: string
  templateDefault: string
  used: string[]
  onPick: (c: string, keepOpen?: boolean) => void
  onExplore?: () => void
}) {
  const [hex, setHex] = useState(value.toUpperCase())
  useEffect(() => {
    setHex(value.toUpperCase())
  }, [value])
  const current = value.toLowerCase()
  const valid = normalizeHex(hex)

  const swatch = (c: string) => (
    <button key={c} className={`cp-swatch ${current === c.toLowerCase() ? 'on' : ''}`} style={{ background: c }} onClick={() => onPick(c)} title={c} aria-label={`Couleur ${c}`}>
      {current === c.toLowerCase() && <Check size={12} strokeWidth={3} />}
    </button>
  )

  return (
    <div className="cp" onMouseDown={(e) => e.stopPropagation()}>
      {PALETTE.map((g) => (
        <div key={g.name} className="cp-group">
          <div className="cp-label">{g.name}</div>
          <div className="cp-grid">{g.colors.map(swatch)}</div>
        </div>
      ))}
      {used.length > 0 && (
        <div className="cp-group">
          <div className="cp-label">Déjà utilisées</div>
          <div className="cp-grid">{used.map(swatch)}</div>
        </div>
      )}
      <div className="cp-custom">
        <input type="color" className="cp-native" value={valid ?? value} onChange={(e) => onPick(e.target.value.toUpperCase(), true)} title="Pipette et nuancier" />
        <input
          className="input cp-hex"
          value={hex}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => setHex(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && valid && onPick(valid)}
          placeholder="#2323E6"
          aria-label="Code hexadécimal"
        />
        <button className="cp-apply" disabled={!valid || valid.toLowerCase() === current} onClick={() => valid && onPick(valid)}>
          Appliquer
        </button>
      </div>
      {templateDefault.toLowerCase() !== current && (
        <button className="cp-reset" onClick={() => onPick(templateDefault)}>
          <RotateCcw size={13} /> Couleur du modèle
          <span className="cp-dot" style={{ background: templateDefault }} />
        </button>
      )}
      {onExplore && (
        <button className="cp-reset" onClick={onExplore}>
          <LayoutGrid size={13} /> Voir tous les modèles avec ces couleurs
        </button>
      )}
    </div>
  )
}
