// Lecteur PDF intégré : extrait le texte comme le fait un ATS (flux compressés, polices,
// tables ToUnicode, positions) pour juger un CV déposé tel quel. Aucune dépendance externe.
import { inflateSync } from 'zlib'
import type { PdfExtraction, PdfLine } from '../shared/types'

class Ref {
  constructor(public ref: number) {}
}
type Dict = { [k: string]: Val }
type Val = number | string | boolean | null | Ref | Val[] | Dict | Name | Str
class Name {
  constructor(public n: string) {}
}
class Str {
  constructor(public b: string) {} // octets bruts en latin1
}
interface Obj {
  v: Val
  stream?: Buffer
}

const isDict = (v: unknown): v is Dict => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Name) && !(v instanceof Str) && !(v instanceof Ref)
const isRef = (v: unknown): v is Ref => v instanceof Ref
const nameOf = (v: unknown) => (v instanceof Name ? v.n : '')

// ---------- Analyse lexicale des objets PDF ----------

class Lexer {
  i: number
  constructor(
    public s: string,
    start = 0
  ) {
    this.i = start
  }
  ws() {
    const s = this.s
    for (;;) {
      const c = s.charCodeAt(this.i)
      if (c === 37) {
        while (this.i < s.length && s[this.i] !== '\n' && s[this.i] !== '\r') this.i++
      } else if (c === 32 || c === 10 || c === 13 || c === 9 || c === 12 || c === 0) this.i++
      else break
    }
  }
  value(): Val {
    this.ws()
    const s = this.s
    const c = s[this.i]
    if (c === '/') {
      let j = this.i + 1
      while (j < s.length && !/[\s/[\]<>(){}%]/.test(s[j])) j++
      const raw = s.slice(this.i + 1, j)
      this.i = j
      return new Name(raw.replace(/#([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))))
    }
    if (c === '(') return new Str(this.literal())
    if (c === '<' && s[this.i + 1] === '<') {
      this.i += 2
      const d: Dict = {}
      for (;;) {
        this.ws()
        if (s[this.i] === '>' && s[this.i + 1] === '>') {
          this.i += 2
          return d
        }
        if (this.i >= s.length) return d
        const k = this.value()
        const v = this.value()
        if (k instanceof Name) d[k.n] = v
      }
    }
    if (c === '<') {
      const j = s.indexOf('>', this.i)
      const hex = s.slice(this.i + 1, j).replace(/\s+/g, '')
      this.i = j + 1
      let out = ''
      for (let k = 0; k < hex.length; k += 2) out += String.fromCharCode(parseInt(hex.slice(k, k + 2).padEnd(2, '0'), 16))
      return new Str(out)
    }
    if (c === '[') {
      this.i++
      const a: Val[] = []
      for (;;) {
        this.ws()
        if (s[this.i] === ']' || this.i >= s.length) {
          this.i++
          return a
        }
        a.push(this.value())
      }
    }
    const m = /^[+-]?(\d+\.?\d*|\.\d+)/.exec(s.slice(this.i, this.i + 32))
    if (m) {
      this.i += m[0].length
      // Référence indirecte « n g R ».
      const r = /^\s+(\d+)\s+R\b/.exec(s.slice(this.i, this.i + 24))
      if (r && /^\d+$/.test(m[0])) {
        this.i += r[0].length
        return new Ref(Number(m[0]))
      }
      return Number(m[0])
    }
    const w = /^[a-zA-Z'"*]+/.exec(s.slice(this.i, this.i + 16))
    if (w) {
      this.i += w[0].length
      return w[0] === 'true' ? true : w[0] === 'false' ? false : w[0] === 'null' ? null : new Name('@' + w[0])
    }
    this.i++
    return null
  }
  literal(): string {
    const s = this.s
    let depth = 0
    let out = ''
    this.i++
    while (this.i < s.length) {
      const c = s[this.i++]
      if (c === '\\') {
        const n = s[this.i++]
        if (n === 'n') out += '\n'
        else if (n === 'r') out += '\r'
        else if (n === 't') out += '\t'
        else if (n === 'b') out += '\b'
        else if (n === 'f') out += '\f'
        else if (n === '\r') {
          if (s[this.i] === '\n') this.i++
        } else if (n === '\n') {
          /* continuation de ligne */
        } else if (/[0-7]/.test(n)) {
          let oct = n
          while (oct.length < 3 && /[0-7]/.test(s[this.i])) oct += s[this.i++]
          out += String.fromCharCode(parseInt(oct, 8) & 255)
        } else out += n
      } else if (c === '(') {
        depth++
        out += c
      } else if (c === ')') {
        if (depth === 0) break
        depth--
        out += c
      } else out += c
    }
    return out
  }
}

// ---------- Document ----------

class PdfDoc {
  objs = new Map<number, Obj>()
  s: string
  constructor(public buf: Buffer) {
    this.s = buf.toString('latin1')
    this.scan()
  }

  private scan() {
    const re = /(\d+)\s+(\d+)\s+obj\b/g
    let m: RegExpExecArray | null
    while ((m = re.exec(this.s))) {
      const num = Number(m[1])
      const lx = new Lexer(this.s, m.index + m[0].length)
      let v: Val
      try {
        v = lx.value()
      } catch {
        continue
      }
      const o: Obj = { v }
      lx.ws()
      if (this.s.startsWith('stream', lx.i)) {
        let start = lx.i + 6
        if (this.s[start] === '\r') start++
        if (this.s[start] === '\n') start++
        let len = isDict(v) ? v.Length : undefined
        if (isRef(len)) len = undefined // longueur indirecte : on cherchera « endstream »
        let end = typeof len === 'number' && this.s.startsWith('endstream', this.skipWs(start + len)) ? start + len : this.s.indexOf('endstream', start)
        if (end < 0) end = this.s.length
        o.stream = this.buf.subarray(start, end)
        re.lastIndex = end
      }
      this.objs.set(num, o)
    }
    // Flux d'objets (PDF 1.5+) : objets compressés regroupés.
    for (const [, o] of [...this.objs]) {
      if (!isDict(o.v) || nameOf(o.v.Type) !== 'ObjStm' || !o.stream) continue
      const data = this.decode(o)
      if (!data) continue
      const txt = data.toString('latin1')
      const n = Number(o.v.N) || 0
      const first = Number(o.v.First) || 0
      const head = txt.slice(0, first).trim().split(/\s+/).map(Number)
      for (let k = 0; k < n; k++) {
        const num = head[k * 2]
        const off = head[k * 2 + 1]
        if (this.objs.has(num)) continue
        try {
          this.objs.set(num, { v: new Lexer(txt, first + off).value() })
        } catch {
          /* objet illisible */
        }
      }
    }
  }

  private skipWs(i: number) {
    while (/\s/.test(this.s[i] ?? '')) i++
    return i
  }

  get(v: Val | undefined): Val | undefined {
    let x = v
    for (let k = 0; k < 8 && isRef(x); k++) x = this.objs.get(x.ref)?.v
    return x
  }
  obj(v: Val | undefined): Obj | undefined {
    return isRef(v) ? this.objs.get(v.ref) : undefined
  }

  /** Décompresse un flux (FlateDecode, ASCIIHex) ; null si filtre non géré. */
  decode(o: Obj): Buffer | null {
    if (!o.stream) return null
    const d = isDict(o.v) ? o.v : {}
    const f = this.get(d.Filter)
    const filters = (Array.isArray(f) ? f : f ? [f] : []).map(nameOf)
    let data: Buffer = o.stream
    for (const name of filters) {
      if (name === 'FlateDecode' || name === 'Fl') {
        try {
          data = inflateSync(data)
        } catch {
          try {
            data = inflateSync(data, { finishFlush: 2 })
          } catch {
            return null
          }
        }
      } else if (name === 'ASCIIHexDecode' || name === 'AHx') {
        data = Buffer.from(data.toString('latin1').replace(/[^0-9a-f]/gi, ''), 'hex')
      } else return null
    }
    return data
  }

  root(): Dict | undefined {
    const t = this.s.lastIndexOf('trailer')
    let rootRef: Val | undefined
    if (t >= 0) {
      const d = new Lexer(this.s, t + 7).value()
      if (isDict(d)) rootRef = d.Root
    }
    if (!rootRef) for (const [, o] of this.objs) if (isDict(o.v) && o.v.Root) rootRef = o.v.Root
    if (!rootRef) for (const [, o] of this.objs) if (isDict(o.v) && nameOf(o.v.Type) === 'Catalog') return o.v
    const r = this.get(rootRef)
    return isDict(r) ? r : undefined
  }

  pages(): Dict[] {
    const out: Dict[] = []
    const walk = (node: Val | undefined, depth = 0) => {
      const n = this.get(node)
      if (!isDict(n) || depth > 30) return
      const t = nameOf(n.Type)
      if (t === 'Page' || (!t && n.Contents)) out.push(n)
      else if (Array.isArray(this.get(n.Kids))) for (const k of this.get(n.Kids) as Val[]) walk(k, depth + 1)
    }
    walk(this.root()?.Pages)
    if (!out.length) for (const [, o] of this.objs) if (isDict(o.v) && nameOf(o.v.Type) === 'Page') out.push(o.v)
    return out
  }

  info(): Dict {
    const t = this.s.lastIndexOf('trailer')
    if (t >= 0) {
      const d = new Lexer(this.s, t + 7).value()
      if (isDict(d)) {
        const i = this.get(d.Info)
        if (isDict(i)) return i
      }
    }
    for (const [, o] of this.objs) if (isDict(o.v) && isDict(this.get(o.v.Info))) return this.get(o.v.Info) as Dict
    return {}
  }
}

// ---------- Polices : octets → Unicode ----------

const WIN_ANSI: Record<number, string> = {
  128: '€', 130: '‚', 131: 'ƒ', 132: '„', 133: '…', 134: '†', 135: '‡', 136: 'ˆ', 137: '‰', 138: 'Š', 139: '‹', 140: 'Œ', 142: 'Ž',
  145: '‘', 146: '’', 147: '“', 148: '”', 149: '•', 150: '–', 151: '—', 152: '˜', 153: '™', 154: 'š', 155: '›', 156: 'œ', 158: 'ž', 159: 'Ÿ'
}
const GLYPHS: Record<string, string> = {
  space: ' ', exclam: '!', quotedbl: '"', numbersign: '#', dollar: '$', percent: '%', ampersand: '&', quotesingle: "'", quoteright: '’', quoteleft: '‘',
  parenleft: '(', parenright: ')', asterisk: '*', plus: '+', comma: ',', hyphen: '-', period: '.', slash: '/', colon: ':', semicolon: ';', less: '<',
  equal: '=', greater: '>', question: '?', at: '@', bracketleft: '[', backslash: '\\', bracketright: ']', underscore: '_', bullet: '•', endash: '–',
  emdash: '—', ellipsis: '…', quotedblleft: '“', quotedblright: '”', guillemotleft: '«', guillemotright: '»', eacute: 'é', egrave: 'è', ecircumflex: 'ê',
  edieresis: 'ë', agrave: 'à', acircumflex: 'â', ccedilla: 'ç', icircumflex: 'î', idieresis: 'ï', ocircumflex: 'ô', ugrave: 'ù', ucircumflex: 'û',
  udieresis: 'ü', Eacute: 'É', Egrave: 'È', Agrave: 'À', Ccedilla: 'Ç', oe: 'œ', OE: 'Œ', degree: '°', fi: 'fi', fl: 'fl', zero: '0', one: '1', two: '2',
  three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', euro: '€', copyright: '©', registered: '®', trademark: '™'
}
const glyphToChar = (g: string) => GLYPHS[g] ?? (/^[A-Za-z]$/.test(g) ? g : /^uni([0-9A-F]{4})$/i.test(g) ? String.fromCharCode(parseInt(g.slice(3), 16)) : '')

const utf16 = (s: string) => {
  let out = ''
  for (let k = 0; k + 1 < s.length; k += 2) out += String.fromCharCode((s.charCodeAt(k) << 8) | s.charCodeAt(k + 1))
  return out
}

interface Font {
  bytes: 1 | 2
  map: Map<number, string> | null
  enc: Record<number, string>
  widths: (code: number) => number
  /** Unité des largeurs : 1/1000 em, ou la matrice de la police pour le Type 3. */
  unit: number
  bold: boolean
  name: string
}

function parseCMap(txt: string): { map: Map<number, string>; bytes: 1 | 2 } {
  const map = new Map<number, string>()
  let bytes: 1 | 2 = 1
  const cs = /begincodespacerange\s*<([0-9a-f]+)>/i.exec(txt)
  if (cs && cs[1].length >= 4) bytes = 2
  const hex = (h: string) => {
    let s = ''
    for (let k = 0; k < h.length; k += 2) s += String.fromCharCode(parseInt(h.slice(k, k + 2), 16))
    return s
  }
  for (const block of txt.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const m of block[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]*)>/gi)) {
      if (m[1].length >= 4) bytes = 2
      map.set(parseInt(m[1], 16), utf16(hex(m[2])))
    }
  for (const block of txt.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*(<[0-9a-f]*>|\[[^\]]*\])/gi)) {
      if (m[1].length >= 4) bytes = 2
      const lo = parseInt(m[1], 16)
      const hi = parseInt(m[2], 16)
      if (m[3].startsWith('[')) {
        const items = [...m[3].matchAll(/<([0-9a-f]*)>/gi)].map((x) => utf16(hex(x[1])))
        for (let c = lo; c <= hi && c - lo < items.length; c++) map.set(c, items[c - lo])
      } else {
        const base = utf16(hex(m[3].slice(1, -1)))
        for (let c = lo; c <= hi && c - lo < 65536; c++)
          map.set(c, base.slice(0, -1) + String.fromCharCode(base.charCodeAt(base.length - 1) + (c - lo)))
      }
    }
  }
  return { map, bytes }
}

function loadFont(doc: PdfDoc, ref: Val | undefined, cache: Map<Val, Font>): Font {
  const key = isRef(ref) ? ref.ref : ref
  if (key !== undefined && cache.has(key as Val)) return cache.get(key as Val)!
  const f = doc.get(ref)
  const d = isDict(f) ? f : {}
  const sub = nameOf(d.Subtype)
  const base = nameOf(d.BaseFont)
  const font: Font = { bytes: sub === 'Type0' ? 2 : 1, map: null, enc: {}, widths: () => 500, unit: 0.001, bold: /bold|black|heavy|semibold|demi/i.test(base), name: base }
  if (sub === 'Type3') {
    const fm = doc.get(d.FontMatrix)
    if (Array.isArray(fm)) font.unit = Math.abs(Number(doc.get(fm[0]))) || 0.001
  }
  const tu = doc.obj(d.ToUnicode)
  if (tu) {
    const data = doc.decode(tu)
    if (data) {
      const cm = parseCMap(data.toString('latin1'))
      font.map = cm.map
      if (sub !== 'Type0') font.bytes = 1
      else font.bytes = 2
    }
  }
  // Encodage des polices simples.
  if (sub !== 'Type0') {
    const e = doc.get(d.Encoding)
    const diffs = isDict(e) ? (doc.get(e.Differences) as Val[] | undefined) : undefined
    if (Array.isArray(diffs)) {
      let code = 0
      for (const x of diffs) {
        if (typeof x === 'number') code = x
        else if (x instanceof Name) font.enc[code++] = glyphToChar(x.n)
      }
    }
    const first = Number(d.FirstChar) || 0
    const ws = doc.get(d.Widths)
    if (Array.isArray(ws)) font.widths = (c) => Number(doc.get(ws[c - first])) || 500
  } else {
    const desc = doc.get(d.DescendantFonts)
    const cid = doc.get(Array.isArray(desc) ? desc[0] : undefined)
    if (isDict(cid)) {
      const dw = Number(cid.DW) || 1000
      const w = doc.get(cid.W)
      const table = new Map<number, number>()
      if (Array.isArray(w))
        for (let k = 0; k < w.length; ) {
          const c = Number(doc.get(w[k]))
          const next = doc.get(w[k + 1])
          if (Array.isArray(next)) {
            next.forEach((x, j) => table.set(c + j, Number(doc.get(x)) || dw))
            k += 2
          } else {
            const last = Number(next)
            const val = Number(doc.get(w[k + 2])) || dw
            for (let j = c; j <= last && j - c < 65536; j++) table.set(j, val)
            k += 3
          }
        }
      font.widths = (c) => table.get(c) ?? dw
    }
  }
  if (key !== undefined) cache.set(key as Val, font)
  return font
}

function decodeText(font: Font, raw: string): { text: string; codes: number[]; unknown: number } {
  const codes: number[] = []
  if (font.bytes === 2) for (let k = 0; k + 1 < raw.length; k += 2) codes.push((raw.charCodeAt(k) << 8) | raw.charCodeAt(k + 1))
  else for (let k = 0; k < raw.length; k++) codes.push(raw.charCodeAt(k))
  let text = ''
  let unknown = 0
  for (const c of codes) {
    let ch = font.map?.get(c)
    if (ch === undefined) {
      if (font.bytes === 2) {
        ch = '�'
        unknown++
      } else ch = font.enc[c] ?? WIN_ANSI[c] ?? (c >= 32 && c !== 127 ? String.fromCharCode(c) : '')
    }
    text += ch
  }
  return { text, codes, unknown }
}

// ---------- Interprétation des flux de contenu ----------

type M = [number, number, number, number, number, number]
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[1] * b[2],
  a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2],
  a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4],
  a[4] * b[1] + a[5] * b[3] + b[5]
]

interface Run {
  text: string
  x: number
  y: number
  end: number
  size: number
  bold: boolean
  order: number
}

function runContent(doc: PdfDoc, data: string, resources: Dict, base: M, runs: Run[], stats: { unknown: number; glyphs: number; images: number }, fonts: Map<Val, Font>, depth = 0) {
  if (depth > 6) return
  const lx = new Lexer(data)
  const stack: Val[] = []
  let ctm: M = base
  const saved: M[] = []
  let tm: M = [1, 0, 0, 1, 0, 0]
  let tlm: M = [1, 0, 0, 1, 0, 0]
  let font: Font | null = null
  let size = 10
  let tc = 0
  let tw = 0
  let th = 1
  let tl = 0
  let rise = 0
  const resFonts = doc.get(resources.Font)
  const resX = doc.get(resources.XObject)
  const show = (raw: string) => {
    if (!font) return
    const { text, codes, unknown } = decodeText(font, raw)
    stats.unknown += unknown
    stats.glyphs += codes.length
    const m = mul([size * th, 0, 0, size, 0, rise], mul(tm, ctm))
    const x = m[4]
    const y = m[5]
    let adv = 0
    for (let k = 0; k < codes.length; k++) {
      adv += (font.widths(codes[k]) * font.unit * size + tc + (text[k] === ' ' && font.bytes === 1 ? tw : 0)) * th
    }
    tm = mul([1, 0, 0, 1, adv, 0], tm)
    const fx = mul(tm, ctm)[4]
    runs.push({ text, x, y, end: fx, size: Math.hypot(m[2], m[3]) || size, bold: font.bold, order: runs.length })
  }
  for (;;) {
    lx.ws()
    if (lx.i >= data.length) break
    const before = lx.i
    // Images en ligne : on saute les données binaires.
    if (data.startsWith('BI', lx.i) && /\s/.test(data[lx.i + 2] ?? ' ')) {
      const e = data.indexOf('EI', lx.i)
      lx.i = e < 0 ? data.length : e + 2
      stats.images++
      continue
    }
    const v = lx.value()
    if (lx.i === before) {
      lx.i++
      continue
    }
    if (!(v instanceof Name) || !v.n.startsWith('@')) {
      stack.push(v)
      continue
    }
    const op = v.n.slice(1)
    const num = (k: number) => Number(stack[stack.length - k]) || 0
    switch (op) {
      case 'q':
        saved.push(ctm)
        break
      case 'Q':
        ctm = saved.pop() ?? ctm
        break
      case 'cm':
        ctm = mul([num(6), num(5), num(4), num(3), num(2), num(1)], ctm)
        break
      case 'BT':
        tm = [1, 0, 0, 1, 0, 0]
        tlm = [1, 0, 0, 1, 0, 0]
        break
      case 'Tf': {
        const fname = stack[stack.length - 2]
        size = num(1)
        font = isDict(resFonts) && fname instanceof Name ? loadFont(doc, resFonts[fname.n], fonts) : null
        break
      }
      case 'Tc':
        tc = num(1)
        break
      case 'Tw':
        tw = num(1)
        break
      case 'Tz':
        th = num(1) / 100
        break
      case 'TL':
        tl = num(1)
        break
      case 'Ts':
        rise = num(1)
        break
      case 'Td':
        tlm = mul([1, 0, 0, 1, num(2), num(1)], tlm)
        tm = tlm
        break
      case 'TD':
        tl = -num(1)
        tlm = mul([1, 0, 0, 1, num(2), num(1)], tlm)
        tm = tlm
        break
      case 'Tm':
        tlm = [num(6), num(5), num(4), num(3), num(2), num(1)]
        tm = tlm
        break
      case 'T*':
        tlm = mul([1, 0, 0, 1, 0, -tl], tlm)
        tm = tlm
        break
      case 'Tj': {
        const s = stack[stack.length - 1]
        if (s instanceof Str) show(s.b)
        break
      }
      case "'":
      case '"': {
        tlm = mul([1, 0, 0, 1, 0, -tl], tlm)
        tm = tlm
        const s = stack[stack.length - 1]
        if (s instanceof Str) show(s.b)
        break
      }
      case 'TJ': {
        const arr = stack[stack.length - 1]
        if (Array.isArray(arr))
          for (const it of arr) {
            if (it instanceof Str) show(it.b)
            else if (typeof it === 'number') {
              const shift = (-it / 1000) * size * th
              tm = mul([1, 0, 0, 1, shift, 0], tm)
              // Un grand espacement négatif équivaut à une espace.
              if (it < -180 && runs.length) runs[runs.length - 1].text += ' '
            }
          }
        break
      }
      case 'Do': {
        const n = stack[stack.length - 1]
        const xo = isDict(resX) && n instanceof Name ? doc.obj(resX[n.n]) : undefined
        if (xo && isDict(xo.v)) {
          const st = nameOf(xo.v.Subtype)
          if (st === 'Image') stats.images++
          else if (st === 'Form') {
            const inner = doc.decode(xo)
            const mtx = doc.get(xo.v.Matrix)
            const fm: M = Array.isArray(mtx) && mtx.length === 6 ? (mtx.map((x) => Number(x)) as M) : [1, 0, 0, 1, 0, 0]
            const res = doc.get(xo.v.Resources)
            if (inner) runContent(doc, inner.toString('latin1'), isDict(res) ? res : resources, mul(fm, ctm), runs, stats, fonts, depth + 1)
          }
        }
        break
      }
    }
    stack.length = 0
  }
}

// ---------- Lignes, colonnes, ordre de lecture ----------

function buildLines(runs: Run[], height: number): PdfLine[] {
  const items = runs.filter((r) => r.text.trim()).map((r) => ({ ...r, top: height - r.y }))
  items.sort((a, b) => a.top - b.top || a.x - b.x)
  const lines: { top: number; size: number; runs: typeof items }[] = []
  for (const it of items) {
    const tol = Math.max(2, it.size * 0.45)
    const line = lines.find((l) => Math.abs(l.top - it.top) <= tol && l.runs.every((r) => it.x >= r.end - 1 || it.end <= r.x + 1 || Math.abs(it.x - r.x) > 2))
    if (line) line.runs.push(it)
    else lines.push({ top: it.top, size: it.size, runs: [it] })
  }
  const out: PdfLine[] = []
  for (const l of lines) {
    l.runs.sort((a, b) => a.x - b.x)
    // Grands écarts horizontaux : morceaux distincts (colonnes) sur la même ligne.
    let seg: typeof l.runs = []
    const flush = () => {
      if (!seg.length) return
      // Seuil d'espace adaptatif : quand le texte est posé lettre par lettre, l'écart habituel
      // entre lettres (approche serrée ou capitales espacées) sert de référence.
      const gaps = seg.slice(1).map((r, k) => (r.x - seg[k].end) / (r.size || 1))
      const perGlyph = seg.filter((r) => r.text.trim().length <= 1).length / seg.length > 0.6
      const sorted = [...gaps].sort((x, y) => x - y)
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
      const limit = perGlyph ? Math.max(median + 0.11, 0.07) : 0.15
      let text = ''
      for (let k = 0; k < seg.length; k++) {
        const r = seg[k]
        if (k > 0 && gaps[k - 1] > limit && !text.endsWith(' ') && !r.text.startsWith(' ')) text += ' '
        text += r.text
      }
      out.push({
        text: text.replace(/\s+/g, ' ').trim(),
        x: Math.round(seg[0].x),
        y: Math.round(l.top),
        w: Math.round(seg[seg.length - 1].end - seg[0].x),
        size: Math.round(Math.max(...seg.map((r) => r.size)) * 10) / 10,
        bold: seg.some((r) => r.bold),
        order: Math.min(...seg.map((r) => r.order))
      })
      seg = []
    }
    for (const r of l.runs) {
      const prev = seg[seg.length - 1]
      if (prev && r.x - prev.end > Math.max(28, r.size * 2.6)) flush()
      seg.push(r)
    }
    flush()
  }
  return out.filter((l) => l.text)
}

/** Détecte une mise en page en colonnes : une gouttière verticale que presque aucune ligne ne traverse. */
function detectColumns(lines: PdfLine[], width: number): number | null {
  if (lines.length < 12) return null
  const body = lines.filter((l) => l.y > Math.min(...lines.map((x) => x.y)) + 60)
  if (body.length < 10) return null
  const step = width / 100
  let best: { x: number; score: number } | null = null
  for (let k = 20; k <= 80; k++) {
    const gx = k * step
    const crossing = body.filter((l) => l.x < gx - 2 && l.x + l.w > gx + 2).length
    const left = body.filter((l) => l.x + l.w <= gx).length
    const right = body.filter((l) => l.x >= gx).length
    if (left >= 4 && right >= 4 && crossing / body.length < 0.04) {
      const score = Math.min(left, right)
      if (!best || score > best.score) best = { x: gx, score }
    }
  }
  return best ? Math.round(best.x) : null
}

export function extractPdf(buf: Buffer): PdfExtraction {
  const head = buf.subarray(0, 1024).toString('latin1')
  if (!head.includes('%PDF')) throw new Error('Ce fichier n’est pas un PDF valide.')
  const doc = new PdfDoc(buf)
  const encrypted = /\/Encrypt\s/.test(doc.s.slice(-4096)) || [...doc.objs.values()].some((o) => isDict(o.v) && o.v.Encrypt !== undefined)
  const info = doc.info()
  const str = (v: Val | undefined) => {
    const x = doc.get(v)
    if (!(x instanceof Str)) return ''
    return x.b.startsWith('þÿ') ? utf16(x.b.slice(2)) : x.b
  }
  const fonts = new Map<Val, Font>()
  const pages = doc.pages().map((p) => {
    const inherit = (k: string): Val | undefined => {
      let n: Val | undefined = p
      for (let d = 0; d < 20 && isDict(n); d++) {
        if (n[k] !== undefined) return n[k]
        n = doc.get(n.Parent)
      }
      return undefined
    }
    const mb = doc.get(inherit('MediaBox'))
    const box = Array.isArray(mb) ? mb.map((x) => Number(doc.get(x)) || 0) : [0, 0, 595, 842]
    const width = box[2] - box[0]
    const height = box[3] - box[1]
    const resources = doc.get(inherit('Resources'))
    const contents = doc.get(p.Contents)
    const parts = (Array.isArray(contents) ? contents : [p.Contents]).map((c) => doc.obj(c)).filter(Boolean) as Obj[]
    const data = parts.map((o) => doc.decode(o)?.toString('latin1') ?? '').join('\n')
    const runs: Run[] = []
    const stats = { unknown: 0, glyphs: 0, images: 0 }
    runContent(doc, data, isDict(resources) ? resources : {}, [1, 0, 0, 1, -box[0], -box[1]], runs, stats, fonts)
    const lines = buildLines(runs, height)
    const streamText = runs
      .map((r, k) => {
        const prev = runs[k - 1]
        if (!prev) return r.text
        if (Math.abs(r.y - prev.y) > r.size * 0.6) return '\n' + r.text
        return (r.x - prev.end > r.size * 0.15 && !prev.text.endsWith(' ') ? ' ' : '') + r.text
      })
      .join('')
      .replace(/[ \t]+/g, ' ')
    return { width: Math.round(width), height: Math.round(height), lines, columnAt: detectColumns(lines, width), streamText, unknownGlyphs: stats.unknown, glyphs: stats.glyphs, images: stats.images }
  })
  const fontList = [...fonts.values()]
  return {
    pages,
    encrypted,
    bytes: buf.length,
    title: str(info.Title),
    producer: str(info.Producer) || str(info.Creator),
    fonts: [...new Set(fontList.map((f) => f.name.replace(/^[A-Z]{6}\+/, '')).filter(Boolean))],
    fontsWithoutUnicode: fontList.filter((f) => f.bytes === 2 && !f.map).length
  }
}
