// Logos d'entreprise pour le suivi des candidatures : icône lue sur le site de l'entreprise
// (apple-touch-icon, icônes déclarées dans la page, puis /favicon.ico), sans service tiers.
// Le résultat est gardé en cache dans userData/logos (30 jours ; échec retenu 3 jours).
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CV-GEN/1.0 (logo d entreprise)', Accept: 'text/html,image/*;q=0.9,*/*;q=0.5' }
const MAX_BYTES = 400 * 1024
const OK_DAYS = 30
const FAIL_DAYS = 3

interface Entry {
  at: number
  data: string | null
}

const memory = new Map<string, Entry>()
const pending = new Map<string, Promise<string | null>>()

const dir = () => {
  const d = join(app.getPath('userData'), 'logos')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}
const fileOf = (domain: string) => join(dir(), domain.replace(/[^a-z0-9.-]/g, '_') + '.json')

function cached(domain: string): Entry | undefined {
  const m = memory.get(domain)
  if (m) return m
  try {
    const e = JSON.parse(readFileSync(fileOf(domain), 'utf8')) as Entry
    memory.set(domain, e)
    return e
  } catch {
    return undefined
  }
}

function fresh(e: Entry) {
  return Date.now() - e.at < (e.data ? OK_DAYS : FAIL_DAYS) * 86400000
}

async function get(url: string, timeout = 6000) {
  return fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(timeout) })
}

/** Type d'image d'après le contenu (certains serveurs annoncent un mauvais Content-Type). */
function sniff(buf: Buffer, header: string): string | null {
  if (buf.length < 8) return null
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg'
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return 'image/x-icon'
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif'
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  const head = buf.subarray(0, 300).toString('utf8').trimStart().toLowerCase()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml'
  if (/^image\/(png|jpeg|gif|webp|x-icon|vnd\.microsoft\.icon|svg\+xml)/.test(header)) return header.split(';')[0]
  return null
}

async function image(url: string): Promise<string | null> {
  try {
    const res = await get(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length || buf.length > MAX_BYTES) return null
    const type = sniff(buf, res.headers.get('content-type') ?? '')
    if (!type) return null
    // SVG : on retire scripts et liens externes avant de l'afficher.
    if (type === 'image/svg+xml') {
      const svg = buf.toString('utf8').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '')
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    }
    return `data:${type};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/** Icônes déclarées dans la page d'accueil, de la plus grande à la plus petite. */
function iconLinks(html: string, base: string): string[] {
  const out: { href: string; score: number }[] = []
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0]
    const rel = /\brel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1]?.toLowerCase() ?? ''
    if (!/\bicon\b|apple-touch-icon/.test(rel) || /mask-icon/.test(rel)) continue
    const href = /\bhref\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1]
    if (!href) continue
    const size = Number(/\bsizes\s*=\s*["']?(\d+)/i.exec(tag)?.[1] ?? 0)
    const score = (rel.includes('apple-touch-icon') ? 180 : size || 32) + (/\.svg(\?|$)/i.test(href) ? 40 : 0)
    try {
      out.push({ href: new URL(href.replace(/&amp;/g, '&'), base).toString(), score })
    } catch {
      /* lien invalide */
    }
  }
  return out.sort((a, b) => b.score - a.score).map((x) => x.href)
}

async function fetchLogo(domain: string): Promise<string | null> {
  for (const origin of [`https://${domain}`, `https://www.${domain}`]) {
    let base = origin + '/'
    let links: string[] = []
    try {
      const res = await get(base, 7000)
      if (res.ok) {
        base = res.url || base
        const html = (await res.text()).slice(0, 400_000)
        links = iconLinks(html, base)
      }
    } catch {
      /* site injoignable : on tente quand même /favicon.ico */
    }
    for (const href of [...links.slice(0, 4), new URL('/apple-touch-icon.png', base).toString(), new URL('/favicon.ico', base).toString()]) {
      const img = await image(href)
      if (img) return img
    }
  }
  return null
}

/** Logo d'un domaine (data URL), ou null s'il est introuvable. */
export async function getLogo(rawDomain: string): Promise<string | null> {
  const domain = rawDomain.toLowerCase().replace(/^www\./, '').trim()
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null
  const c = cached(domain)
  if (c && fresh(c)) return c.data
  const running = pending.get(domain)
  if (running) return running
  const job = fetchLogo(domain)
    .catch(() => null)
    .then((data) => {
      const e = { at: Date.now(), data }
      memory.set(domain, e)
      try {
        writeFileSync(fileOf(domain), JSON.stringify(e))
      } catch {
        /* cache non écrit : sans conséquence */
      }
      pending.delete(domain)
      // Pas de réseau : on garde l'ancien logo plutôt que rien.
      return data ?? c?.data ?? null
    })
  pending.set(domain, job)
  return job
}
