import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { create } from 'zustand'
import { X } from 'lucide-react'
import { markTourSeen, routeForTour, seenTours, tourById, tourForRoute, toursAuto, type TourId, type TourStep } from '../lib/tours'
import { useStore } from '../store'

interface TourState {
  id: TourId | null
  step: number
  start(id: TourId): void
  stop(): void
  goto(step: number): void
}

export const useTour = create<TourState>((set) => ({
  id: null,
  step: 0,
  start(id) {
    markTourSeen(id)
    set({ id, step: 0 })
  },
  stop() {
    set({ id: null, step: 0 })
  },
  goto(step) {
    set({ step })
  }
}))

const visible = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

function targetOf(step: TourStep): HTMLElement | null {
  if (!step.sel) return null
  const els = [...document.querySelectorAll<HTMLElement>(step.sel)].filter(visible)
  if (!step.text) return els[0] ?? null
  // Texte en tête de l'élément d'abord (un titre de section), sinon n'importe où dans l'élément.
  return els.find((e) => e.textContent?.trim().startsWith(step.text!)) ?? els.find((e) => e.textContent?.includes(step.text!)) ?? null
}

/** Étapes réellement affichables : les étapes facultatives sans cible sont retirées. */
function liveSteps(id: TourId): TourStep[] {
  return (tourById(id)?.steps ?? []).filter((s) => (!s.optional || targetOf(s)) && !(s.unless && document.querySelector(s.unless)))
}

/** Tutoriel de la page affichée. */
export function startPageTour(): void {
  const id = tourForRoute(useStore.getState().route)
  if (id) useTour.getState().start(id)
}

/** Lance un tutoriel depuis n'importe où : ouvre la page puis attend qu'elle soit affichée. */
export function launchTour(id: TourId): boolean {
  const s = useStore.getState()
  const route = routeForTour(id, s.data.resumes[0]?.id)
  if (!route) return false
  if (id === 'canvas' || id === 'editor') {
    try {
      localStorage.setItem('cvgen.editorMode', id === 'canvas' ? 'canvas' : 'form')
    } catch {
      /* rien */
    }
  }
  useTour.getState().stop()
  // Marqué comme vu avant d'ouvrir la page : le tutoriel automatique de la première visite ne se lance pas en double.
  markTourSeen(id)
  clearTimeout(pending)
  s.go(route)
  if (id === 'canvas' || id === 'editor') window.dispatchEvent(new CustomEvent('cvgen:editor-mode', { detail: id === 'canvas' ? 'canvas' : 'form' }))
  // Attend que la page (chargée à la demande) soit affichée.
  const first = tourById(id)?.steps.find((st) => st.sel && !st.optional)
  let tries = 0
  const wait = () => {
    if (tries++ > 40 || (pageReady() && (!first || targetOf(first)))) setTimeout(() => useTour.getState().start(id), 120)
    else setTimeout(wait, 100)
  }
  setTimeout(wait, 150)
  return true
}

/** La page est rendue (et pas l'indicateur de chargement d'une page chargée à la demande). */
const pageReady = () => !document.querySelector('.content .splash') && !!document.querySelector('.content > *')

let pending: ReturnType<typeof setTimeout> | undefined
/** Première visite d'une page : lance son tutoriel s'il n'a jamais été vu (rien n'est ouvert par-dessus). */
export function autoTour(): void {
  clearTimeout(pending)
  if (window.cvgen?.quiet || !toursAuto()) return
  let tries = 0
  const fire = () => {
    if (!pageReady() && tries++ < 20) {
      pending = setTimeout(fire, 150)
      return
    }
    const st = useStore.getState()
    if (useTour.getState().id || st.paletteOpen || document.querySelector('.overlay')) return
    const id = tourForRoute(st.route)
    if (id && !seenTours().has(id)) useTour.getState().start(id)
  }
  pending = setTimeout(fire, 650)
}

interface Box {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 6
const CARD_W = 340

/** Visite guidée : projecteur sur l'élément visé et carte d'explication. */
export function TourHost() {
  const id = useTour((s) => s.id)
  const stepIdx = useTour((s) => s.step)
  const route = useStore((s) => s.route)
  const [box, setBox] = useState<Box | null>(null)
  const [cardH, setCardH] = useState(180)
  const cardRef = useRef<HTMLDivElement>(null)
  const [steps, setSteps] = useState<TourStep[]>([])

  // Première visite de chaque page.
  const routeKey = route.name + ('id' in route ? `:${route.id ?? ''}` : '')
  useEffect(() => {
    autoTour()
  }, [routeKey])

  // Changement de page pendant un tutoriel : il s'arrête.
  const startedOn = useRef(routeKey)
  useEffect(() => {
    if (id) startedOn.current = routeKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  useEffect(() => {
    if (id && startedOn.current !== routeKey) useTour.getState().stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  useEffect(() => {
    setSteps(id ? liveSteps(id) : [])
  }, [id])

  const step = steps[Math.min(stepIdx, steps.length - 1)]

  // Fait défiler jusqu'à la cible, puis suit sa position (défilement, redimensionnement, animations).
  useEffect(() => {
    if (!step) return
    const el = targetOf(step)
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.top < 70 || r.bottom > window.innerHeight - 20) {
        el.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center' })
      }
    }
    let raf = 0
    let last = ''
    const track = () => {
      const t = targetOf(step)
      const r = t?.getBoundingClientRect()
      const b = r ? { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } : null
      const key = b ? `${Math.round(b.top)},${Math.round(b.left)},${Math.round(b.width)},${Math.round(b.height)}` : 'none'
      if (key !== last) {
        last = key
        setBox(b)
      }
      raf = requestAnimationFrame(track)
    }
    track()
    return () => cancelAnimationFrame(raf)
  }, [step])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  }, [step, box])

  const n = steps.length
  const i = Math.min(stepIdx, n - 1)
  const next = () => (i >= n - 1 ? useTour.getState().stop() : useTour.getState().goto(i + 1))
  const prev = () => i > 0 && useTour.getState().goto(i - 1)

  useEffect(() => {
    if (!id) return
    const k = (e: KeyboardEvent) => {
      const a = document.activeElement as HTMLElement | null
      if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return
      if (e.key === 'Escape') useTour.getState().stop()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') prev()
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  })

  if (!id || !step) return null

  // Position de la carte : sous la cible, sinon au-dessus, sinon à côté ; toujours dans la fenêtre.
  const vw = window.innerWidth
  const vh = window.innerHeight
  let pos: { top: number; left: number }
  let side = 'center'
  if (!box) pos = { top: vh / 2 - cardH / 2, left: vw / 2 - CARD_W / 2 }
  else {
    const below = vh - (box.top + box.height)
    const above = box.top
    const right = vw - (box.left + box.width)
    if (below >= cardH + 16) {
      side = 'below'
      pos = { top: box.top + box.height + 12, left: box.left + box.width / 2 - CARD_W / 2 }
    } else if (above >= cardH + 16) {
      side = 'above'
      pos = { top: box.top - cardH - 12, left: box.left + box.width / 2 - CARD_W / 2 }
    } else if (right >= CARD_W + 16) {
      side = 'right'
      pos = { top: box.top + Math.min(box.height, vh) / 2 - cardH / 2, left: box.left + box.width + 12 }
    } else if (box.left >= CARD_W + 16) {
      side = 'left'
      pos = { top: box.top + Math.min(box.height, vh) / 2 - cardH / 2, left: box.left - CARD_W - 12 }
    } else {
      side = 'inside'
      pos = { top: vh - cardH - 24, left: vw / 2 - CARD_W / 2 }
    }
    pos.left = Math.max(12, Math.min(vw - CARD_W - 12, pos.left))
    pos.top = Math.max(12, Math.min(vh - cardH - 12, pos.top))
  }
  const tour = tourById(id)!

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={`Tutoriel : ${tour.name}`}>
      <div className="tour-block" onClick={(e) => e.stopPropagation()} />
      {/* Voile avec une découpe autour de la cible (masque SVG : couvre aussi la barre du haut). */}
      <svg className="tour-dim" width="100%" height="100%" aria-hidden>
        <defs>
          <mask id="tour-hole">
            <rect width="100%" height="100%" fill="#fff" />
            <rect
              className="tour-hole"
              rx="14"
              fill="#000"
              style={(box ? { x: box.left, y: box.top, width: box.width, height: box.height } : { x: vw / 2, y: vh / 2, width: 0, height: 0 }) as CSSProperties}
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" mask="url(#tour-hole)" />
      </svg>
      {box && <div className="tour-spot" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} />}
      <div ref={cardRef} className={`tour-card side-${side}`} style={{ top: pos.top, left: pos.left, width: CARD_W }} key={`${id}:${i}`}>
        <div className="tour-head">
          <span className="mono-label">
            {tour.name} · {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
          <button className="icon-btn sm" onClick={() => useTour.getState().stop()} aria-label="Fermer le tutoriel" title="Fermer (Échap)">
            <X size={14} />
          </button>
        </div>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-body">{step.body}</p>
        <div className="tour-foot">
          <div className="tour-dots" aria-hidden>
            {steps.map((_, k) => (
              <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />
            ))}
          </div>
          {i === 0 ? (
            <button className="btn btn-ghost btn-sm" onClick={() => useTour.getState().stop()}>
              Passer
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={prev}>
              Précédent
            </button>
          )}
          <button className="btn btn-ink btn-sm tour-next" onClick={next}>
            {i >= n - 1 ? 'Terminer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )
}
