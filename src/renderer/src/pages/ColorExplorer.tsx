import { ArrowLeftRight, Check, ImagePlus, Palette as PaletteIcon, Sparkles, Wand2, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import type { Resume } from '../../../shared/types'
import { PALETTE } from '../components/ColorPicker'
import { PaperThumb } from '../components/PaperThumb'
import { Modal } from '../components/ui'
import { chooseImage } from '../lib/image'
import { HARMONIES, extractColors, pickPair } from '../lib/palette'
import { activeProfile } from '../lib/profile'
import { isEmptyResume, sampleResume } from '../lib/sample'
import { useStore } from '../store'
import { contrast } from '../templates/color'
import { CORE_TEMPLATES, type TemplateDef } from '../templates/registry'

type Mode = 'free' | 'harmonies' | 'image'
type Filter = 'all' | 'visual' | 'ats' | 'duo'

const HEX = /^#?([\da-f]{6}|[\da-f]{3})$/i
function normalizeHex(v: string): string | null {
  const m = HEX.exec(v.trim())
  if (!m) return null
  return '#' + (m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]).toUpperCase()
}

/**
 * Explorer par couleurs (à la Multicolr) : on choisit une ou deux couleurs — librement,
 * via une harmonie ou depuis une image — et chaque modèle s'affiche avec ces couleurs.
 */
export default function ColorExplorer({ initialColors, resumeId }: { initialColors?: string[]; resumeId?: string }) {
  const s = useStore()
  const mine = useMemo(() => [...s.data.resumes].filter((r) => !isEmptyResume(r)).sort((a, b) => b.updatedAt - a.updatedAt), [s.data.resumes])
  const [colors, setColors] = useState<string[]>(() => (initialColors ?? []).map((c) => c.toUpperCase()).slice(0, 2))
  const [mode, setMode] = useState<Mode>('free')
  const [filter, setFilter] = useState<Filter>('all')
  const profile = activeProfile(s.data)
  const [source, setSource] = useState<string>(() => (resumeId && mine.some((r) => r.id === resumeId) ? resumeId : profile ? 'profile' : 'sample'))
  const [hex, setHex] = useState('')
  const [image, setImage] = useState<{ src: string; colors: string[] } | null>(null)
  const [open, setOpen] = useState<TemplateDef | null>(null)
  const shown = useDeferredValue(colors)

  const toggle = (c: string) =>
    setColors((cur) => {
      const up = c.toUpperCase()
      if (cur.includes(up)) return cur.filter((x) => x !== up)
      return cur.length < 2 ? [...cur, up] : [cur[0], up]
    })

  const loadImage = async (file?: File) => {
    const src = await chooseImage(600, file)
    if (!src) return
    const found = await extractColors(src, 6)
    setImage({ src, colors: found })
    setColors(pickPair(found))
  }

  const base = source === 'sample' ? null : source === 'profile' ? (s.data.profile ?? null) : (mine.find((r) => r.id === source) ?? null)
  // Exemples calculés une fois ; les rendus ne changent qu'avec les couleurs ou le contenu choisi.
  const samples = useMemo(() => Object.fromEntries(CORE_TEMPLATES.map((t) => [t.id, sampleResume(t.id)])), [])
  const renders = useMemo(
    () =>
      Object.fromEntries(
        CORE_TEMPLATES.map((t): [string, Resume] => {
          const content = base ? { ...base, templateId: t.id } : samples[t.id]
          return [t.id, { ...content, accent: shown[0] ?? t.accent, accent2: shown[1] }]
        })
      ),
    [base, samples, shown]
  )

  let list = CORE_TEMPLATES.filter((t) => (filter === 'visual' ? t.visual : filter === 'ats' ? !t.visual : filter === 'duo' ? t.secondary : true))
  // Avec deux couleurs, les modèles qui exploitent la couleur secondaire passent en premier.
  if (shown.length === 2) list = [...list].sort((a, b) => Number(Boolean(b.secondary)) - Number(Boolean(a.secondary)))
  const lowContrast = shown[0] ? contrast(shown[0], '#ffffff') < 3 : false

  return (
    <div className="page">
      <div className="hero">
        <div className="mono-label">explorer par couleurs</div>
        <h1>
          Choisissez vos <em>couleurs</em>, voyez chaque modèle.
        </h1>
        <p>Une ou deux couleurs, une harmonie toute faite ou les couleurs d’une image (logo de l’entreprise, charte, photo) : tous les modèles se mettent à jour en direct.</p>
      </div>

      <div className="cx-panel">
        <div className="cx-top">
          <div className="seg">
            <button className={mode === 'free' ? 'on' : ''} onClick={() => setMode('free')}>
              <PaletteIcon size={14} /> Couleurs libres
            </button>
            <button className={mode === 'harmonies' ? 'on' : ''} onClick={() => setMode('harmonies')}>
              <Sparkles size={14} /> Harmonies
            </button>
            <button className={mode === 'image' ? 'on' : ''} onClick={() => setMode('image')}>
              <ImagePlus size={14} /> Depuis une image
            </button>
          </div>
          <div className="cx-selected">
            {[0, 1].map((i) =>
              colors[i] ? (
                <span className="cx-chip" key={i}>
                  <span className="cx-dot" style={{ background: colors[i] }} />
                  <span>
                    <small>{i === 0 ? 'Principale' : 'Secondaire'}</small>
                    {colors[i]}
                  </span>
                  <button onClick={() => setColors((cur) => cur.filter((_, j) => j !== i))} aria-label="Retirer cette couleur" title="Retirer">
                    <X size={13} />
                  </button>
                </span>
              ) : (
                <span className="cx-chip empty" key={i}>
                  <span className="cx-dot" />
                  <span>
                    <small>{i === 0 ? 'Principale' : 'Secondaire'}</small>
                    {i === 0 ? 'Couleur du modèle' : 'Facultative'}
                  </span>
                </span>
              )
            )}
            {colors.length === 2 && (
              <button className="icon-btn" onClick={() => setColors(([a, b]) => [b, a])} title="Inverser principale et secondaire">
                <ArrowLeftRight size={15} />
              </button>
            )}
            {colors.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setColors([])}>
                Effacer
              </button>
            )}
          </div>
        </div>

        {mode === 'free' && (
          <div className="cx-free">
            <div className="cx-grid">
              {PALETTE.flatMap((g) => g.colors).map((c) => {
                const i = colors.indexOf(c.toUpperCase())
                return (
                  <button key={c} className={`cx-swatch ${i >= 0 ? 'on' : ''}`} style={{ background: c }} onClick={() => toggle(c)} title={c} aria-label={`Couleur ${c}`}>
                    {i >= 0 && <span>{i + 1}</span>}
                  </button>
                )
              })}
            </div>
            <div className="cx-hex">
              <input type="color" className="cp-native" value={colors[colors.length - 1] ?? '#2323E6'} onChange={(e) => toggle(e.target.value)} title="Nuancier" />
              <input
                className="input"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                onKeyDown={(e) => {
                  const v = normalizeHex(hex)
                  if (e.key === 'Enter' && v) {
                    toggle(v)
                    setHex('')
                  }
                }}
                placeholder="Code hexadécimal, ex. #2323E6"
                spellCheck={false}
              />
              <button
                className="btn btn-soft btn-sm"
                disabled={!normalizeHex(hex)}
                onClick={() => {
                  const v = normalizeHex(hex)
                  if (v) toggle(v)
                  setHex('')
                }}
              >
                Ajouter
              </button>
            </div>
          </div>
        )}

        {mode === 'harmonies' && (
          <div className="cx-harmonies">
            {HARMONIES.map((h) => {
              const on = colors[0] === h.colors[0] && colors[1] === h.colors[1]
              return (
                <button key={h.name} className={`cx-harmony ${on ? 'on' : ''}`} onClick={() => setColors([...h.colors])}>
                  <span className="cx-pair">
                    <span style={{ background: h.colors[0] }} />
                    <span style={{ background: h.colors[1] }} />
                  </span>
                  {h.name}
                  {on && <Check size={14} />}
                </button>
              )
            })}
          </div>
        )}

        {mode === 'image' && (
          <div
            className="cx-image"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) void loadImage(f)
            }}
          >
            {image ? (
              <>
                <img src={image.src} alt="" />
                <div className="stack" style={{ gap: 10 }}>
                  <div className="mono-label">couleurs trouvées : cliquez pour choisir</div>
                  <div className="cx-found">
                    {image.colors.map((c) => {
                      const i = colors.indexOf(c)
                      return (
                        <button key={c} className={`cx-swatch lg ${i >= 0 ? 'on' : ''}`} style={{ background: c }} onClick={() => toggle(c)} title={c}>
                          {i >= 0 && <span>{i + 1}</span>}
                        </button>
                      )
                    })}
                  </div>
                  <div className="row">
                    <button className="btn btn-outline btn-sm" onClick={() => loadImage()}>
                      <ImagePlus size={14} /> Autre image
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setColors(pickPair(image.colors))}>
                      <Wand2 size={14} /> Choix automatique
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button className="cx-drop" onClick={() => loadImage()}>
                <ImagePlus size={22} />
                <strong>Déposez un logo, une charte ou une photo</strong>
                <span>ou cliquez pour choisir un fichier : les couleurs dominantes sont extraites automatiquement.</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="cx-bar">
        <div className="chips">
          {(
            [
              ['all', 'Tous'],
              ['duo', 'Deux couleurs'],
              ['visual', 'Visuels'],
              ['ats', 'ATS']
            ] as [Filter, string][]
          ).map(([k, label]) => (
            <button key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
        <label className="cx-source">
          <span>Contenu</span>
          <select className="select" value={source} onChange={(e) => setSource(e.target.value)}>
            {s.data.profile && <option value="profile">Mon profil</option>}
            <option value="sample">Exemples des modèles</option>
            {mine.map((r) => (
              <option key={r.id} value={r.id}>
                Mon CV : {r.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {lowContrast && <div className="callout cx-warn">Couleur principale très claire : le texte coloré sera peu lisible sur fond blanc. Gardez-la plutôt en couleur secondaire.</div>}

      <div className="gallery lg">
        {list.map((t) => (
          <button key={t.id} className="shot" onClick={() => setOpen(t)}>
            <div className="shot-frame" style={{ padding: '26px 30px 0' }}>
              <PaperThumb resume={renders[t.id]} />
            </div>
            <div className="shot-meta">
              <div className="shot-logo cx-logo">
                <span style={{ background: shown[0] ?? t.accent }} />
                {t.secondary && <span style={{ background: shown[1] ?? 'var(--line-strong)' }} />}
              </div>
              <div>
                <strong>{t.name}</strong>
                <span>
                  {t.visual ? 'Modèle visuel' : 'Modèle ATS'}
                  {t.secondary ? ' · deux couleurs' : ' · une couleur'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {open && <ApplyModal tpl={open} preview={renders[open.id]} base={base} mine={mine} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** Appliquer le modèle et les couleurs à un CV existant, ou créer un nouveau CV. */
function ApplyModal({ tpl, preview, base, mine, onClose }: { tpl: TemplateDef; preview: Resume; base: Resume | null; mine: Resume[]; onClose: () => void }) {
  const s = useStore()
  const [target, setTarget] = useState(base?.id ?? mine[0]?.id ?? '')
  const apply = () => {
    const r = mine.find((x) => x.id === target)
    if (!r) return
    s.withUndo(`« ${tpl.name} » et ses couleurs appliqués à « ${r.title} »`, () =>
      s.updateResume(r.id, (x) => {
        x.templateId = tpl.id
        x.accent = preview.accent
        if (preview.accent2) x.accent2 = preview.accent2
        else delete x.accent2
      })
    )
    onClose()
    s.go({ name: 'editor', id: r.id })
  }
  const create = () => {
    const r = s.createResume({ templateId: tpl.id, from: { ...preview, title: base ? `${base.title} · ${tpl.name}` : preview.title } })
    onClose()
    s.go({ name: 'editor', id: r.id })
  }
  return (
    <Modal
      size="xl"
      title={`${tpl.name} avec vos couleurs`}
      onClose={onClose}
      footer={
        <>
          <span style={{ marginRight: 'auto' }} />
          <button className="btn btn-ghost" onClick={create}>
            Créer un nouveau CV
          </button>
          {mine.length > 0 && (
            <button className="btn btn-ink" onClick={apply} disabled={!target}>
              <Check size={15} /> Appliquer
            </button>
          )}
        </>
      }
    >
      <div className="tpl-modal">
        <div className="tpl-modal-preview">
          <PaperThumb resume={preview} rounded />
        </div>
        <div className="tpl-modal-side">
          <span className="pill-label">{tpl.visual ? 'Modèle visuel' : 'Modèle ATS'}</span>
          <p className="tpl-modal-desc">{tpl.tagline}</p>
          <div className="cx-selected">
            <span className="cx-chip">
              <span className="cx-dot" style={{ background: preview.accent }} />
              <span>
                <small>Principale</small>
                {preview.accent.toUpperCase()}
              </span>
            </span>
            {tpl.secondary && preview.accent2 && (
              <span className="cx-chip">
                <span className="cx-dot" style={{ background: preview.accent2 }} />
                <span>
                  <small>Secondaire</small>
                  {preview.accent2.toUpperCase()}
                </span>
              </span>
            )}
          </div>
          {mine.length > 0 ? (
            <label className="field">
              <span>Appliquer à</span>
              <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
                {mine.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
              <span className="muted" style={{ fontSize: 12.5 }}>
                Le contenu du CV est conservé : seuls le modèle et les couleurs changent (annulable).
              </span>
            </label>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              Vous n’avez pas encore de CV rempli : « Créer un nouveau CV » part de cet exemple, avec ces couleurs.
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
