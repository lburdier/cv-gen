/**
 * Visuels générés par CV GEN : bandeaux et images abstraites dessinés en SVG à partir des
 * couleurs du CV. Créations originales, donc libres de droits, légères et vectorielles.
 */

export type ArtStyle = 'mesh' | 'aurora' | 'halftone' | 'grid' | 'topo' | 'bauhaus' | 'waves' | 'grain' | 'iso' | 'rings' | 'blobs'

export const ART_STYLES: { id: ArtStyle; label: string }[] = [
  { id: 'mesh', label: 'Dégradé maillé' },
  { id: 'aurora', label: 'Aurore' },
  { id: 'halftone', label: 'Trame' },
  { id: 'grid', label: 'Grille lumineuse' },
  { id: 'topo', label: 'Topographie' },
  { id: 'bauhaus', label: 'Bauhaus' },
  { id: 'waves', label: 'Vagues' },
  { id: 'grain', label: 'Grain' },
  { id: 'iso', label: 'Isométrique' },
  { id: 'rings', label: 'Ondes' },
  { id: 'blobs', label: 'Formes organiques' }
]

export interface ArtPalette {
  a: string
  b: string
  dark: boolean
}

/** Générateur pseudo-aléatoire reproductible (une graine = une variante). */
function rng(seed: number) {
  let t = seed * 9301 + 49297
  return () => {
    t = (t * 1103515245 + 12345) % 2147483648
    return t / 2147483648
  }
}

function mix(hexA: string, hexB: string, k: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.replace('#', '').padEnd(6, '0').slice(i - 1, i + 1), 16))
  const [a, b] = [p(hexA), p(hexB)]
  return '#' + a.map((x, i) => Math.round(x + (b[i] - x) * k).toString(16).padStart(2, '0')).join('')
}

export function artSvg(style: ArtStyle, pal: ArtPalette, seed = 1, w = 1600, h = 600): string {
  const r = rng(seed + style.length * 31)
  const bg = pal.dark ? mix(pal.a, '#05050a', 0.86) : mix(pal.a, '#ffffff', 0.92)
  const ink = pal.dark ? '#ffffff' : '#111111'
  const A = pal.a
  const B = pal.b
  const C = mix(A, B, 0.5)
  let defs = ''
  let body = ''
  switch (style) {
    case 'mesh': {
      defs = `<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(Math.min(w, h) * 0.18)}"/></filter>`
      body = `<g filter="url(#bl)">${[A, B, C, A]
        .map((c, i) => `<circle cx="${(0.15 + r() * 0.7) * w}" cy="${(0.1 + r() * 0.8) * h}" r="${(0.25 + r() * 0.2) * Math.max(w, h) * (i === 3 ? 0.5 : 0.6)}" fill="${c}" opacity="${0.75 + r() * 0.25}"/>`)
        .join('')}</g>`
      break
    }
    case 'aurora': {
      defs = `<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(h * 0.12)}"/></filter>`
      body = `<rect width="${w}" height="${h}" fill="${pal.dark ? bg : mix(A, '#05050a', 0.85)}"/><g filter="url(#bl)">${[A, B, C]
        .map(
          (c, i) =>
            `<ellipse cx="${(0.2 + i * 0.3 + r() * 0.1) * w}" cy="${(0.35 + r() * 0.3) * h}" rx="${w * (0.22 + r() * 0.12)}" ry="${h * (0.12 + r() * 0.1)}" fill="${c}" transform="rotate(${-25 + r() * 50} ${(0.2 + i * 0.3) * w} ${h / 2})" opacity=".9"/>`
        )
        .join('')}</g>`
      return wrap(w, h, defs, body, mix(A, '#05050a', 0.85))
    }
    case 'halftone': {
      const step = Math.round(Math.max(10, w / 110))
      defs = `<linearGradient id="fade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="m"><rect width="${w}" height="${h}" fill="url(#fade)"/></mask><pattern id="dots" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><circle cx="${step / 2}" cy="${step / 2}" r="${step * 0.28}" fill="${pal.dark ? mix(A, '#ffffff', 0.3) : A}"/></pattern>`
      body = `<rect width="${w}" height="${h}" fill="${pal.dark ? bg : mix(B, '#ffffff', 0.55)}"/><rect width="${w}" height="${h}" fill="url(#dots)" mask="url(#m)"/>`
      break
    }
    case 'grid': {
      const s = Math.round(w / (14 + r() * 8))
      defs = `<pattern id="g" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><path d="M ${s} 0 L 0 0 0 ${s}" fill="none" stroke="${pal.dark ? '#ffffff' : '#111111'}" stroke-opacity=".12" stroke-width="1.5"/></pattern><radialGradient id="glow"><stop offset="0" stop-color="${A}" stop-opacity=".95"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`
      body = `<rect width="${w}" height="${h}" fill="${pal.dark ? '#08080c' : bg}"/><circle cx="${(0.3 + r() * 0.4) * w}" cy="${h * (0.6 + r() * 0.3)}" r="${h * 0.9}" fill="url(#glow)"/><rect width="${w}" height="${h}" fill="url(#g)"/>`
      return wrap(w, h, defs, body, pal.dark ? '#08080c' : bg)
    }
    case 'topo': {
      const cx = (0.3 + r() * 0.4) * w
      const cy = (0.3 + r() * 0.4) * h
      const lines: string[] = []
      for (let k = 1; k < 26; k++) {
        const pts: string[] = []
        const base = k * Math.max(w, h) * 0.035
        const ph = r() * 6
        for (let t = 0; t <= 64; t++) {
          const ang = (t / 64) * Math.PI * 2
          const rad = base * (1 + 0.18 * Math.sin(ang * 3 + ph) + 0.08 * Math.sin(ang * 5 + k))
          pts.push(`${(cx + Math.cos(ang) * rad * 1.6).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`)
        }
        lines.push(`<polygon points="${pts.join(' ')}" fill="none" stroke="${pal.dark ? mix(A, '#ffffff', k % 4 === 0 ? 0.25 : 0.05) : A}" stroke-opacity="${k % 4 === 0 ? 0.95 : 0.45}" stroke-width="${k % 4 === 0 ? 2.6 : 1.4}"/>`)
      }
      body = lines.join('')
      break
    }
    case 'bauhaus': {
      const cols = [A, B, ink, C]
      const cell = h / 2
      const shapes: string[] = []
      for (let x = 0; x < w; x += cell)
        for (let y = 0; y < h; y += cell) {
          const c = cols[Math.floor(r() * cols.length)]
          const kind = Math.floor(r() * 4)
          if (kind === 0) shapes.push(`<circle cx="${x + cell / 2}" cy="${y + cell / 2}" r="${cell * 0.42}" fill="${c}"/>`)
          else if (kind === 1) shapes.push(`<path d="M ${x} ${y + cell} A ${cell} ${cell} 0 0 1 ${x + cell} ${y} L ${x + cell} ${y + cell} Z" fill="${c}"/>`)
          else if (kind === 2) shapes.push(`<rect x="${x + cell * 0.12}" y="${y + cell * 0.12}" width="${cell * 0.76}" height="${cell * 0.76}" fill="${c}"/>`)
          else shapes.push(`<path d="M ${x} ${y + cell} L ${x + cell / 2} ${y} L ${x + cell} ${y + cell} Z" fill="${c}"/>`)
        }
      body = shapes.join('')
      return wrap(w, h, '', body, pal.dark ? '#111114' : '#F3EFE6')
    }
    case 'waves': {
      const layers: string[] = []
      for (let k = 0; k < 5; k++) {
        const y0 = h * (0.3 + k * 0.15)
        const amp = h * (0.06 + r() * 0.06)
        const f = 1 + r() * 2
        const ph = r() * 6
        let d = `M 0 ${h} L 0 ${y0}`
        for (let x = 0; x <= w; x += w / 40) d += ` L ${x.toFixed(0)} ${(y0 + Math.sin((x / w) * Math.PI * 2 * f + ph) * amp).toFixed(1)}`
        d += ` L ${w} ${h} Z`
        layers.push(`<path d="${d}" fill="${mix(A, B, k / 4)}" opacity="${0.55 + k * 0.1}"/>`)
      }
      body = layers.join('')
      break
    }
    case 'grain': {
      defs = `<linearGradient id="gr" x1="0" y1="0" x2="1" y2="${(0.3 + r() * 0.7).toFixed(2)}"><stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="${B}"/></linearGradient><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${(0.7 + r() * 0.4).toFixed(2)}" numOctaves="2" seed="${seed}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".35"/></feComponentTransfer></filter>`
      body = `<rect width="${w}" height="${h}" fill="url(#gr)"/><rect width="${w}" height="${h}" filter="url(#n)"/>`
      break
    }
    case 'iso': {
      const s = Math.round(h / 4)
      const dx = s * 0.866
      const cubes: string[] = []
      for (let row = -1; row < h / (s * 0.75) + 1; row++)
        for (let col = -1; col < w / (dx * 2) + 1; col++) {
          const x = col * dx * 2 + (row % 2 ? dx : 0)
          const y = row * s * 0.75 * 2
          const top = [A, B, C][Math.floor(r() * 3)]
          cubes.push(
            `<path d="M ${x} ${y} l ${dx} ${s / 2} l ${-dx} ${s / 2} l ${-dx} ${-s / 2} Z" fill="${top}"/><path d="M ${x - dx} ${y + s / 2} l ${dx} ${s / 2} l 0 ${s} l ${-dx} ${-s / 2} Z" fill="${mix(top, '#000000', 0.25)}"/><path d="M ${x + dx} ${y + s / 2} l ${-dx} ${s / 2} l 0 ${s} l ${dx} ${-s / 2} Z" fill="${mix(top, '#000000', 0.45)}"/>`
          )
        }
      body = cubes.join('')
      break
    }
    case 'rings': {
      const cx = (0.6 + r() * 0.3) * w
      const cy = (0.3 + r() * 0.5) * h
      const out: string[] = []
      for (let k = 22; k > 0; k--) out.push(`<circle cx="${cx}" cy="${cy}" r="${k * Math.max(w, h) * 0.045}" fill="${mix(A, B, (k % 2 ? 0.15 : 0.65) * (k / 22))}"/>`)
      body = out.join('')
      break
    }
    case 'blobs': {
      const out: string[] = []
      for (let k = 0; k < 5; k++) {
        const cx = r() * w
        const cy = r() * h
        const rad = (0.18 + r() * 0.25) * h * 2
        const pts: [number, number][] = []
        for (let t = 0; t < 7; t++) {
          const ang = (t / 7) * Math.PI * 2
          const rr = rad * (0.78 + r() * 0.4)
          pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.7])
        }
        out.push(`<path d="${smoothClosed(pts)}" fill="${[A, B, C][k % 3]}" opacity="${0.78 + r() * 0.22}"/>`)
      }
      defs = `<filter id="bl"><feGaussianBlur stdDeviation="${Math.round(h * 0.012)}"/></filter>`
      body = `<g filter="url(#bl)">${out.join('')}</g>`
      break
    }
  }
  return wrap(w, h, defs, body, bg)
}

/** Courbe fermée lisse passant par les points (Catmull-Rom convertie en Bézier). */
function smoothClosed(p: [number, number][]): string {
  const n = p.length
  const at = (i: number) => p[(i + n) % n]
  let d = `M ${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + ' Z'
}

function wrap(w: number, h: number, defs: string, body: string, bg: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`
}

export function artDataUrl(style: ArtStyle, pal: ArtPalette, seed = 1, w = 1600, h = 600): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(artSvg(style, pal, seed, w, h))
}
