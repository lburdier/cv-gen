import { DEFAULT_DESIGN } from '../../../shared/design'
import type { DesignSpec } from '../../../shared/types'
import { contrast, hsl, rgbToHex } from '../templates/color'
import { extractColors } from './palette'

/**
 * Analyse locale d'une image de CV, sans IA : lecture des pixels pour retrouver le fond de page,
 * une colonne latérale, un bandeau d'en-tête, une photo et les couleurs d'accent.
 * Sert seule (hors ligne) ou de mesure fiable transmise à l'IA.
 */

type RGB = [number, number, number]
const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const avg = (px: RGB[]): RGB => {
  if (!px.length) return [255, 255, 255]
  const s = px.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0])
  return [s[0] / px.length, s[1] / px.length, s[2] / px.length]
}
const hex = (c: RGB) => rgbToHex(c[0], c[1], c[2])
/** Peau (règle RVB classique) : repère une photo de profil. */
const isSkin = ([r, g, b]: RGB) => r > 95 && g > 40 && b > 20 && r > g && r > b && r - Math.min(g, b) > 15 && Math.abs(r - g) > 15

export async function analyzeImageLocal(src: string): Promise<{ design: DesignSpec; notes: string[] }> {
  const img = new Image()
  img.src = src
  await img.decode()
  const W = 160
  const H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.drawImage(img, 0, 0, W, H)
  const data = ctx.getImageData(0, 0, W, H).data
  const at = (x: number, y: number): RGB => {
    const i = (y * W + x) * 4
    return [data[i], data[i + 1], data[i + 2]]
  }
  const notes: string[] = []

  // 1. Fond de page : couleur la plus fréquente (quantifiée).
  const counts = new Map<number, { c: RGB[]; n: number }>()
  for (let y = 0; y < H; y += 2)
    for (let x = 0; x < W; x += 2) {
      const p = at(x, y)
      const k = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4)
      const e = counts.get(k) ?? { c: [], n: 0 }
      e.c.push(p)
      e.n++
      counts.set(k, e)
    }
  const ranked = [...counts.values()].sort((a, b) => b.n - a.n)
  const page = avg(ranked[0].c)
  const near = (p: RGB, ref: RGB, tol = 34) => dist(p, ref) < tol

  // Version floutée (réduite) : trames de points, textures et texte fin se fondent en aplats,
  // ce qui rend la détection des fonds (colonne, bandeau) fiable.
  const BW = 48
  const BH = Math.max(1, Math.round((H / W) * BW))
  const blur = document.createElement('canvas')
  blur.width = BW
  blur.height = BH
  const bctx = blur.getContext('2d', { willReadFrequently: true })!
  bctx.imageSmoothingEnabled = true
  bctx.imageSmoothingQuality = 'high'
  bctx.drawImage(canvas, 0, 0, BW, BH)
  const bdata = bctx.getImageData(0, 0, BW, BH).data
  const bat = (x: number, y: number): RGB => {
    const i = (y * BW + x) * 4
    return [bdata[i], bdata[i + 1], bdata[i + 2]]
  }

  // 2. Colonne latérale : bandes verticales dont la majorité des pixels n'est pas le fond de page.
  const yFrom = Math.round(H * 0.25)
  const byFrom = Math.round(BH * 0.25)
  const colOff = Array.from({ length: BW }, (_, x) => {
    let off = 0
    let n = 0
    for (let y = byFrom; y < BH; y++) {
      n++
      if (!near(bat(x, y), page, 22)) off++
    }
    return off / n
  })
  const run = (from: number, step: number) => {
    let x = from
    while (x >= 0 && x < BW && colOff[x] > 0.72) x += step
    return Math.round((Math.abs(x - from) / BW) * W)
  }
  const leftW = run(0, 1)
  const rightW = run(BW - 1, -1)
  let layout: DesignSpec['layout'] = 'single'
  let sideCol: RGB = page
  let sideFrom = 0
  let sideTo = 0
  if (leftW / W > 0.18 && leftW / W < 0.5) {
    layout = 'sidebar-left'
    sideFrom = 0
    sideTo = leftW
  } else if (rightW / W > 0.18 && rightW / W < 0.5) {
    layout = 'sidebar-right'
    sideFrom = W - rightW
    sideTo = W
  }
  if (layout !== 'single') {
    const px: RGB[] = []
    for (let y = yFrom; y < H; y += 3) for (let x = sideFrom + 2; x < sideTo - 2; x += 3) px.push(at(x, y))
    // Couleur de fond de la colonne : la plus fréquente parmi ses pixels.
    const m = new Map<number, RGB[]>()
    for (const p of px) {
      const k = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4)
      m.set(k, [...(m.get(k) ?? []), p])
    }
    sideCol = avg([...m.values()].sort((a, b) => b.length - a.length)[0] ?? [page])
    if (dist(sideCol, page) < 20) layout = 'single'
    else notes.push(`Colonne latérale ${layout === 'sidebar-left' ? 'à gauche' : 'à droite'} sur ${Math.round(((sideTo - sideFrom) / W) * 100)} % de la largeur`)
  }

  // 2 bis. Deux colonnes sur le même fond : une gouttière verticale vide sépare le texte.
  if (layout === 'single') {
    const yA = Math.round(H * 0.32)
    const yB = Math.round(H * 0.95)
    const blank = (x: number) => {
      let ok = 0
      let n = 0
      for (let y = yA; y < yB; y++) {
        n++
        if (near(at(x, y), page, 26)) ok++
      }
      return ok / n
    }
    let best: { from: number; to: number } | null = null
    let start = -1
    for (let x = Math.round(W * 0.22); x <= Math.round(W * 0.78); x++) {
      if (blank(x) > 0.97) {
        if (start < 0) start = x
      } else if (start >= 0) {
        if (!best || x - start > best.to - best.from) best = { from: start, to: x }
        start = -1
      }
    }
    if (best && best.to - best.from >= 2) {
      const mid = (best.from + best.to) / 2 / W
      layout = mid < 0.5 ? 'sidebar-left' : 'sidebar-right'
      sideFrom = mid < 0.5 ? 0 : Math.round(mid * W)
      sideTo = mid < 0.5 ? Math.round(mid * W) : W
      sideCol = page
      notes.push(`Deux colonnes : colonne ${mid < 0.5 ? 'de gauche' : 'de droite'} sur ${Math.round(((sideTo - sideFrom) / W) * 100)} % de la largeur`)
    }
  }

  // 3. Bandeau d'en-tête : lignes du haut majoritairement hors fond de page, sur toute la largeur.
  let bBand = 0
  for (let y = 0; y < BH * 0.45; y++) {
    let off = 0
    for (let x = 0; x < BW; x++) if (!near(bat(x, y), page, 22)) off++
    if (off / BW > 0.7) bBand = y + 1
    else if (y > 2 && bBand < y - 1) break
  }
  const bandH = Math.round((bBand / BH) * H)
  let header: DesignSpec['header'] = 'minimal'
  let headerCol: RGB = page
  if (bandH / H > 0.06) {
    const px: RGB[] = []
    for (let y = 1; y < bandH - 1; y += 2) for (let x = 0; x < W; x += 3) px.push(at(x, y))
    const m = new Map<number, RGB[]>()
    for (const p of px) {
      const k = ((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4)
      m.set(k, [...(m.get(k) ?? []), p])
    }
    const solid = avg([...m.values()].sort((a, b) => b.length - a.length)[0] ?? [page])
    const blurred: RGB[] = []
    for (let y = 0; y < bBand; y++) for (let x = 0; x < BW; x++) blurred.push(bat(x, y))
    const mean = avg(blurred)
    // Aplat uni : la couleur dominante ; trame ou texture : la teinte moyenne perçue.
    headerCol = dist(solid, mean) < 40 ? solid : mean
    // Le bandeau touche-t-il les bords ? Sinon c'est une carte.
    let touch = 0
    let rows = 0
    for (let y = 0; y < bBand; y++) {
      rows++
      if (!near(bat(0, y), page, 22) && !near(bat(BW - 1, y), page, 22)) touch++
    }
    const edge = rows > 0 && touch / rows > 0.6
    header = edge ? 'band' : 'card'
    notes.push(header === 'band' ? 'En-tête en bandeau de couleur pleine largeur' : 'En-tête dans un bloc coloré')
  }

  // 4. Photo : amas de pixels de peau dans le premier tiers.
  let skin = 0
  let sx = 0
  for (let y = 0; y < H * 0.4; y += 2)
    for (let x = 0; x < W; x += 2)
      if (isSkin(at(x, y))) {
        skin++
        sx += x
      }
  const area = (W / 2) * ((H * 0.4) / 2)
  const hasPhoto = skin / area > 0.006
  const photoX = hasPhoto ? sx / skin / W : 0.5
  const inSide = hasPhoto && layout !== 'single' && photoX * W >= sideFrom && photoX * W <= sideTo
  if (hasPhoto) notes.push(`Photo détectée ${inSide ? 'dans la colonne latérale' : photoX > 0.6 ? 'à droite de l’en-tête' : 'dans l’en-tête'}`)

  // 5. Couleurs d'accent : teintes saturées hors fonds.
  const found = await extractColors(src, 14)
  // Fonds exclus des accents, sauf un fond très saturé (bandeau ou colonne de la couleur d'accent).
  const fonds = [page, ...[sideCol, headerCol].filter((c) => hsl(hex(c))[1] < 0.5)]
  const accents = found.filter((c) => {
    const [, s, l] = hsl(c)
    const rgb: RGB = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]
    return s > 0.22 && l > 0.12 && l < 0.88 && fonds.every((f) => dist(rgb, f) > 40)
  })
  const pageHex = hex(page)
  // Principale : la plus saturée des teintes fréquentes et lisibles sur la page.
  const readableAccents = accents.filter((c) => contrast(c, pageHex) >= 2.4)
  const primary =
    readableAccents
      .slice(0, 5)
      .map((c, i) => ({ c, score: hsl(c)[1] * (1 - 0.12 * i) }))
      .sort((x, y) => y.score - x.score)[0]?.c ?? (layout !== 'single' && contrast(hex(sideCol), pageHex) > 2 ? hex(sideCol) : header !== 'minimal' ? hex(headerCol) : DEFAULT_DESIGN.colors.primary)
  const secondary = accents.find((c) => c !== primary) ?? (layout !== 'single' ? hex(sideCol) : DEFAULT_DESIGN.colors.secondary)
  // Texte : la couleur sombre (ou claire sur fond sombre) la plus fréquente.
  const dark = hsl(pageHex)[2] < 0.45
  const textC = ranked.slice(1, 40).map((e) => avg(e.c)).find((c) => contrast(hex(c), pageHex) > 6) ?? (dark ? [240, 240, 240] : [20, 20, 20])
  if (accents.length) notes.push(`Couleur d’accent ${primary}${secondary !== primary ? ` et ${secondary}` : ''}`)

  const design: DesignSpec = {
    ...DEFAULT_DESIGN,
    layout,
    sidebarWidth: layout === 'single' ? DEFAULT_DESIGN.sidebarWidth : Math.min(42, Math.max(24, Math.round(((sideTo - sideFrom) / W) * 100))),
    header,
    photo: hasPhoto ? 'circle' : 'none',
    photoPlace: inSide ? 'sidebar' : 'header',
    photoSide: photoX > 0.55 ? 'right' : 'left',
    headerAlign: 'left',
    colors: {
      primary,
      secondary,
      page: pageHex,
      text: hex(textC as RGB),
      sidebar: layout === 'single' ? pageHex : hex(sideCol),
      header: header === 'minimal' ? pageHex : hex(headerCol)
    },
    sidebarSections: DEFAULT_DESIGN.sidebarSections
  }
  if (!notes.length) notes.push('Mise en page sur une colonne, fond uni')
  return { design, notes }
}
