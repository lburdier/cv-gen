import { hexToRgb, hsl, rgbToHex } from '../templates/color'

/** Harmonies prêtes à l'emploi : couleur principale + couleur secondaire. */
export const HARMONIES: { name: string; colors: [string, string] }[] = [
  { name: 'Électrique', colors: ['#2323E6', '#F0A6F7'] },
  { name: 'Citron vert', colors: ['#111111', '#C6F432'] },
  { name: 'Forêt', colors: ['#0F6E5C', '#C6F432'] },
  { name: 'Encre & or', colors: ['#111111', '#FACC15'] },
  { name: 'Marine & corail', colors: ['#1E2A4A', '#E4572E'] },
  { name: 'Bordeaux & rose', colors: ['#7F1D1D', '#F9A8D4'] },
  { name: 'Lavande', colors: ['#6D28D9', '#F0A6F7'] },
  { name: 'Océan', colors: ['#0369A1', '#5EEAD4'] },
  { name: 'Menthe', colors: ['#047857', '#5EEAD4'] },
  { name: 'Prune & anis', colors: ['#4C1D95', '#C6F432'] },
  { name: 'Cerise', colors: ['#BE185D', '#FDE047'] },
  { name: 'Ardoise', colors: ['#3F3F46', '#93C5FD'] },
  { name: 'Terracotta', colors: ['#C2410C', '#FDE047'] },
  { name: 'Nuit', colors: ['#0B1F3A', '#F0A6F7'] },
  { name: 'Rouge suisse', colors: ['#B91C1C', '#111111'] },
  { name: 'Sauge', colors: ['#4D7C0F', '#F9A8D4'] }
]

const dist = (a: [number, number, number], b: [number, number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/**
 * Couleurs dominantes d'une image (logo, photo, charte) : quantification des pixels,
 * puis sélection de teintes bien distinctes, en favorisant les couleurs saturées.
 */
export async function extractColors(src: string, count = 6): Promise<string[]> {
  const img = new Image()
  img.src = src
  await img.decode()
  const max = 96
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * k))
  const h = Math.max(1, Math.round(img.naturalHeight * k))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 160) continue // pixels transparents (logos détourés)
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const e = buckets.get(key)
    if (e) {
      e.r += r
      e.g += g
      e.b += b
      e.n++
    } else buckets.set(key, { r, g, b, n: 1 })
  }

  const candidates = [...buckets.values()]
    .map((e) => {
      const hex = rgbToHex(e.r / e.n, e.g / e.n, e.b / e.n)
      const [, s, l] = hsl(hex)
      // Fonds blancs ou presque : peu utiles comme couleur d'accent.
      const weight = e.n * (0.35 + s) * (l > 0.93 ? 0.15 : 1)
      return { hex, weight }
    })
    .sort((a, b) => b.weight - a.weight)

  const picked: string[] = []
  for (const c of candidates) {
    const rgb = hexToRgb(c.hex)!
    if (picked.every((p) => dist(hexToRgb(p)!, rgb) > 56)) picked.push(c.hex)
    if (picked.length >= count) break
  }
  return picked
}

/** Choisit une couleur principale lisible et une secondaire distincte parmi des couleurs extraites. */
export function pickPair(colors: string[]): string[] {
  if (!colors.length) return []
  const main = colors.find((c) => {
    const [, s, l] = hsl(c)
    return s > 0.25 && l > 0.15 && l < 0.62
  }) ?? colors[0]
  const second = colors.find((c) => c !== main)
  return second ? [main, second] : [main]
}
