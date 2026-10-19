import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderKanban,
  GraduationCap,
  Heart,
  Languages,
  Minus,
  Plus,
  Redo2,
  ShieldCheck,
  Text,
  Trash2,
  Undo2,
  Wrench,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { TITLE_VARIANTS, sectionHasContent, sectionTitles } from '../../../shared/format'
import type { Resume, SectionKey } from '../../../shared/types'
import { analyze } from '../lib/ats'
import { actions } from '../lib/actions'
import { uid } from '../lib/sample'
import { useStore } from '../store'
import { cvZoom } from '../templates/onePage'
import { CanvasContext, type CanvasApi } from '../templates/canvasContext'
import { Cv } from '../templates/Cv'
import { FONTS, STUDIO_TEMPLATES, TEMPLATES, isVisual } from '../templates/registry'
import { DESIGN_PALETTES, DESIGN_STRUCTURES, designOf, designTemplate, usesDesignEngine } from '../templates/designCatalog'
import { DesignForm } from './DesignForm'
import { ColorPicker } from './ColorPicker'
import { TemplatePreview } from './TemplatePicker'
import { autoTour } from './Tour'
import { Dropdown, ScoreRing } from './ui'
import { Select } from './Select'

/**
 * Toile : édition directe du CV à la manière de Canva, texte modifiable sur place, blocs
 * sélectionnables, barre d'outils, glisser-déposer, annuler/rétablir, avec des garde-fous
 * ATS : une colonne, texte réel, intitulés standards, polices sûres, taille minimale.
 */

const PAGE_ATS_PX = (269 / 25.4) * 96
const PAD_ATS = 53
/** Page A4 des modèles visuels (imprimés sans marge). */
const PAGE_VISUAL_PX = 1123
const LISTS = ['experiences', 'education', 'skills', 'projects', 'certifications', 'languages'] as const
type ListKey = (typeof LISTS)[number]
const LIST_OF: Partial<Record<SectionKey, ListKey>> = {
  experience: 'experiences',
  education: 'education',
  skills: 'skills',
  projects: 'projects',
  certifications: 'certifications',
  languages: 'languages'
}
const SAFE_FONTS = ['inter', 'arial', 'calibri', 'georgia', 'serif']

type Sel = { kind: 'section'; key: SectionKey | 'header' } | { kind: 'entry'; path: string }
type Box = { x: number; y: number; w: number; h: number }

/** Écrit une valeur à un chemin « a.0.b ». */
function setPath(obj: unknown, path: string, value: unknown) {
  const keys = path.split('.')
  let o = obj as Record<string, unknown>
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>
  o[keys[keys.length - 1]] = value
}
function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? o : (o as Record<string, unknown>)[k]), obj)
}

const ADDERS: { key: SectionKey; label: string; icon: typeof Plus }[] = [
  { key: 'experience', label: 'Expérience', icon: BriefcaseBusiness },
  { key: 'education', label: 'Formation', icon: GraduationCap },
  { key: 'skills', label: 'Compétences', icon: Wrench },
  { key: 'projects', label: 'Projet', icon: FolderKanban },
  { key: 'certifications', label: 'Certification', icon: Award },
  { key: 'languages', label: 'Langue', icon: Languages },
  { key: 'summary', label: 'Profil', icon: Text },
  { key: 'interests', label: 'Intérêts', icon: Heart }
]

export function CanvasEditor({ resume, onExit }: { resume: Resume; onExit: () => void }) {
  useEffect(() => autoTour(), [])
  const s = useStore()
  const id = resume.id
  const [panel, setPanel] = useState<'elements' | 'style' | 'ats'>('elements')
  const [zoom, setZoom] = useState(0.9)
  const [sel, setSel] = useState<Sel | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  const [datePop, setDatePop] = useState<{ path: string; box: Box } | null>(null)
  const [drop, setDrop] = useState<Box | null>(null)
  const [paperH, setPaperH] = useState(1123)
  const stageRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const past = useRef<Resume[]>([])
  const future = useRef<Resume[]>([])
  const [, force] = useState(0)
  const drag = useRef<string | null>(null)
  const current = useRef(resume)
  current.current = resume
  // Moteur de design (studio, « Sur mesure ») : éditable sur la toile, design réglable en direct.
  const designEngine = usesDesignEngine(resume.templateId)
  const studioTpl = designTemplate(resume.templateId)
  // Modèles visuels faits main (colonnes, images) : pas d'édition sur la toile.
  const visual = isVisual(resume.templateId) && !designEngine
  const report = useMemo(() => analyze(resume), [resume])

  // ---------- Historique (annuler / rétablir) ----------
  const up = useCallback(
    (fn: (r: Resume) => void) => {
      past.current = [...past.current.slice(-99), structuredClone(current.current)]
      future.current = []
      s.updateResume(id, fn)
      force((n) => n + 1)
    },
    [id, s]
  )
  const restore = (snap: Resume) =>
    s.updateResume(id, (r) => {
      for (const k of Object.keys(r)) delete (r as unknown as Record<string, unknown>)[k]
      Object.assign(r, structuredClone(snap))
    })
  const undo = () => {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(structuredClone(current.current))
    restore(prev)
    force((n) => n + 1)
  }
  const redo = () => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(structuredClone(current.current))
    restore(next)
    force((n) => n + 1)
  }
  useEffect(() => {
    const k = (e: globalThis.KeyboardEvent) => {
      const inField = (e.target as HTMLElement)?.isContentEditable || /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName ?? '')
      if (!(e.ctrlKey || e.metaKey) || inField) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const focusPath = (path: string) =>
    setTimeout(() => {
      const el = innerRef.current?.querySelector<HTMLElement>(`[data-path="${path}"]`)
      if (!el) return
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      const sl = window.getSelection()
      sl?.removeAllRanges()
      sl?.addRange(range)
    }, 30)

  // ---------- Édition des textes ----------
  const api: CanvasApi = {
    commit(path, raw) {
      const multi = /summary|details|description|interests/.test(path)
      let value = raw.replace(/ /g, ' ')
      value = multi ? value.replace(/\n{3,}/g, '\n\n').trimEnd() : value.replace(/\s*\n\s*/g, ' ').trim()
      if (/^basics\.(linkedin|github|website)$/.test(path)) value = value.replace(/^https?:\/\//, '')
      // Simple passage dans le champ sans modification : rien à enregistrer (espaces insécables compris).
      const before = String(getPath(current.current, path) ?? '')
      const loose = (x: string) => x.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
      if (before === value || loose(before) === loose(value)) return
      up((r) => setPath(r, path, value))
    },
    key(path, e: KeyboardEvent<HTMLElement>) {
      const el = e.currentTarget
      const text = el.innerText.replace(/ /g, ' ')
      const listItem = /^(experiences\.\d+\.bullets|skills\.\d+\.items)\.(\d+)$/.exec(path)
      if (e.key === 'Escape') {
        el.blur()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        if (/summary|details|description|interests/.test(path) && !listItem) return // retour à la ligne
        e.preventDefault()
        if (listItem) {
          const base = listItem[1]
          const j = Number(listItem[2])
          up((r) => {
            const arr = getPath(r, base) as string[]
            arr[j] = text.trim()
            arr.splice(j + 1, 0, '')
          })
          focusPath(`${base}.${j + 1}`)
        } else el.blur()
        return
      }
      if (e.key === 'Backspace' && listItem && !text.trim()) {
        const base = listItem[1]
        const j = Number(listItem[2])
        const arr = getPath(current.current, base) as string[]
        if (arr.length <= 1) return
        e.preventDefault()
        up((r) => (getPath(r, base) as string[]).splice(j, 1))
        focusPath(`${base}.${Math.max(0, j - 1)}`)
      }
    }
  }

  // ---------- Sélection et position de la barre d'outils ----------
  const selector = (x: Sel) => (x.kind === 'section' ? `[data-section="${x.key}"]` : `[data-entry="${x.path}"]`)
  const rectOf = (el: Element): Box => {
    const r = el.getBoundingClientRect()
    const c = innerRef.current!.getBoundingClientRect()
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }
  }
  useLayoutEffect(() => {
    if (!sel || !innerRef.current) return setBox(null)
    const el = innerRef.current.querySelector(selector(sel))
    if (!el) {
      setSel(null)
      return setBox(null)
    }
    setBox(rectOf(el))
  }, [sel, resume, zoom])
  useEffect(() => {
    const cv = innerRef.current?.querySelector('.cv')
    if (!cv) return
    // Hauteur visible : un CV réduit pour tenir sur une page compte pour sa taille réduite.
    const ro = new ResizeObserver(() => setPaperH(Math.round((cv as HTMLElement).offsetHeight * cvZoom(cv))))
    ro.observe(cv)
    return () => ro.disconnect()
  }, [resume.templateId])

  const onMouseDown = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    const d = t.closest<HTMLElement>('[data-dates]')
    if (d) {
      e.preventDefault()
      setDatePop({ path: d.dataset.dates!, box: rectOf(d) })
    } else if (!t.closest('.cv-datepop')) setDatePop(null)
    if (t.closest('.cv-toolbar, .cv-datepop')) return
    const en = t.closest<HTMLElement>('[data-entry]')
    const se = t.closest<HTMLElement>('[data-section]')
    if (en) setSel({ kind: 'entry', path: en.dataset.entry! })
    else if (se) setSel({ kind: 'section', key: se.dataset.section as SectionKey | 'header' })
    else if (!t.closest('.cv')) setSel(null)
  }

  // ---------- Opérations ----------
  const shownKeys = (r: Resume) => r.sectionOrder.filter((k) => !r.hidden.includes(k) && (k === 'summary' || sectionHasContent(r, k)) && k !== 'gallery')
  const moveSection = (k: SectionKey, dir: -1 | 1) =>
    up((r) => {
      const shown = shownKeys(r)
      const i = shown.indexOf(k)
      const other = shown[i + dir]
      if (!other) return
      const a = r.sectionOrder.indexOf(k)
      const b = r.sectionOrder.indexOf(other)
      ;[r.sectionOrder[a], r.sectionOrder[b]] = [r.sectionOrder[b], r.sectionOrder[a]]
    })
  const listAndIndex = (path: string) => {
    const [list, idx] = path.split('.')
    return { list: list as ListKey, i: Number(idx) }
  }
  const moveEntry = (path: string, dir: -1 | 1) => {
    const { list, i } = listAndIndex(path)
    const arr = current.current[list] as unknown[]
    if (i + dir < 0 || i + dir >= arr.length) return
    up((r) => {
      const a = r[list] as unknown[]
      ;[a[i], a[i + dir]] = [a[i + dir], a[i]]
    })
    setSel({ kind: 'entry', path: `${list}.${i + dir}` })
  }
  const duplicateEntry = (path: string) => {
    const { list, i } = listAndIndex(path)
    up((r) => {
      const a = r[list] as { id: string }[]
      a.splice(i + 1, 0, { ...structuredClone(a[i]), id: uid() })
    })
    setSel({ kind: 'entry', path: `${list}.${i + 1}` })
  }
  const deleteEntry = (path: string) => {
    const { list, i } = listAndIndex(path)
    up((r) => (r[list] as unknown[]).splice(i, 1))
    setSel(null)
  }
  const addItem = (k: SectionKey) => {
    const show = (r: Resume) => {
      r.hidden = r.hidden.filter((x) => x !== k)
      if (!r.sectionOrder.includes(k)) r.sectionOrder.push(k)
    }
    if (k === 'summary' || k === 'interests') {
      up(show)
      setSel({ kind: 'section', key: k })
      return focusPath(k === 'summary' ? 'basics.summary' : 'interests')
    }
    const list = LIST_OF[k]
    if (!list) return
    let path = ''
    up((r) => {
      show(r)
      const n = uid()
      if (list === 'experiences') r.experiences.unshift({ id: n, role: '', company: '', location: '', start: '', end: '', current: false, bullets: [''] })
      else if (list === 'education') r.education.unshift({ id: n, degree: '', school: '', location: '', start: '', end: '', details: '' })
      else if (list === 'skills') r.skills.push({ id: n, name: '', items: [''] })
      else if (list === 'projects') r.projects.push({ id: n, name: '', link: '', description: '' })
      else if (list === 'certifications') r.certifications.push({ id: n, name: '', issuer: '', date: '' })
      else r.languages.push({ id: n, name: '', level: '' })
      const idx = list === 'experiences' || list === 'education' ? 0 : (r[list] as unknown[]).length - 1
      path = `${list}.${idx}`
    })
    const first = { experiences: 'role', education: 'degree', skills: 'name', projects: 'name', certifications: 'name', languages: 'name' }[list]
    setSel({ kind: 'entry', path })
    focusPath(`${path}.${first}`)
  }
  const addBullet = (path: string) => {
    const { list, i } = listAndIndex(path)
    const field = list === 'skills' ? 'items' : 'bullets'
    const n = ((current.current[list] as unknown as Record<string, unknown>[])[i][field] as string[]).length
    up((r) => ((r[list] as unknown as Record<string, unknown>[])[i][field] as string[]).push(''))
    focusPath(`${path}.${field}.${n}`)
  }

  // ---------- Glisser-déposer ----------
  const onDragStart = (e: React.DragEvent) => {
    const g = (e.target as HTMLElement).closest<HTMLElement>('[data-drag]')
    if (!g) return
    drag.current = g.dataset.drag!
    e.dataTransfer.setData('text/plain', drag.current)
    e.dataTransfer.effectAllowed = 'move'
    setSel(null)
  }
  const dropTarget = (e: React.DragEvent): { el: HTMLElement; key: string; after: boolean } | null => {
    const d = drag.current
    if (!d) return null
    const t = e.target as HTMLElement
    const el = d.startsWith('section:') ? t.closest<HTMLElement>('[data-section]:not([data-section="header"])') : t.closest<HTMLElement>(`[data-entry^="${d.split('.')[0]}."]`)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { el, key: el.dataset.section ?? el.dataset.entry!, after: e.clientY > r.top + r.height / 2 }
  }
  const onDragOver = (e: React.DragEvent) => {
    const t = dropTarget(e)
    if (!t) return
    e.preventDefault()
    const b = rectOf(t.el)
    setDrop({ x: b.x, y: t.after ? b.y + b.h + 2 : b.y - 3, w: b.w, h: 3 })
  }
  const onDrop = (e: React.DragEvent) => {
    const t = dropTarget(e)
    const d = drag.current
    setDrop(null)
    drag.current = null
    if (!t || !d) return
    e.preventDefault()
    if (d.startsWith('section:')) {
      const from = d.slice(8) as SectionKey
      const to = t.key as SectionKey
      if (from === to) return
      up((r) => {
        const order = r.sectionOrder.filter((k) => k !== from)
        order.splice(order.indexOf(to) + (t.after ? 1 : 0), 0, from)
        r.sectionOrder = order
      })
    } else {
      const { list, i } = listAndIndex(d)
      const j = listAndIndex(t.key).i
      if (i === j) return
      up((r) => {
        const a = r[list] as unknown[]
        const [item] = a.splice(i, 1)
        let k = j + (t.after ? 1 : 0)
        if (i < k) k--
        a.splice(k, 0, item)
      })
    }
  }

  // ---------- Garde-fous ATS ----------
  const t = sectionTitles(resume)
  const titlesOk = Object.entries(resume.titles ?? {}).every(([k, v]) => !v || TITLE_VARIANTS[resume.lang][k as SectionKey]?.includes(v))
  const size = resume.style?.size ?? 10
  const rules: [boolean, string][] = [
    designEngine ? [true, 'Version ATS une colonne disponible à l’export'] : [!visual, 'Une seule colonne, ordre de lecture linéaire'],
    [true, 'Texte réel et sélectionnable (collage en texte brut)'],
    [titlesOk, 'Intitulés de sections standards'],
    [designEngine || SAFE_FONTS.includes(resume.font), 'Police standard'],
    [size >= 9, 'Taille du texte ≥ 9 pt'],
    [true, 'Aucune image, icône ou tableau porteur d’information']
  ]
  const atsOk = rules.every(([ok]) => ok)

  const pageLines: number[] = []
  if (designEngine) for (let n = 1; n * PAGE_VISUAL_PX < paperH - 20; n++) pageLines.push(n * PAGE_VISUAL_PX)
  else if (!visual) for (let n = 1; PAD_ATS + n * PAGE_ATS_PX < paperH - 20; n++) pageLines.push(PAD_ATS + n * PAGE_ATS_PX)
  const pages = pageLines.length + 1

  // ---------- Barre d'outils de la sélection ----------
  const toolbar = () => {
    if (!sel || !box) return null
    const style = { left: box.x, top: Math.max(0, box.y - 44) }
    if (sel.kind === 'section') {
      if (sel.key === 'header') {
        const missing = (['location', 'linkedin', 'github', 'website'] as const).filter((k) => !resume.basics[k])
        return (
          <div className="cv-toolbar" style={style}>
            <span className="cv-tb-label">En-tête</span>
            {missing.map((k) => (
              <button
                key={k}
                onClick={() => {
                  up((r) => void (r.basics[k] = { location: 'Ville', linkedin: 'linkedin.com/in/', github: 'github.com/', website: 'monsite.fr' }[k]))
                  focusPath(`basics.${k}`)
                }}
              >
                <Plus size={13} /> {{ location: 'Ville', linkedin: 'LinkedIn', github: 'GitHub', website: 'Site' }[k]}
              </button>
            ))}
          </div>
        )
      }
      const k = sel.key
      const variants = TITLE_VARIANTS[resume.lang][k]
      return (
        <div className="cv-toolbar" style={style}>
          <button onClick={() => moveSection(k, -1)} title="Monter la section">
            <ArrowUp size={14} />
          </button>
          <button onClick={() => moveSection(k, 1)} title="Descendre la section">
            <ArrowDown size={14} />
          </button>
          {variants.length > 1 && (
            <Select
              value={t[k]}
              onChange={(e) =>
                up((r) => {
                  r.titles = { ...(r.titles ?? {}), [k]: e.target.value }
                })
              }
              title="Intitulés reconnus par les ATS"
            >
              {variants.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </Select>
          )}
          {(LIST_OF[k] || k === 'summary' || k === 'interests') && (
            <button onClick={() => addItem(k)}>
              <Plus size={14} /> {k === 'summary' || k === 'interests' ? 'Écrire' : 'Ajouter'}
            </button>
          )}
          <button onClick={() => (up((r) => void r.hidden.push(k)), setSel(null))} title="Masquer la section">
            <EyeOff size={14} />
          </button>
        </div>
      )
    }
    const { list } = listAndIndex(sel.path)
    return (
      <div className="cv-toolbar" style={style}>
        <button onClick={() => moveEntry(sel.path, -1)} title="Monter">
          <ArrowUp size={14} />
        </button>
        <button onClick={() => moveEntry(sel.path, 1)} title="Descendre">
          <ArrowDown size={14} />
        </button>
        {(list === 'experiences' || list === 'skills') && (
          <button onClick={() => addBullet(sel.path)}>
            <Plus size={14} /> {list === 'skills' ? 'Compétence' : 'Puce'}
          </button>
        )}
        {(list === 'experiences' || list === 'education' || list === 'certifications') && (
          <button
            onClick={() => {
              const el = innerRef.current?.querySelector(`[data-dates="${sel.path}"]`)
              if (el) setDatePop({ path: sel.path, box: rectOf(el) })
            }}
          >
            <CalendarDays size={14} /> Dates
          </button>
        )}
        <button onClick={() => duplicateEntry(sel.path)} title="Dupliquer">
          <Copy size={14} />
        </button>
        <button className="danger" onClick={() => deleteEntry(sel.path)} title="Supprimer">
          <Trash2 size={14} />
        </button>
      </div>
    )
  }

  const datePopover = () => {
    if (!datePop) return null
    const { list, i } = listAndIndex(datePop.path)
    const item = (resume[list] as unknown as Record<string, unknown>[])[i]
    if (!item) return null
    const set = (field: string, v: string | boolean) => up((r) => void ((r[list] as unknown as Record<string, unknown>[])[i][field] = v))
    return (
      <div className="cv-datepop" style={{ left: Math.max(0, datePop.box.x + datePop.box.w - 250), top: datePop.box.y + datePop.box.h + 6 }}>
        {list === 'certifications' ? (
          <label>
            Date
            <input type="month" value={String(item.date ?? '')} onChange={(e) => set('date', e.target.value)} />
          </label>
        ) : (
          <>
            <label>
              Début
              <input type="month" value={String(item.start ?? '')} onChange={(e) => set('start', e.target.value)} />
            </label>
            <label>
              Fin
              <input type="month" value={String(item.end ?? '')} disabled={Boolean(item.current)} onChange={(e) => set('end', e.target.value)} />
            </label>
            {list === 'experiences' && (
              <label className="row">
                <input type="checkbox" checked={Boolean(item.current)} onChange={(e) => set('current', e.target.checked)} /> Poste actuel
              </label>
            )}
          </>
        )}
        <button className="btn btn-ink btn-sm" onClick={() => setDatePop(null)}>
          OK
        </button>
      </div>
    )
  }

  const atsTemplates = TEMPLATES.filter((x) => !x.visual)

  return (
    <div className="canvas-editor">
      <div className="ce-top">
        <button className="icon-btn sm" onClick={() => s.go({ name: 'resumes' })} title="Retour">
          <ArrowLeft size={16} />
        </button>
        <input className="title-input" value={resume.title} onChange={(e) => s.updateResume(id, (r) => void (r.title = e.target.value))} aria-label="Nom du CV" />
        <div className="seg">
          <button onClick={onExit}>Formulaire</button>
          <button className="on">Toile</button>
        </div>
        <div className="ce-tools">
          <button className="icon-btn sm" onClick={undo} disabled={!past.current.length} title="Annuler (Ctrl Z)">
            <Undo2 size={16} />
          </button>
          <button className="icon-btn sm" onClick={redo} disabled={!future.current.length} title="Rétablir (Ctrl Y)">
            <Redo2 size={16} />
          </button>
          <span className="ce-sep" />
          <button className="icon-btn sm" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} title="Zoom arrière">
            <Minus size={15} />
          </button>
          <span className="mono-label">{Math.round(zoom * 100)} %</span>
          <button className="icon-btn sm" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} title="Zoom avant">
            <Plus size={15} />
          </button>
          <span className="ce-sep" />
          <span className={`mono-tag ${pages > 2 ? 'warn' : ''}`}>
            {pages} page{pages > 1 ? 's' : ''}
          </span>
          <span className={`ce-badge ${atsOk ? 'ok' : 'warn'}`} title="Garde-fous ATS">
            <ShieldCheck size={14} /> {designEngine ? (atsOk ? 'Design · export ATS inclus' : 'À vérifier') : atsOk ? '100 % ATS' : 'À vérifier'}
          </span>
        </div>
        <Dropdown
          align="right"
          trigger={(toggle) => (
            <button className="btn btn-ink btn-sm" onClick={toggle}>
              <Download size={15} /> Exporter
            </button>
          )}
        >
          {(close) => (
            <>
              <button onClick={() => (close(), actions.exportResume(id, 'pdf'))}>PDF{designEngine ? ' (design)' : ''}</button>
              {designEngine && <button onClick={() => (close(), actions.exportResume(id, 'pdf', true))}>PDF version ATS</button>}
              <button onClick={() => (close(), actions.exportResume(id, 'docx'))}>Word (DOCX)</button>
              <button onClick={() => (close(), actions.exportResume(id, 'txt'))}>Texte brut</button>
            </>
          )}
        </Dropdown>
      </div>

      <div className="ce-body">
        <aside className="ce-panel">
          <div className="seg ce-tabs">
            <button className={panel === 'elements' ? 'on' : ''} onClick={() => setPanel('elements')}>
              Éléments
            </button>
            <button className={panel === 'style' ? 'on' : ''} onClick={() => setPanel('style')}>
              Style
            </button>
            <button className={panel === 'ats' ? 'on' : ''} onClick={() => setPanel('ats')}>
              ATS {report.score}
            </button>
          </div>

          {panel === 'elements' && (
            <div className="ce-section">
              <div className="mono-label">ajouter</div>
              <div className="ce-adders">
                {ADDERS.map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => addItem(key)} disabled={visual}>
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="mono-label" style={{ marginTop: 18 }}>
                sections
              </div>
              <div className="ce-sections">
                {resume.sectionOrder
                  .filter((k) => k !== 'gallery')
                  .map((k) => {
                    const hidden = resume.hidden.includes(k)
                    return (
                      <div key={k} className={`ce-sec ${hidden ? 'off' : ''}`}>
                        <button onClick={() => setSel({ kind: 'section', key: k })}>{t[k]}</button>
                        <button
                          className="icon-btn sm"
                          title={hidden ? 'Afficher' : 'Masquer'}
                          onClick={() => up((r) => void (r.hidden = hidden ? r.hidden.filter((x) => x !== k) : [...r.hidden, k]))}
                        >
                          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    )
                  })}
              </div>
              <p className="muted ce-tip">Cliquez sur un texte pour l’écrire, Entrée pour une nouvelle puce, glissez les poignées ⋮⋮ pour réorganiser. Ctrl Z annule.</p>
            </div>
          )}

          {panel === 'style' && designEngine && (
            <div className="ce-section">
              {studioTpl && (
                <>
                  <div className="mono-label">palette</div>
                  <div className="ce-palettes">
                    {DESIGN_PALETTES.map((p) => {
                      const tid = studioTpl.id.replace(/-[^-]+$/, '-' + p.id)
                      return (
                        <button
                          key={p.id}
                          className={resume.templateId === tid ? 'on' : ''}
                          title={p.name}
                          style={{ background: `linear-gradient(135deg, ${p.primary} 55%, ${p.secondary} 55%)` }}
                          onClick={() => up((r) => void ((r.templateId = tid), (r.accent = p.primary), (r.accent2 = undefined)))}
                        />
                      )
                    })}
                  </div>
                  <div className="mono-label" style={{ marginTop: 14 }}>
                    structure
                  </div>
                  <Select
                    className="select"
                    value={studioTpl.id.replace(/^d-/, '').replace(/-[^-]+$/, '')}
                    onChange={(e) => {
                      const palette = studioTpl.id.split('-').pop()
                      const tid = `d-${e.target.value}-${palette}`
                      up((r) => void ((r.templateId = tid), (r.accent = designTemplate(tid)?.design.colors.primary ?? r.accent)))
                    }}
                  >
                    {DESIGN_STRUCTURES.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} · {x.family}
                      </option>
                    ))}
                  </Select>
                  <div className="mono-label" style={{ marginTop: 14 }}>
                    design
                  </div>
                </>
              )}
              <DesignForm
                design={designOf(resume)}
                onChange={(d) =>
                  up((r) => {
                    r.design = d
                    r.designFor = r.templateId
                    r.accent = d.colors.primary
                    r.accent2 = d.colors.secondary
                  })
                }
              />
              {studioTpl && resume.designFor === resume.templateId && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => up((r) => void ((r.design = undefined), (r.designFor = undefined)))}>
                  Revenir au design du modèle
                </button>
              )}
            </div>
          )}

          {panel === 'style' && !designEngine && (
            <div className="ce-section">
              <div className="mono-label">modèle (une colonne)</div>
              <div className="ce-templates">
                {atsTemplates.map((x) => (
                  <button key={x.id} className={resume.templateId === x.id ? 'on' : ''} onClick={() => up((r) => void ((r.templateId = x.id), (r.accent = r.accent || x.accent)))} title={x.tagline}>
                    <TemplatePreview id={x.id} />
                    <span>{x.name}</span>
                  </button>
                ))}
              </div>
              <div className="mono-label" style={{ marginTop: 16 }}>
                couleur
              </div>
              <ColorPicker value={resume.accent} templateDefault={TEMPLATES.find((x) => x.id === resume.templateId)?.accent ?? '#111111'} onChange={(c) => up((r) => void (r.accent = c))} />
              <label className="field" style={{ marginTop: 14 }}>
                <span>Police (standard)</span>
                <Select className="select" value={resume.font} onChange={(e) => up((r) => void (r.font = e.target.value))}>
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>Taille du texte : {size.toFixed(2).replace(/\.?0+$/, '')} pt</span>
                <input type="range" className="range" min={9} max={11.5} step={0.25} value={size} onChange={(e) => up((r) => void (r.style = { ...(r.style ?? {}), size: Number(e.target.value) }))} />
              </label>
              <label className="field">
                <span>Interligne : {(resume.style?.leading ?? 1.42).toFixed(2)}</span>
                <input type="range" className="range" min={1.2} max={1.6} step={0.02} value={resume.style?.leading ?? 1.42} onChange={(e) => up((r) => void (r.style = { ...(r.style ?? {}), leading: Number(e.target.value) }))} />
              </label>
              <div className="field">
                <span>Marges</span>
                <div className="seg">
                  {(
                    [
                      ['narrow', 'Étroites'],
                      ['normal', 'Normales'],
                      ['wide', 'Larges']
                    ] as const
                  ).map(([m, l]) => (
                    <button key={m} className={(resume.style?.margin ?? 'normal') === m ? 'on' : ''} onClick={() => up((r) => void (r.style = { ...(r.style ?? {}), margin: m }))}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span>Langue des intitulés</span>
                <div className="seg">
                  <button className={resume.lang === 'fr' ? 'on' : ''} onClick={() => up((r) => void ((r.lang = 'fr'), (r.titles = {})))}>
                    Français
                  </button>
                  <button className={resume.lang === 'en' ? 'on' : ''} onClick={() => up((r) => void ((r.lang = 'en'), (r.titles = {})))}>
                    English
                  </button>
                </div>
              </div>
            </div>
          )}

          {panel === 'ats' && (
            <div className="ce-section">
              <div className="as-score">
                <ScoreRing score={report.score} size={96} stroke={8} />
                <div>
                  <strong>Score ATS</strong>
                  <span className="muted">Format {report.format} · Contenu {report.content}</span>
                </div>
              </div>
              <div className="mono-label" style={{ marginTop: 14 }}>
                garde-fous de la toile
              </div>
              <div className="checks">
                {rules.map(([ok, label]) => (
                  <div key={label} className="check-item">
                    {ok ? <CheckCircle2 size={16} className="ic pass" /> : <AlertTriangle size={16} className="ic warn" />}
                    <div>{label}</div>
                  </div>
                ))}
              </div>
              <div className="mono-label" style={{ marginTop: 14 }}>
                à améliorer
              </div>
              <div className="checks">
                {report.checks
                  .filter((c) => c.status !== 'pass')
                  .map((c) => (
                    <div key={c.id} className="check-item">
                      {c.status === 'warn' ? <AlertTriangle size={16} className="ic warn" /> : <XCircle size={16} className="ic fail" />}
                      <div>
                        {c.label}
                        <p>{c.detail}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </aside>

        <div className="ce-stage" ref={stageRef} onMouseDown={onMouseDown} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={() => setDrop(null)}>
          {visual ? (
            <div className="ce-visual">
              <ShieldCheck size={26} />
              <strong>La toile garantit un CV 100 % ATS</strong>
              <span>Ce modèle visuel est composé à la main (colonnes, images). Choisissez un modèle une colonne ou un modèle du studio de design pour l’éditer sur la toile, ou revenez au formulaire.</span>
              <div className="ce-templates">
                {[...atsTemplates.slice(0, 4), ...STUDIO_TEMPLATES.filter((x) => x.id.endsWith('-indigo')).slice(0, 4)].map((x) => (
                  <button key={x.id} onClick={() => up((r) => void ((r.templateId = x.id), (r.accent = x.accent), (r.font = x.font)))}>
                    <TemplatePreview id={x.id} />
                    <span>{x.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="ce-zoom" style={{ width: 794 * zoom, height: paperH * zoom }}>
              <div className="ce-inner" ref={innerRef} style={{ transform: `scale(${zoom})` }}>
                <div className="paper ce-paper">
                  <CanvasContext.Provider value={api}>
                    <Cv resume={resume} />
                  </CanvasContext.Provider>
                  {pageLines.map((y, n) => (
                    <div key={y} className="ce-pagebreak" style={{ top: y }}>
                      <span>page {n + 2}</span>
                    </div>
                  ))}
                </div>
                {box && <div className="ce-sel" style={{ left: box.x / zoom, top: box.y / zoom, width: box.w / zoom, height: box.h / zoom }} />}
                {drop && <div className="ce-drop" style={{ left: drop.x / zoom, top: drop.y / zoom, width: drop.w / zoom }} />}
              </div>
              <div className="ce-overlay">
                {toolbar()}
                {datePopover()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

