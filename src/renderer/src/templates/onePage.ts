import { useLayoutEffect, useRef } from 'react'

/** Page A4 à l'écran (794 × 1123 px). */
export const PAGE_W = 794
export const PAGE_H = 1123
/** Marges haute et basse des pages ATS à l'impression (14 mm chacune). */
const ATS_PRINT_MARGINS = 106
/** Réduction maximale : en dessous, le texte ne serait plus lisible. */
const MIN_ZOOM = 0.5
/** Marge de sécurité sous le bas de la page : le rendu imprimé diffère de quelques pixels de l'écran. */
const SLACK = 30

/** Facteur de réduction appliqué à un CV (1 s'il tient déjà sur une page). */
export const cvZoom = (cv: Element | null) => parseFloat((cv as HTMLElement | null)?.style.zoom || '1') || 1

/**
 * Tous les modèles tiennent sur une seule page : si le contenu dépasse, le CV entier est réduit
 * (polices, espacements et formes ensemble, proportions conservées) juste assez pour tenir,
 * et sa largeur est compensée pour garder exactement la largeur A4. Aperçu, toile et PDF.
 * Le ref se pose sur un conteneur transparent (display: contents) autour de l'élément .cv.
 */
export function useOnePage() {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const wrap = ref.current
    const el = wrap?.firstElementChild as HTMLElement | null
    if (!wrap || !el) return
    const host = wrap.parentElement
    const visual = el.classList.contains('cv-visual')
    const print = !!el.closest('.print-root')
    // Hauteur utile : page entière pour les modèles visuels, moins les marges imprimées pour l'ATS.
    const limit = PAGE_H - (print && !visual ? ATS_PRINT_MARGINS + SLACK : 0) - SLACK
    // Hauteur visible ramenée à l'échelle de la page (les miniatures sont réduites par transform).
    const scale = () => (host && host.offsetWidth ? host.getBoundingClientRect().width / host.offsetWidth || 1 : 1)
    const height = () => el.getBoundingClientRect().height / scale()
    const apply = (z: number, measuring: boolean) => {
      el.style.zoom = z === 1 ? '' : String(z)
      el.style.width = z === 1 ? '' : `${PAGE_W / z}px`
      el.style.minHeight = measuring ? '0px' : z === 1 || (print && !visual) ? '' : `${(PAGE_H - 2) / z}px`
    }
    const fit = () => {
      apply(1, true)
      let z = 1
      if (height() > limit) {
        // Recherche du plus grand facteur qui fait tenir le contenu sur la page.
        let lo = MIN_ZOOM
        let hi = 1
        for (let i = 0; i < 9; i++) {
          const mid = (lo + hi) / 2
          apply(mid, true)
          if (height() <= limit) lo = mid
          else hi = mid
        }
        z = Math.floor(lo * 1000) / 1000
      }
      apply(z, false)
      el.dataset.fit = String(z)
    }
    // Export PDF des modèles qui le demandent : leur fond couvre aussi la page entière, derrière le CV.
    if (print) {
      const bg = getComputedStyle(el).getPropertyValue('--rp-page-bg').trim()
      if (bg) document.documentElement.style.setProperty('background', bg, 'important')
    }
    fit()
    // Polices chargées : nouvelle mesure tout de suite (avant la génération du PDF, qui attend aussi les polices).
    let alive = true
    document.fonts?.ready.then(() => alive && fit())
    // Recalcul à l'image suivante : on ne modifie pas la page pendant que l'observateur la mesure.
    let frame = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fit)
    })
    for (const c of el.children) ro.observe(c)
    return () => {
      alive = false
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  })
  return ref
}
