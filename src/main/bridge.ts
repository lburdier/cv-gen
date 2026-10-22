import { app, type BrowserWindow } from 'electron'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { join } from 'path'
import type { BridgeDelivery, BridgeStatus, IncomingOffer } from '../shared/types'
import { loadData, logError } from './storage'

/**
 * Pont local avec l'extension navigateur « CV GEN · Offres » : un petit serveur HTTP sur 127.0.0.1
 * reçoit les offres trouvées sur LinkedIn (ou toute page d'annonce) et les transmet à l'interface.
 * Seules les extensions (origine chrome-extension:// ou moz-extension://) et les appels sans origine
 * (outils locaux) sont acceptés : un site web ne peut pas y déposer d'offre.
 */

/** Ports essayés dans l'ordre (l'extension les teste dans le même ordre). */
export const BRIDGE_PORTS = [47615, 47616, 47617]
const MAX_BODY = 2 * 1024 * 1024
const MAX_TEXT = 60_000
const MAX_OFFERS = 50

let server: Server | null = null
let port: number | undefined
let lastError: string | undefined
let getWindow: () => BrowserWindow | null = () => null
const queue: BridgeDelivery[] = []

export function extensionDir() {
  return app.isPackaged ? join(process.resourcesPath, 'extension') : join(app.getAppPath(), 'extension')
}

export function bridgeStatus(): BridgeStatus {
  return { running: Boolean(server && port), port, error: lastError, extensionDir: extensionDir() }
}

/** Offres reçues avant que l'interface ne s'abonne. */
export function takePending(): BridgeDelivery[] {
  return queue.splice(0)
}

function allowedOrigin(origin: string | undefined) {
  return !origin || /^(chrome|moz)-extension:\/\/[\w-]+$/.test(origin)
}

function send(res: ServerResponse, code: number, body: unknown, origin?: string) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {})
  })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('Requête trop lourde'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '')

/** Nettoie une offre reçue : champs texte bornés, URL http(s) uniquement. */
export function cleanOffer(raw: unknown): IncomingOffer | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const text = str(o.text, MAX_TEXT)
  const title = str(o.title, 200)
  if (!text && !title) return null
  const url = str(o.url, 2000)
  const criteria: Record<string, string> = {}
  if (o.criteria && typeof o.criteria === 'object') {
    for (const [k, v] of Object.entries(o.criteria as Record<string, unknown>).slice(0, 12)) {
      const key = str(k, 60)
      const val = str(v, 200)
      if (key && val) criteria[key] = val
    }
  }
  return {
    title,
    company: str(o.company, 200),
    location: str(o.location, 200) || undefined,
    url: /^https?:\/\//i.test(url) ? url : undefined,
    text,
    source: str(o.source, 30).toLowerCase() || 'web',
    ...(Object.keys(criteria).length ? { criteria } : {})
  }
}

function deliver(d: BridgeDelivery) {
  const win = getWindow()
  if (win && !win.isDestroyed() && !win.webContents.isLoading()) {
    win.webContents.send('bridge:offers', d)
    if (d.apply) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  } else queue.push(d)
}

/** Pistes de recherche pour l'extension : titre et ville du profil (ou du CV le plus récent). */
function suggestions() {
  try {
    const data = loadData()
    const latest = [...data.resumes].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    const b = (data.profile?.basics.headline ? data.profile : latest)?.basics
    const imported = data.offers.map((o) => o.url).filter((u): u is string => Boolean(u))
    return { keywords: b?.headline ?? '', location: (b?.location ?? '').split(',')[0].trim(), imported }
  } catch {
    return { keywords: '', location: '', imported: [] as string[] }
  }
}

async function onRequest(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin
  if (!allowedOrigin(origin)) return send(res, 403, { ok: false, error: 'Origine refusée' })
  const path = (req.url ?? '').split('?')[0]

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '600'
    })
    return res.end()
  }
  if (req.method === 'GET' && path === '/cvgen/ping') return send(res, 200, { ok: true, app: 'CV GEN', version: app.getVersion() }, origin)
  if (req.method === 'GET' && path === '/cvgen/suggest') return send(res, 200, { ok: true, ...suggestions() }, origin)
  if (req.method === 'POST' && path === '/cvgen/offers') {
    if (!/application\/json/i.test(req.headers['content-type'] ?? '')) return send(res, 415, { ok: false, error: 'JSON attendu' }, origin)
    let body: { offers?: unknown[]; apply?: unknown }
    try {
      body = JSON.parse(await readBody(req))
    } catch (e) {
      return send(res, 400, { ok: false, error: (e as Error).message || 'JSON invalide' }, origin)
    }
    const offers = (Array.isArray(body.offers) ? body.offers : []).slice(0, MAX_OFFERS).map(cleanOffer).filter((o): o is IncomingOffer => Boolean(o))
    if (!offers.length) return send(res, 400, { ok: false, error: 'Aucune offre lisible' }, origin)
    deliver({ offers, apply: body.apply === true && offers.length === 1 })
    return send(res, 200, { ok: true, received: offers.length }, origin)
  }
  send(res, 404, { ok: false, error: 'Introuvable' }, origin)
}

function listen(p: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const s = createServer((req, res) => {
      onRequest(req, res).catch((e) => {
        logError('main', 'Pont extension : ' + (e as Error).message)
        if (!res.headersSent) send(res, 500, { ok: false, error: 'Erreur interne' })
      })
    })
    s.once('error', reject)
    s.listen(p, '127.0.0.1', () => {
      s.off('error', reject)
      resolve(s)
    })
  })
}

export async function startBridge(win: () => BrowserWindow | null) {
  getWindow = win
  if (server || process.env.CVGEN_BRIDGE === '0') return
  const ports = process.env.CVGEN_BRIDGE_PORT ? [Number(process.env.CVGEN_BRIDGE_PORT)] : BRIDGE_PORTS
  for (const p of ports) {
    try {
      server = await listen(p)
      port = p
      lastError = undefined
      return
    } catch (e) {
      lastError = (e as Error).message
    }
  }
  logError('main', 'Pont extension indisponible : ' + lastError)
}

export function stopBridge() {
  server?.close()
  server = null
  port = undefined
}
