import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent, type RefObject } from 'react'
import type { Resume } from '../../../shared/types'
import { chooseImage } from '../lib/image'

type Up = (fn: (r: Resume) => void) => void

/** Onglet du formulaire et champ à cibler pour chaque élément texte de l'aperçu. */
const FIELD_TAB: Record<string, string> = {
  firstName: 'identity',
  lastName: 'identity',
  headline: 'identity',
  ctaLabel: 'identity',
  summary: 'summary'
}

const IMAGE_KINDS = ['photo', 'banner', 'gallery', 'icon']
const isImageTarget = (edit: string) => IMAGE_KINDS.includes(edit.split(':')[0])

export interface HoverLabel {
  text: string
  x: number
  y: number
  w: number
  h: number
}

/**
 * Édition directe dans l'aperçu : survol (cadre + étiquette), clic (image → sélecteur,
 * texte → champ du formulaire), dépôt d'une image, poignée de hauteur du bandeau.
 */
export function usePreviewEditing(opts: {
  scrollRef: RefObject<HTMLDivElement | null>
  up: Up
  setTab: (tab: string) => void
  scale: number
}) {
  const { scrollRef, up, setTab, scale } = opts
  const [label, setLabel] = useState<HoverLabel | null>(null)
  const current = useRef<HTMLElement | null>(null)
  const dragging = useRef(false)

  const highlight = useCallback(
    (el: HTMLElement | null) => {
      if (current.current === el) return
      current.current?.classList.remove('edit-hover')
      current.current = el
      const box = scrollRef.current
      if (!el || !box) return setLabel(null)
      el.classList.add('edit-hover')
      const r = el.getBoundingClientRect()
      const c = box.getBoundingClientRect()
      setLabel({
        text: el.dataset.editLabel ?? 'Modifier',
        x: r.left - c.left + box.scrollLeft,
        y: r.top - c.top + box.scrollTop,
        w: r.width,
        h: r.height
      })
    },
    [scrollRef]
  )

  useEffect(() => () => current.current?.classList.remove('edit-hover'), [])

  const target = (e: { target: EventTarget | null }) => (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-edit]') ?? null

  /** Applique une image à l'élément visé. */
  const setImage = useCallback(
    async (edit: string, file?: File) => {
      const [kind, ...rest] = edit.split(':')
      const max = kind === 'icon' ? 256 : kind === 'photo' ? 800 : kind === 'banner' ? 1800 : 1400
      const img = await chooseImage(max, file)
      if (!img) return
      up((x) => {
        if (kind === 'photo') x.basics.photo = img
        else if (kind === 'banner') x.basics.banner = img
        else if (kind === 'gallery') {
          const g = (x.gallery ?? []).find((y) => y.id === rest[0])
          if (g) g.image = img
        } else if (kind === 'icon') {
          const [gid, ...name] = rest
          const g = x.skills.find((y) => y.id === gid)
          if (g) g.icons = { ...(g.icons ?? {}), [name.join(':')]: img }
        }
      })
    },
    [up]
  )

  const onClick = (e: MouseEvent) => {
    if (dragging.current) return
    const el = target(e)
    if (!el) return
    e.preventDefault()
    const edit = el.dataset.edit!
    if (isImageTarget(edit)) return void setImage(edit)
    const [kind, value] = edit.split(':')
    if (kind === 'tab') return setTab(value)
    if (kind === 'field') {
      setTab(FIELD_TAB[value] ?? 'identity')
      // Le formulaire change d'onglet puis on place le curseur dans le champ.
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`.editor-form [data-field="${value}"]`)
        if (!input) return
        input.scrollIntoView({ block: 'center', behavior: 'smooth' })
        input.focus()
        input.select?.()
      }, 60)
    }
  }

  const onMouseOver = (e: MouseEvent) => {
    if (!dragging.current) highlight(target(e))
  }
  const onMouseLeave = () => {
    if (!dragging.current) highlight(null)
  }

  const onDragOver = (e: DragEvent) => {
    const el = target(e)
    if (el && isImageTarget(el.dataset.edit!)) {
      e.preventDefault()
      highlight(el)
    }
  }
  const onDrop = (e: DragEvent) => {
    const el = target(e)
    const file = e.dataTransfer.files?.[0]
    if (!el || !file || !isImageTarget(el.dataset.edit!)) return
    e.preventDefault()
    void setImage(el.dataset.edit!, file)
  }

  /** Poignée du bandeau : glisser verticalement pour changer sa hauteur. */
  const onMouseDown = (e: MouseEvent) => {
    const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-resize="banner"]')
    if (!handle) return
    const box = handle.closest<HTMLElement>('[data-banner-size]')
    if (!box) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    handle.classList.add('dragging')
    const startY = e.clientY
    const startH = box.getBoundingClientRect().height / scale
    let frame = 0
    const move = (ev: globalThis.MouseEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const h = Math.round(Math.min(480, Math.max(40, startH + (ev.clientY - startY) / scale)))
        up((x) => void (x.basics.bannerHeight = h))
      })
    }
    const stop = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', stop)
      handle.classList.remove('dragging')
      // Le clic qui suit le relâchement ne doit pas ouvrir le sélecteur d'image.
      setTimeout(() => (dragging.current = false), 0)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', stop)
  }

  return { label, handlers: { onClick, onMouseOver, onMouseLeave, onDragOver, onDrop, onMouseDown } }
}
