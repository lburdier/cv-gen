import { ArrowLeft, ImagePlus, Check, ChevronDown, Copy, Download, Gauge, Minus, PanelRight, Plus, ScanText, Type, Trash2 } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { resumeToText } from '../../../shared/format'
import type { Resume } from '../../../shared/types'
import { AtsPanel } from '../components/AtsPanel'
import { CanvasEditor } from '../components/CanvasEditor'
import { ColorPicker } from '../components/ColorPicker'
import { DesignForm } from '../components/DesignForm'
import { normalizeDesign } from '../../../shared/design'
import { EducationForm, ExperienceForm, ExtrasForm, IdentityForm, LayoutForm, SkillsForm, SummaryForm } from '../components/EditorForms'
import { TailorModal } from '../components/TailorModal'
import { TemplatePicker } from '../components/TemplatePicker'
import { GalleryForm } from '../components/VisualForms'
import { Dropdown, Modal } from '../components/ui'
import { analyze } from '../lib/ats'
import { actions } from '../lib/actions'
import { useStore } from '../store'
import { CvPreview } from '../templates/CvPreview'
import { usePreviewEditing } from '../components/usePreviewEditing'
import { FONTS, getTemplate, isVisual } from '../templates/registry'

/** Couleurs secondaires proposées dans le menu Style (claires et vives : elles servent de fond). */
const SECONDARY = ['#F0A6F7', '#F9A8D4', '#C6F432', '#FDE047', '#FACC15', '#5EEAD4', '#93C5FD', '#E4572E', '#111111']

const TABS = [
  { id: 'design', label: 'Design' },
  { id: 'identity', label: 'Identité' },
  { id: 'summary', label: 'Profil' },
  { id: 'experience', label: 'Expériences' },
  { id: 'skills', label: 'Compétences' },
  { id: 'education', label: 'Formation' },
  { id: 'extras', label: 'Plus' },
  { id: 'gallery', label: 'Portfolio' },
  { id: 'layout', label: 'Sections' }
] as const
type Tab = (typeof TABS)[number]['id']

// Hauteur utile d'une page A4 imprimée en pixels CSS : 297 mm − 2 × 14 mm de marge pour
// les modèles ATS, page entière sans marge pour les modèles visuels.
const PAGE_ATS_PX = (269 / 25.4) * 96
const PAD_ATS = 53
const PAGE_VISUAL_PX = 1123

export default function Editor({ id }: { id: string }) {
  const s = useStore()
  const resume = s.data.resumes.find((r) => r.id === id)
  const [tab, setTab] = useState<Tab>(() => (resume?.templateId === 'sur-mesure' ? 'design' : 'identity'))
  const [showAts, setShowAts] = useState(() => window.innerWidth > 1280)
  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [fitScale, setFitScale] = useState(0.8)
  const [pages, setPages] = useState(1)
  const [plain, setPlain] = useState(false)
  const [tailor, setTailor] = useState(false)
  const [picker, setPicker] = useState(false)
  // Mode d'édition mémorisé : formulaire classique ou toile (édition directe façon Canva).
  const [mode, setMode] = useState<'form' | 'canvas'>(() => {
    try {
      return localStorage.getItem('cvgen.editorMode') === 'canvas' ? 'canvas' : 'form'
    } catch {
      return 'form'
    }
  })
  const switchMode = (m: 'form' | 'canvas') => {
    setMode(m)
    try {
      localStorage.setItem('cvgen.editorMode', m)
    } catch {
      /* préférence non mémorisée */
    }
  }
  // Tutoriels : demande de passage en mode formulaire ou toile.
  useEffect(() => {
    const on = (e: Event) => {
      const m = (e as CustomEvent<'form' | 'canvas'>).detail
      if (m === 'form' || m === 'canvas') setMode(m)
    }
    window.addEventListener('cvgen:editor-mode', on)
    return () => window.removeEventListener('cvgen:editor-mode', on)
  }, [])
  const scrollRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  const deferred = useDeferredValue(resume)
  const offer = resume?.offerId ? s.data.offers.find((o) => o.id === resume.offerId) : undefined
  const report = useMemo(() => (deferred ? analyze(deferred, offer) : null), [deferred, offer])

  // Zoom « ajusté » : la page A4 tient dans la largeur disponible.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setFitScale(Math.min(1.1, (e.contentRect.width - 48) / 794)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [showAts])

  const visualTpl = resume ? isVisual(resume.templateId) : false
  const PAGE_PX = visualTpl ? PAGE_VISUAL_PX : PAGE_ATS_PX
  const PAD_TOP = visualTpl ? 0 : PAD_ATS

  // Nombre de pages estimé à partir de la hauteur réelle du rendu. On observe la feuille
  // (stable) et on relit le CV à chaque mesure : il est remplacé quand on change de modèle.
  useEffect(() => {
    const paper = paperRef.current
    if (!paper) return
    const measure = () => {
      const el = paper.querySelector('.cv') as HTMLElement | null
      if (!el) return
      let contentH: number
      if (visualTpl) contentH = el.scrollHeight
      else {
        const last = el.lastElementChild as HTMLElement | null
        contentH = last ? last.offsetTop + last.offsetHeight - PAD_ATS : 0
      }
      setPages(Math.max(1, Math.ceil((contentH - 2) / PAGE_PX)))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(paper)
    const cv = paper.querySelector('.cv')
    if (cv) ro.observe(cv)
    measure()
    return () => ro.disconnect()
  }, [visualTpl, PAGE_PX, resume?.templateId])

  const fitOrZoom = zoom === 'fit' ? fitScale : zoom
  const edit = usePreviewEditing({
    scrollRef,
    up: (fn) => s.updateResume(id, fn),
    setTab: (t) => setTab(t as Tab),
    scale: fitOrZoom
  })

  if (!resume || !deferred || !report) {
    return (
      <div className="page">
        <div className="empty">
          Ce CV n’existe plus.{' '}
          <button className="btn btn-soft btn-sm" onClick={() => s.go({ name: 'resumes' })}>
            Retour à mes CV
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'canvas') return <CanvasEditor key={resume.id} resume={resume} onExit={() => switchMode('form')} />

  const up = (fn: (r: Resume) => void) => s.updateResume(id, fn)
  const scale = zoom === 'fit' ? fitScale : zoom
  const tpl = getTemplate(resume.templateId)
  const custom = resume.templateId === 'sur-mesure'
  const tabs = TABS.filter((t) => t.id !== 'design' || custom)

  const copyText = async () => {
    await navigator.clipboard.writeText(resumeToText(resume))
    s.toast({ kind: 'success', title: 'Texte copié', detail: 'Pratique pour les formulaires de candidature en ligne.' })
  }

  return (
    <div className={`editor ${showAts ? '' : 'no-ats'}`}>
      {/* Colonne formulaire */}
      <div className="editor-form">
        <div className="editor-toolbar">
          <button className="icon-btn sm" onClick={() => s.go({ name: 'resumes' })} title="Retour">
            <ArrowLeft size={16} />
          </button>
          <input className="title-input" value={resume.title} onChange={(e) => up((r) => void (r.title = e.target.value))} aria-label="Nom du CV" />
          <span className="mono-label" title="Enregistrement automatique">
            <Check size={12} style={{ verticalAlign: -2 }} /> enregistré
          </span>
          <button className="icon-btn sm danger" title="Supprimer ce CV" onClick={() => actions.deleteResume(id)}>
            <Trash2 size={15} />
          </button>
        </div>
        <div className="section-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="form-body">
          {tab === 'design' && custom && (
            <div className="stack" style={{ gap: 14 }}>
              <div className="callout" style={{ fontSize: 13 }}>
                <ImagePlus size={16} />
                <span>
                  Modèle « Sur mesure » : chaque réglage du design est modifiable ici.{' '}
                  <a href="#" onClick={(e) => (e.preventDefault(), s.go({ name: 'from-image' }))}>
                    Recréer depuis une autre image
                  </a>
                </span>
              </div>
              <DesignForm
                design={normalizeDesign(resume.design)}
                onChange={(d) =>
                  up((r) => {
                    r.design = d
                    r.accent = d.colors.primary
                    r.accent2 = d.colors.secondary
                  })
                }
              />
            </div>
          )}
          {tab === 'identity' && <IdentityForm r={resume} up={up} />}
          {tab === 'summary' && <SummaryForm r={resume} up={up} offer={offer} />}
          {tab === 'experience' && <ExperienceForm r={resume} up={up} />}
          {tab === 'skills' && <SkillsForm r={resume} up={up} />}
          {tab === 'education' && <EducationForm r={resume} up={up} />}
          {tab === 'extras' && <ExtrasForm r={resume} up={up} />}
          {tab === 'gallery' && <GalleryForm r={resume} up={up} />}
          {tab === 'layout' && <LayoutForm r={resume} up={up} />}
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" disabled={tab === tabs[0].id} onClick={() => setTab(tabs[tabs.findIndex((t) => t.id === tab) - 1].id)}>
              ← Précédent
            </button>
            <button
              className="btn btn-soft btn-sm"
              disabled={tab === tabs[tabs.length - 1].id}
              onClick={() => setTab(tabs[tabs.findIndex((t) => t.id === tab) + 1].id)}
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>

      {/* Colonne aperçu */}
      <div className="preview-col">
        <div className="preview-bar">
          <div className="seg mode-seg" title="Formulaire ou édition directe sur le CV">
            <button className="on">Formulaire</button>
            <button onClick={() => switchMode('canvas')}>Toile</button>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setPicker(true)} title="Changer de modèle">
            <span style={{ width: 10, height: 10, borderRadius: 3, background: resume.accent }} /> {tpl.name} <ChevronDown size={14} />
          </button>
          <ColorPicker
            value={resume.accent}
            templateDefault={tpl.accent}
            onChange={(c) => up((r) => void (r.accent = c))}
            onExplore={() => s.go({ name: 'colors', colors: [resume.accent, ...(resume.accent2 ? [resume.accent2] : [])], resumeId: resume.id })}
          />
          <Dropdown
            trigger={(toggle) => (
              <button className="btn btn-outline btn-sm" onClick={toggle} title="Police, langue des intitulés, densité">
                <Type size={14} /> Style <ChevronDown size={14} />
              </button>
            )}
          >
            {() => (
              <div className="stack" style={{ padding: 8, gap: 12, width: 250 }}>
                <label className="field">
                  <span>Police</span>
                  <select className="select" value={resume.font} onChange={(e) => up((r) => void (r.font = e.target.value))}>
                    {FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                {tpl.secondary && (
                  <div className="field">
                    <span>Couleur secondaire</span>
                    <div className="sec-swatches">
                      <button className={`sec-auto ${!resume.accent2 ? 'on' : ''}`} onClick={() => up((r) => void delete r.accent2)} title="Couleur prévue par le modèle">
                        Auto
                      </button>
                      {SECONDARY.map((c) => (
                        <button
                          key={c}
                          className={`swatch ${resume.accent2?.toLowerCase() === c.toLowerCase() ? 'on' : ''}`}
                          style={{ background: c }}
                          onClick={() => up((r) => void (r.accent2 = c))}
                          aria-label={`Couleur secondaire ${c}`}
                        />
                      ))}
                      <input type="color" className="color-input" value={resume.accent2 ?? '#F0A6F7'} onChange={(e) => up((r) => void (r.accent2 = e.target.value.toUpperCase()))} title="Autre couleur" />
                    </div>
                  </div>
                )}
                <div className="field">
                  <span>Langue des intitulés</span>
                  <div className="seg">
                    <button className={resume.lang === 'fr' ? 'on' : ''} onClick={() => up((r) => void (r.lang = 'fr'))}>
                      Français
                    </button>
                    <button className={resume.lang === 'en' ? 'on' : ''} onClick={() => up((r) => void (r.lang = 'en'))}>
                      English
                    </button>
                  </div>
                </div>
                <div className="field">
                  <span>Densité</span>
                  <div className="seg">
                    <button className={resume.density === 'comfortable' ? 'on' : ''} onClick={() => up((r) => void (r.density = 'comfortable'))}>
                      Aérée
                    </button>
                    <button className={resume.density === 'compact' ? 'on' : ''} onClick={() => up((r) => void (r.density = 'compact'))}>
                      Dense
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Dropdown>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" onClick={() => setPlain(true)} title="Ce que lit un ATS">
            <ScanText size={15} /> Vue ATS
          </button>
          <Dropdown
            align="right"
            trigger={(toggle) => (
              <button className="btn btn-ink btn-sm" onClick={toggle}>
                <Download size={15} /> Exporter <ChevronDown size={14} />
              </button>
            )}
          >
            {(close) => (
              <>
                <button onClick={() => (close(), actions.exportResume(id, 'pdf'))}>
                  <Download size={15} /> PDF <small>{tpl.visual ? 'portfolio' : 'recommandé'}</small>
                </button>
                {tpl.visual && (
                  <button onClick={() => (close(), actions.exportResume(id, 'pdf', true))}>
                    <Download size={15} /> PDF version ATS <small>candidatures</small>
                  </button>
                )}
                <button onClick={() => (close(), actions.exportResume(id, 'docx'))}>
                  <Download size={15} /> Word (.docx) <small>ATS anciens</small>
                </button>
                <button onClick={() => (close(), actions.exportResume(id, 'txt'))}>
                  <Download size={15} /> Texte brut (.txt)
                </button>
                <hr />
                <button onClick={() => (close(), copyText())}>
                  <Copy size={15} /> Copier le texte
                </button>
              </>
            )}
          </Dropdown>
          <button className="icon-btn sm" onClick={() => setShowAts(!showAts)} title={showAts ? 'Masquer le score' : 'Afficher le score'}>
            {showAts ? <PanelRight size={16} /> : <Gauge size={16} />}
          </button>
        </div>
        <div className="preview-scroll" ref={scrollRef}>
          {edit.label && (
            <div className="edit-label" style={{ left: edit.label.x, top: Math.max(4, edit.label.y - 30) }}>
              {edit.label.text}
            </div>
          )}
          <div className="paper-wrap" style={{ width: 794 * scale, height: Math.max(1123, pages * PAGE_PX + PAD_TOP * 2) * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 794 }}>
              <div className="paper editable" ref={paperRef} {...edit.handlers}>
                <CvPreview resume={deferred} editable />
                {Array.from({ length: pages - 1 }, (_, i) => (
                  <div key={i} className="page-guide" style={{ top: PAD_TOP + (i + 1) * PAGE_PX }}>
                    <span>page {i + 2}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            <div className="seg">
              <button onClick={() => setZoom(Math.max(0.4, +(scale - 0.1).toFixed(2)))} aria-label="Dézoomer">
                <Minus size={13} />
              </button>
              <button className={zoom === 'fit' ? 'on' : ''} onClick={() => setZoom('fit')}>
                Ajuster
              </button>
              <button onClick={() => setZoom(1)} className={zoom === 1 ? 'on' : ''}>
                100 %
              </button>
              <button onClick={() => setZoom(Math.min(1.6, +(scale + 0.1).toFixed(2)))} aria-label="Zoomer">
                <Plus size={13} />
              </button>
            </div>
            <span className="mono-label">
              {pages} page{pages > 1 ? 's' : ''} · {Math.round(scale * 100)} %
            </span>
          </div>
        </div>
      </div>

      {/* Colonne score ATS */}
      <div className="ats-col">
        <AtsPanel resume={deferred} offer={offer} report={report} onShowText={() => setPlain(true)} onTailor={() => setTailor(true)} />
      </div>

      {plain && (
        <Modal
          title="Vue ATS — texte extrait"
          icon={<ScanText size={16} />}
          onClose={() => setPlain(false)}
          footer={
            <>
              <span className="muted" style={{ marginRight: 'auto', fontSize: 13 }}>
                C’est ce que reçoit un logiciel de recrutement après lecture du PDF.
              </span>
              <button className="btn btn-soft" onClick={copyText}>
                <Copy size={15} /> Copier
              </button>
            </>
          }
        >
          <pre className="plain-text">{resumeToText(resume)}</pre>
        </Modal>
      )}
      {tailor && offer && <TailorModal resume={resume} offer={offer} onClose={() => setTailor(false)} />}
      {picker && (
        <TemplatePicker
          current={resume.templateId}
          onClose={() => setPicker(false)}
          onPick={(t) => {
            s.applyTemplate(id, t.id)
            setPicker(false)
          }}
        />
      )}
    </div>
  )
}
