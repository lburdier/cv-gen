// Score « Lecture 6 s » : un recruteur balaie un CV en quelques secondes. On mesure sur le rendu
// réel (tailles, graisses, contrastes, positions) ce que l'œil attrape d'abord : des rubriques
// bien visibles, une mise en colonne, des postes et des dates repérables, un texte assez grand.
import { SECTION_TITLES, TITLE_VARIANTS } from '../../../shared/format'
import { cvZoom } from '../templates/onePage'

export type Layout = 'rail' | 'sidebar' | 'single'

export interface ScanCriterion {
  id: 'headings' | 'columns' | 'roles' | 'dates' | 'size' | 'header'
  label: string
  score: number
  max: number
  detail: string
}

export interface ScanReport {
  score: number
  layout: Layout
  criteria: ScanCriterion[]
}

/** Intitulés reconnus comme rubriques (modèles ATS, visuels et Inspirations, en français et en anglais). */
const EXTRA_TITLES = ['Parcours', 'Contact', 'Coordonnées', 'Informations personnelles', 'À propos', 'Profil', 'En plus', 'Rendus', 'Logiciels', 'Journey', 'More', 'Selected work', 'Software', 'Personal details', 'About me', 'Outils', 'Savoir-être', 'Soft skills']
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
const TITLES = new Set(
  [
    ...Object.values(SECTION_TITLES).flatMap((t) => Object.values(t)),
    ...Object.values(TITLE_VARIANTS).flatMap((t) => Object.values(t).flat()),
    ...EXTRA_TITLES
  ].map(norm)
)

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

// Couleurs : un pixel de canvas convertit n'importe quelle couleur CSS (oklab, color-mix…) en RGB.
let ctx: CanvasRenderingContext2D | null = null
function rgb(color: string): [number, number, number, number] | null {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = '#000'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const d = ctx.getImageData(0, 0, 1, 1).data
  return [d[0], d[1], d[2], d[3] / 255]
}
const lum = ([r, g, b]: number[]) => {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
/** Contraste WCAG entre le texte d'un élément et le premier fond uni derrière lui (null si fond image). */
function contrastOf(el: Element): number | null {
  const fg = rgb(getComputedStyle(el).color)
  if (!fg) return null
  for (let p: Element | null = el; p; p = p.parentElement) {
    const cs = getComputedStyle(p)
    if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url(')) return null
    const bg = rgb(cs.backgroundColor)
    if (bg && bg[3] > 0.6) {
      const a = lum(fg)
      const b = lum(bg)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }
    if (p.classList.contains('cv')) break
  }
  return (lum([255, 255, 255]) + 0.05) / (lum(fg) + 0.05)
}

/** Éléments qui portent du texte visible (feuilles), avec leur boîte à l'écran. */
function textLeaves(root: Element) {
  const out: { el: Element; r: DOMRect; text: string }[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const seen = new Set<Element>()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement
    if (!el || seen.has(el) || !n.textContent?.trim() || el.closest('[aria-hidden]')) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue
    seen.add(el)
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    out.push({ el, r, text: (el.textContent ?? '').trim() })
  }
  return out
}

/** Taille réelle à l'écran (en points), zoom « une page » compris. */
const sizePt = (el: Element, zoom: number) => parseFloat(getComputedStyle(el).fontSize) * zoom * 0.75
const weight = (el: Element) => parseFloat(getComputedStyle(el).fontWeight) || 400

export interface ScanHints {
  /** Intitulés de poste du CV (pour retrouver les entrées d'expérience). */
  roles: string[]
  /** Le CV affiche une ligne de candidature. */
  pitch?: boolean
}

export function measureReadability(cv: HTMLElement, hints: ScanHints): ScanReport {
  const zoom = cvZoom(cv)
  const page = cv.getBoundingClientRect()
  const leaves = textLeaves(cv)
  const criteria: ScanCriterion[] = []

  // Texte courant : puces d'expérience, sinon paragraphes.
  const bodyEls = [...cv.querySelectorAll('li')].filter((li) => (li.textContent ?? '').trim().split(/\s+/).length > 5)
  const body = median((bodyEls.length ? bodyEls : [...cv.querySelectorAll('p')].filter((p) => (p.textContent ?? '').length > 60)).map((e) => sizePt(e, zoom))) || 9

  // ---- Rubriques ----
  const headings = leaves
    .filter((l) => TITLES.has(norm(l.text)))
    .map((l) => l.el)
    .filter((el, i, all) => !all.some((o, j) => j !== i && el.contains(o)))
  const hSize = median(headings.map((h) => sizePt(h, zoom)))
  const hWeight = median(headings.map(weight))
  const hContrast = median(headings.map((h) => contrastOf(h) ?? 7))
  const marked = headings.filter((h) => {
    const cs = getComputedStyle(h)
    let deco = cs.textTransform === 'uppercase' || cs.fontVariantCaps !== 'normal'
    for (let p: Element | null = h, k = 0; p && k < 3; p = p.parentElement, k++) {
      const s = getComputedStyle(p)
      if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderBottomWidth) > 0 || parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderLeftWidth) > 1) deco = true
    }
    return deco
  }).length
  const ratio = body ? hSize / body : 1
  const hScore = headings.length
    ? 12 * clamp((ratio - 0.8) / 0.35) + (hWeight >= 700 ? 6 : hWeight >= 600 ? 4 : 1) + (hContrast >= 4.5 ? 6 : hContrast >= 3 ? 3 : 0) + 6 * (marked / headings.length)
    : 0
  criteria.push({
    id: 'headings',
    label: 'Rubriques visibles',
    score: Math.round(hScore),
    max: 30,
    detail: headings.length ? `${headings.length} rubriques, ${hSize.toFixed(1)} pt (texte ${body.toFixed(1)} pt), graisse ${Math.round(hWeight)}` : 'Aucune rubrique repérable'
  })

  // ---- Format colonne ----
  // Rail : l'intitulé de la rubrique est à gauche, son contenu à droite sur la même hauteur.
  const others = leaves.filter((l) => !headings.includes(l.el))
  const railHits = headings.filter((h) => {
    const r = h.getBoundingClientRect()
    return others.some((o) => o.r.left > r.right + 8 && o.r.top < r.bottom + 30 && o.r.bottom > r.top - 4 && o.r.left - r.right < page.width * 0.5)
  }).length
  // Colonnes : sur la hauteur de la page, deux blocs de texte côte à côte sans se chevaucher.
  let sideBySide = 0
  let samples = 0
  for (let y = page.top + page.height * 0.22; y < page.top + page.height * 0.92; y += 18) {
    const row = others.filter((o) => o.r.top <= y && o.r.bottom >= y && o.r.width < page.width * 0.7)
    samples++
    if (row.some((a) => row.some((b) => b.r.left > a.r.right + 18))) sideBySide++
  }
  const layout: Layout = headings.length && railHits / headings.length >= 0.6 ? 'rail' : samples && sideBySide / samples >= 0.45 ? 'sidebar' : 'single'
  criteria.push({
    id: 'columns',
    label: 'Format colonne',
    score: layout === 'rail' ? 25 : layout === 'sidebar' ? 20 : 8,
    max: 25,
    detail: layout === 'rail' ? 'Rubriques en colonne à gauche, contenu à droite' : layout === 'sidebar' ? 'Deux colonnes : infos clés à part, parcours à côté' : 'Une seule colonne'
  })

  // ---- Postes repérables ----
  const roleEls = hints.roles
    .filter(Boolean)
    .slice(0, 3)
    .map((role) => leaves.find((l) => norm(l.text).includes(norm(role).slice(0, 24)) && l.text.length < role.length + 40)?.el)
    .filter((x): x is Element => Boolean(x))
  if (roleEls.length) {
    const w = median(roleEls.map(weight))
    const s = median(roleEls.map((e) => sizePt(e, zoom)))
    const c = median(roleEls.map((e) => contrastOf(e) ?? 7))
    const score = (w >= 650 ? 7 : w >= 600 ? 5 : w >= 500 ? 3 : 1) + (s / body >= 1.05 ? 5 : s / body >= 0.98 ? 3 : 1) + (c >= 4.5 ? 3 : c >= 3 ? 1 : 0)
    criteria.push({ id: 'roles', label: 'Postes repérables', score, max: 15, detail: `Intitulés en ${s.toFixed(1)} pt, graisse ${Math.round(w)}` })
  } else criteria.push({ id: 'roles', label: 'Postes repérables', score: 0, max: 15, detail: 'Intitulés de poste introuvables' })

  // ---- Dates alignées ----
  const dates = leaves.filter((l) => /\b(19|20)\d{2}\b/.test(l.text) && l.text.length <= 28 && !headings.includes(l.el))
  if (dates.length >= 2) {
    const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs)
    const lefts = dates.map((d) => d.r.left)
    const rights = dates.map((d) => d.r.right)
    // Les dates les plus fréquentes partagent un bord (colonne de dates) : on tolère quelques écarts.
    const share = (xs: number[]) => Math.max(...xs.map((x) => xs.filter((y) => Math.abs(y - x) < 4).length)) / xs.length
    const aligned = Math.max(share(lefts), share(rights))
    const score = aligned >= 0.75 ? 10 : aligned >= 0.5 ? 7 : spread(lefts) < 60 ? 5 : 3
    criteria.push({ id: 'dates', label: 'Dates alignées', score, max: 10, detail: `${Math.round(aligned * 100)} % des dates sur un même axe` })
  } else criteria.push({ id: 'dates', label: 'Dates alignées', score: 0, max: 10, detail: 'Dates peu visibles' })

  // ---- Taille du texte ----
  criteria.push({ id: 'size', label: 'Texte lisible', score: Math.round(10 * clamp((body - 7) / 2)), max: 10, detail: `Texte courant en ${body.toFixed(1)} pt` })

  // ---- En-tête : nom, titre, candidature ----
  const name = cv.querySelector('h1')
  const nameSize = name ? sizePt(name, zoom) : 0
  const pitch = cv.querySelector('.cv-pitch')
  const pitchVisible = Boolean(pitch && pitch.getBoundingClientRect().top - page.top < page.height * 0.4)
  criteria.push({
    id: 'header',
    label: 'Qui, quoi, où',
    score: (nameSize >= body * 2.2 ? 4 : nameSize >= body * 1.6 ? 2 : 0) + 3 + (pitchVisible || !hints.pitch ? 3 : 0),
    max: 10,
    detail: pitchVisible ? 'Nom, titre et candidature visibles en haut' : 'Nom et titre visibles en haut'
  })

  const score = Math.round(criteria.reduce((s, c) => s + c.score, 0))
  return { score: Math.min(100, score), layout, criteria }
}

export function scanVerdict(score: number): string {
  return score >= 85 ? 'Excellent' : score >= 72 ? 'Très bon' : score >= 60 ? 'Bon' : 'À revoir'
}
