import { Check, ImagePlus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ICON_CATEGORIES, ICON_DESIGNS, REAL_LOGO_COUNT, SOFTWARE, iconDataUrl, logoSource, type IconDesign, type SoftwareIcon } from '../lib/iconBank'
import { Modal } from './ui'

/** Sélecteur de design : six pastilles qui montrent le même logiciel dans chaque style. */
export function DesignSwatches({ value, onChange, sample = 'photoshop' }: { value: IconDesign; onChange: (d: IconDesign) => void; sample?: string }) {
  const s = SOFTWARE.find((x) => x.id === sample) ?? SOFTWARE[0]
  return (
    <div className="ib-designs" role="radiogroup" aria-label="Design des icônes">
      {ICON_DESIGNS.map((d) => (
        <button key={d.id} role="radio" aria-checked={value === d.id} className={value === d.id ? 'on' : ''} onClick={() => onChange(d.id)} title={d.label}>
          <img src={iconDataUrl(s, d.id)} alt="" />
          <span>{d.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Banque d'icônes de logiciels.
 *  - mode « add » : on coche les logiciels à afficher dans les tuiles du CV ;
 *  - mode « pick » : on choisit l'icône d'un élément précis (ou on importe une image).
 */
export function IconBankModal({
  mode,
  item,
  design,
  onDesign,
  selected = [],
  onToggle,
  onPick,
  onUpload,
  onClose
}: {
  mode: 'add' | 'pick'
  item?: string
  design: IconDesign
  onDesign: (d: IconDesign) => void
  selected?: string[]
  onToggle?: (s: SoftwareIcon) => void
  onPick?: (s: SoftwareIcon) => void
  onUpload?: () => void
  onClose: () => void
}) {
  const [q, setQ] = useState(item ?? '')
  const [cat, setCat] = useState('Tous')
  const norm = (x: string) =>
    x
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  const list = useMemo(() => {
    const nq = norm(q.trim())
    return SOFTWARE.filter((s) => (cat === 'Tous' || s.category === cat) && (!nq || norm(s.name).includes(nq) || s.aliases.some((a) => a.includes(nq)) || norm(s.code) === nq))
  }, [q, cat])
  const sel = new Set(selected.map(norm))
  return (
    <Modal
      size="xl"
      title={mode === 'pick' ? `Icône de « ${item} »` : 'Banque d’icônes de logiciels'}
      onClose={onClose}
      footer={
        <>
          <span className="muted" style={{ marginRight: 'auto', fontSize: 12.5 }}>
            {SOFTWARE.length} logiciels · {REAL_LOGO_COUNT} logos officiels (Simple Icons, Devicon), les autres en icônes aux couleurs de la marque
          </span>
          {mode === 'pick' && onUpload && (
            <button className="btn btn-ghost" onClick={onUpload}>
              <ImagePlus size={15} /> Importer une image
            </button>
          )}
          <button className="btn btn-ink" onClick={onClose}>
            {mode === 'add' ? 'Terminé' : 'Fermer'}
          </button>
        </>
      }
    >
      <div className="ib">
        <div className="ib-top">
          <label className="ib-search">
            <Search size={15} />
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher : Figma, Blender, Excel…" autoFocus />
          </label>
          <DesignSwatches value={design} onChange={onDesign} />
        </div>
        <div className="chips" style={{ gap: 6 }}>
          {ICON_CATEGORIES.map((c) => (
            <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="ib-grid">
          {list.map((s) => {
            const on = sel.has(norm(s.name))
            return (
              <button key={s.id} className={`ib-cell ${on ? 'on' : ''}`} onClick={() => (mode === 'add' ? onToggle?.(s) : onPick?.(s))} title={logoSource(s) ? `${s.name} — logo officiel (${logoSource(s) === 'simple-icons' ? 'Simple Icons' : 'Devicon'})` : `${s.name} — icône aux couleurs de la marque`}>
                <img src={iconDataUrl(s, design)} alt="" loading="lazy" />
                <span>{s.name}</span>
                {on && (
                  <i className="ib-check">
                    <Check size={11} strokeWidth={3} />
                  </i>
                )}
              </button>
            )
          })}
          {!list.length && <div className="muted">Aucun logiciel trouvé : importez votre propre image depuis la tuile.</div>}
        </div>
      </div>
    </Modal>
  )
}
