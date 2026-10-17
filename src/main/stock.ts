// Photos libres de droits : recherche dans Openverse (images sous CC0 ou dans le domaine public
// uniquement, donc utilisables sans attribution). L'interface ne charge aucune image distante :
// les miniatures et les photos passent par ce module et arrivent en data URL.
import { nativeImage } from 'electron'
import type { StockImage, StockPage } from '../shared/types'

const API = 'https://api.openverse.org/v1/images/'
// En-tête en ASCII strict : un caractère accentué ou typographique fait échouer la requête.
const HEADERS = { 'User-Agent': 'CV-GEN/1.0 (desktop app; public domain image search)' }
const MAX_BYTES = 15 * 1024 * 1024

async function toDataUrl(url: string, maxBytes = MAX_BYTES): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!/^image\/(jpeg|png|webp|gif)/.test(type)) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > maxBytes) return null
    return `data:${type.split(';')[0]};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

interface OvResult {
  id: string
  title?: string
  creator?: string
  license: string
  license_version?: string
  provider?: string
  source?: string
  url: string
  thumbnail?: string
  foreign_landing_url?: string
  width?: number
  height?: number
}

export async function searchStock(query: string, page = 1, orientation: 'wide' | 'any' = 'any'): Promise<StockPage> {
  const q = query.trim()
  if (!q) return { items: [], page: 1, pages: 0, total: 0 }
  const params = new URLSearchParams({ q, license: 'cc0,pdm', page: String(page), page_size: '20', mature: 'false' })
  if (orientation === 'wide') params.set('aspect_ratio', 'wide')
  let json: { results?: OvResult[]; page_count?: number; result_count?: number }
  try {
    const res = await fetch(`${API}?${params}`, { headers: HEADERS })
    if (res.status === 429) throw new Error('Trop de recherches d’affilée : patientez une minute puis réessayez.')
    if (!res.ok) throw new Error(`La banque de photos ne répond pas (${res.status}).`)
    json = await res.json()
  } catch (e) {
    if (e instanceof Error && /patientez|répond/.test(e.message)) throw e
    throw new Error('Impossible de joindre la banque de photos. Vérifiez votre connexion Internet.')
  }
  const results = (json.results ?? []).filter((r) => r.license === 'cc0' || r.license === 'pdm')
  // Miniatures prises chez l'hébergeur de la photo (pas via l'API, dont le quota est limité),
  // par lots de 6, puis réduites localement.
  const items: (StockImage | null)[] = []
  for (let i = 0; i < results.length; i += 6) {
    const batch = await Promise.all(results.slice(i, i + 6).map((r) => toItem(r)))
    items.push(...batch)
  }
  return { items: items.filter(Boolean) as StockImage[], page, pages: json.page_count ?? 1, total: json.result_count ?? 0 }
}

/** Version plus légère d'une URL connue (Flickr propose plusieurs tailles). */
function lighter(url: string): string {
  // Wikimedia : service de miniatures officiel plutôt que l'original (souvent plusieurs Mo).
  const wm = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/.exec(url)
  if (wm && !/\.(svg|tiff?)$/i.test(wm[4])) return `${wm[1]}/thumb/${wm[2]}/${wm[3]}/${wm[4]}/640px-${wm[4]}`
  return url.replace(/_(b|h|k|o)\.jpg$/, '_z.jpg')
}

/** Miniature JPEG ~480 px à partir de la photo d'origine. */
async function thumbOf(url: string): Promise<string | null> {
  try {
    const res = await fetch(lighter(url), { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(8000) })
    if (!res.ok || !/^image\//.test(res.headers.get('content-type') ?? '')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 8 * 1024 * 1024) return null
    const img = nativeImage.createFromBuffer(buf)
    if (img.isEmpty()) return null
    const { width } = img.getSize()
    const small = width > 480 ? img.resize({ width: 480, quality: 'good' }) : img
    return 'data:image/jpeg;base64,' + small.toJPEG(78).toString('base64')
  } catch {
    return null
  }
}

async function toItem(r: OvResult): Promise<StockImage | null> {
  const thumb = await thumbOf(r.url)
  if (!thumb) return null
  return {
    id: r.id,
    title: r.title ?? '',
    creator: r.creator ?? '',
    license: r.license === 'cc0' ? 'CC0' : 'Domaine public',
    provider: r.provider ?? r.source ?? '',
    landing: r.foreign_landing_url ?? '',
    url: r.url,
    thumbUrl: r.thumbnail ?? '',
    width: r.width ?? 0,
    height: r.height ?? 0,
    thumb
  }
}

/** Photo en taille réelle (repli sur la miniature haute définition si l'original est indisponible). */
export async function getStockImage(url: string, fallback?: string): Promise<string> {
  const img = (await toDataUrl(url)) ?? (fallback ? await toDataUrl(fallback) : null)
  if (!img) throw new Error('Cette photo n’est plus disponible chez son hébergeur. Choisissez-en une autre.')
  return img
}
