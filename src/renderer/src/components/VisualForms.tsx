import { ArrowDown, ArrowUp, ImagePlus, Plus, Sparkles, Trash2, LayoutGrid, Images } from 'lucide-react'
import { findSoftware, resolveIcon, type IconDesign } from '../lib/iconBank'
import { DesignSwatches, IconBankModal } from './IconBank'
import { ImageBankModal } from './ImageBank'
import type { Resume } from '../../../shared/types'
import { useState, type DragEvent } from 'react'
import { chooseImage } from '../lib/image'
import { uid } from '../lib/sample'
import { isVisual } from '../templates/registry'
import { Field, SectionTitle, move } from './EditorForms'

type Up = (fn: (r: Resume) => void) => void

const getImage = chooseImage

/** Zone acceptant le dépôt d'un fichier image. */
function useDrop(onFile: (f: File) => void) {
  const [over, setOver] = useState(false)
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        e.preventDefault()
        setOver(true)
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        setOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
      }
    }
  }
}

function ImageField({
  label,
  value,
  onChange,
  round,
  bank
}: {
  label: string
  value?: string
  onChange: (v: string | undefined) => void
  round?: boolean
  /** Couleurs du CV : affiche le bouton « Banque d'images ». */
  bank?: { accent: string; accent2?: string }
}) {
  const [open, setOpen] = useState(false)
  const max = round ? 800 : 1800
  const choose = async (file?: File) => {
    const img = await getImage(max, file)
    if (img) onChange(img)
  }
  const drop = useDrop((f) => choose(f))
  return (
    <div className="field">
      <span>{label}</span>
      <div className={`img-field ${drop.over ? 'drop-over' : ''}`} {...drop.props} title="Cliquez sur Choisir ou déposez une image ici">
        {value ? (
          <img src={value} alt="" className={round ? 'round' : ''} />
        ) : (
          <div className={`img-empty ${round ? 'round' : ''}`}>
            <ImagePlus size={18} />
          </div>
        )}
        <div className="stack" style={{ gap: 6 }}>
          <button className="btn btn-soft btn-sm" onClick={() => choose()}>
            {value ? 'Remplacer' : 'Choisir'}
          </button>
          {bank && (
            <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)} title="Visuels assortis et photos libres de droits">
              <Images size={14} /> Banque d’images
            </button>
          )}
          {value && (
            <button className="btn btn-ghost btn-sm" onClick={() => onChange(undefined)}>
              Retirer
            </button>
          )}
        </div>
      </div>
      {open && bank && <ImageBankModal kind="banner" accent={bank.accent} accent2={bank.accent2} onPick={(img) => onChange(img)} onClose={() => setOpen(false)} />}
    </div>
  )
}

/** Hauteur par défaut du bandeau selon le modèle (px). */
const BANNER_DEFAULT: Record<string, number> = { vitrine: 186, studio: 186, folio: 62, colonne: 92 }

/** Icônes des tuiles d'outils : une image par logiciel (sinon monogramme coloré). */
export function IconEditor({ r, groupIndex, up }: { r: Resume; groupIndex: number; up: Up }) {
  const g = r.skills[groupIndex]
  const [bank, setBank] = useState<{ mode: 'add' | 'pick'; item?: string } | null>(null)
  const design = (g.iconStyle as IconDesign) ?? 'app'
  const auto = g.autoIcons !== false
  const setGroup = (fn: (x: Resume['skills'][number]) => void) => up((x) => fn(x.skills[groupIndex]))
  const setIcon = (item: string, value: string | null) =>
    setGroup((x) => {
      const icons = { ...(x.icons ?? {}) }
      if (value) icons[item] = value
      else delete icons[item]
      x.icons = icons
    })
  const upload = async (item: string, file?: File) => {
    const img = await getImage(256, file)
    if (img) setIcon(item, img)
  }
  return (
    <div className="icon-editor">
      <div className="icon-editor-top">
        <DesignSwatches value={design} onChange={(d) => setGroup((x) => void (x.iconStyle = d))} />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ink btn-sm" onClick={() => setBank({ mode: 'add' })}>
            <LayoutGrid size={14} /> Banque d’icônes
          </button>
          <label className="check" title="Associe automatiquement l’icône d’un logiciel connu à son nom">
            <input type="checkbox" checked={auto} onChange={(e) => setGroup((x) => void (x.autoIcons = e.target.checked))} /> Icônes automatiques
          </label>
        </div>
      </div>
      {g.items.length > 0 && (
        <div className="icon-grid">
          {g.items.map((item) => {
            const custom = g.icons?.[item]
            const icon = resolveIcon(item, custom, design, auto)
            const matched = !custom && auto ? findSoftware(item) : undefined
            return (
              <div
                key={item}
                className="icon-cell"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) void upload(item, file)
                }}
              >
                <button className="icon-thumb" onClick={() => setBank({ mode: 'pick', item })} title={`Choisir l’icône de « ${item} »`}>
                  {icon ? <img src={icon} alt="" /> : <ImagePlus size={15} />}
                </button>
                <span className="icon-name">
                  {item}
                  {matched && <small>auto</small>}
                </span>
                {custom && (
                  <button className="icon-btn sm" title="Revenir à l’icône automatique" onClick={() => setIcon(item, null)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {bank && (
        <IconBankModal
          mode={bank.mode}
          item={bank.item}
          design={design}
          onDesign={(d) => setGroup((x) => void (x.iconStyle = d))}
          selected={g.items}
          onToggle={(s) =>
            setGroup((x) => {
              const has = x.items.find((i) => i.toLowerCase() === s.name.toLowerCase())
              x.items = has ? x.items.filter((i) => i !== has) : [...x.items, s.name]
            })
          }
          onPick={(s) => {
            if (bank.item) setIcon(bank.item, `bank:${s.id}`)
            setBank(null)
          }}
          onUpload={() => {
            const item = bank.item
            setBank(null)
            if (item) void upload(item)
          }}
          onClose={() => setBank(null)}
        />
      )}
    </div>
  )
}

/** Photo, bandeau, mobilité, bouton d'action et liens : utilisés par les modèles visuels. */
export function VisualFields({ r, up }: { r: Resume; up: Up }) {
  const visual = isVisual(r.templateId)
  const b = r.basics
  return (
    <>
      <SectionTitle>Profil visuel</SectionTitle>
      <div className="callout" style={{ fontSize: 12.5 }}>
        <Sparkles size={15} />
        <span>
          {visual
            ? 'Photo, bandeau, liens et galerie s’affichent dans ce modèle visuel. Pour les plateformes de candidature, exportez la « version ATS » : même contenu, sans images ni colonnes.'
            : 'Ces éléments ne s’affichent que dans les modèles visuels (Vitrine, Studio, Folio, Colonne). Les modèles ATS les ignorent, comme les logiciels de recrutement.'}
        </span>
      </div>
      <div className="grid-2">
        <ImageField label="Photo" round value={b.photo} onChange={(v) => up((x) => void (x.basics.photo = v))} />
        <ImageField label="Image de bandeau" value={b.banner} onChange={(v) => up((x) => void (x.basics.banner = v))} bank={{ accent: r.accent, accent2: r.accent2 }} />
      </div>
      {visual && (
        <div className="field">
          <span>
            Hauteur du bandeau <span className="mono-label">{b.bannerHeight ?? BANNER_DEFAULT[r.templateId] ?? 120} px</span>
          </span>
          <div className="row">
            <input
              type="range"
              className="range"
              min={40}
              max={480}
              step={2}
              value={b.bannerHeight ?? BANNER_DEFAULT[r.templateId] ?? 120}
              onChange={(e) => up((x) => void (x.basics.bannerHeight = Number(e.target.value)))}
            />
            {b.bannerHeight != null && (
              <button className="btn btn-ghost btn-sm" onClick={() => up((x) => void delete x.basics.bannerHeight)}>
                Par défaut
              </button>
            )}
          </div>
          <span className="mono-label">Astuce : vous pouvez aussi tirer la poignée en bas du bandeau dans l’aperçu.</span>
        </div>
      )}
      <Field label="Mobilité">
        <input className="input" value={b.mobility ?? ''} data-field="mobility" onChange={(e) => up((x) => void (x.basics.mobility = e.target.value))} placeholder="Lyon, Valence, télétravail" />
      </Field>
      <div className="grid-2">
        <Field label="Bouton d’action">
          <input className="input" value={b.ctaLabel ?? ''} data-field="ctaLabel" onChange={(e) => up((x) => void (x.basics.ctaLabel = e.target.value))} placeholder="Réserver un échange" />
        </Field>
        <Field label="Lien du bouton">
          <input className="input" value={b.ctaUrl ?? ''} data-field="ctaUrl" onChange={(e) => up((x) => void (x.basics.ctaUrl = e.target.value))} placeholder="calendly.com/…" />
        </Field>
      </div>
      <div className="form-section-title">
        <span className="label">Autres liens (réseaux, portfolio)</span>
        <div className="actions">
          <button className="btn btn-soft btn-sm" onClick={() => up((x) => void (x.links = [...(x.links ?? []), { id: uid(), label: '', url: '' }]))}>
            <Plus size={14} /> Lien
          </button>
        </div>
      </div>
      {(r.links ?? []).map((l, i) => (
        <div key={l.id} className="row">
          <input className="input" style={{ maxWidth: 130 }} value={l.label} placeholder="Instagram" onChange={(e) => up((x) => void (x.links![i].label = e.target.value))} />
          <input className="input" value={l.url} placeholder="instagram.com/…" onChange={(e) => up((x) => void (x.links![i].url = e.target.value))} />
          <button className="icon-btn sm" onClick={() => up((x) => void x.links!.splice(i, 1))} aria-label="Retirer le lien">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </>
  )
}

/** Galerie de rendus et réalisations. */
export function GalleryForm({ r, up }: { r: Resume; up: Up }) {
  const items = r.gallery ?? []
  // Banque d'images : -1 = nouvelle image, sinon index de l'image à remplacer.
  const [bankFor, setBankFor] = useState<number | null>(null)
  const add = async () => {
    const image = await getImage(1400)
    if (image) up((x) => void (x.gallery = [...(x.gallery ?? []), { id: uid(), image, caption: '' }]))
  }
  const replace = async (i: number) => {
    const image = await getImage(1400)
    if (image) up((x) => void (x.gallery![i].image = image))
  }
  return (
    <>
      <SectionTitle
        action={
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setBankFor(-1)} title="Visuels assortis et photos libres de droits">
              <Images size={14} /> Banque d’images
            </button>
            <button className="btn btn-soft btn-sm" onClick={add}>
              <ImagePlus size={14} /> Ajouter une image
            </button>
          </div>
        }
      >
        Rendus & réalisations
      </SectionTitle>
      <div className="mono-label">Affichés dans les modèles visuels. Les légendes sont reprises en texte dans la version ATS.</div>
      {items.length === 0 && <div className="empty">Ajoutez 3 visuels : rendus, maquettes, captures de projets.</div>}
      <div className="gallery-edit">
        {items.map((g, i) => (
          <div key={g.id} className="item-card" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.image ? (
              <img src={g.image} alt="" />
            ) : (
              <div className="img-empty">
                <ImagePlus size={18} />
              </div>
            )}
            <input
              className="input"
              value={g.caption}
              placeholder="Légende (ex. DeLorean, lookdev)"
              onChange={(e) => up((x) => void (x.gallery![i].caption = e.target.value))}
            />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 2 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => replace(i)}>
                  Remplacer
                </button>
                <button className="icon-btn sm" onClick={() => setBankFor(i)} title="Choisir dans la banque d’images">
                  <Images size={14} />
                </button>
              </div>
              <div className="row" style={{ gap: 2 }}>
                <button className="icon-btn sm" disabled={i === 0} onClick={() => up((x) => move(x.gallery!, i, -1))}>
                  <ArrowUp size={14} />
                </button>
                <button className="icon-btn sm" disabled={i === items.length - 1} onClick={() => up((x) => move(x.gallery!, i, 1))}>
                  <ArrowDown size={14} />
                </button>
                <button className="icon-btn sm" onClick={() => up((x) => void x.gallery!.splice(i, 1))} aria-label="Retirer l’image">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {bankFor !== null && (
        <ImageBankModal
          kind="gallery"
          accent={r.accent}
          accent2={r.accent2}
          onPick={(image) =>
            up((x) => {
              if (bankFor === -1) x.gallery = [...(x.gallery ?? []), { id: uid(), image, caption: '' }]
              else x.gallery![bankFor].image = image
            })
          }
          onClose={() => setBankFor(null)}
        />
      )}
    </>
  )
}
