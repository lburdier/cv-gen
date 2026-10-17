import { Loader2, Moon, Search, Shuffle, Sun } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { StockImage } from '../../../shared/types'
import { chooseImage } from '../lib/image'
import { ART_STYLES, artDataUrl, type ArtPalette } from '../lib/imageArt'
import { useStore } from '../store'
import { hsl } from '../templates/color'
import { Modal } from './ui'

/** Thèmes rapides (recherche en anglais : la banque est surtout indexée en anglais). */
const THEMES: [string, string][] = [
  ['Bureau', 'office workspace'],
  ['Architecture', 'architecture'],
  ['Ville', 'city skyline'],
  ['Nature', 'landscape nature'],
  ['Montagne', 'mountain'],
  ['Océan', 'ocean'],
  ['Technologie', 'technology'],
  ['Abstrait', 'abstract'],
  ['Textures', 'texture'],
  ['Design', 'design studio'],
  ['Lumière', 'light'],
  ['Espace', 'space stars']
]

/** Couleur secondaire par défaut : la couleur principale décalée sur le cercle chromatique. */
function companion(hex: string): string {
  const [h, s, l] = hsl(hex)
  const nh = (h + 48) % 360
  const ns = Math.max(0.45, s)
  const nl = Math.min(0.62, Math.max(0.42, l))
  const c = (1 - Math.abs(2 * nl - 1)) * ns
  const x = c * (1 - Math.abs(((nh / 60) % 2) - 1))
  const m = nl - c / 2
  const [r, g, b] = nh < 60 ? [c, x, 0] : nh < 120 ? [x, c, 0] : nh < 180 ? [0, c, x] : nh < 240 ? [0, x, c] : nh < 300 ? [x, 0, c] : [c, 0, x]
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')
}

export function paletteFor(accent: string, accent2?: string, dark = false): ArtPalette {
  const a = hsl(accent)[1] < 0.08 ? '#3B3B44' : accent // noir pur : un gris profond rend mieux
  return { a, b: accent2 || companion(a), dark }
}

/**
 * Banque d'images libres de droits :
 *  - visuels générés aux couleurs du CV (créations CV GEN, hors ligne) ;
 *  - photos CC0 / domaine public (Openverse), sans attribution obligatoire.
 */
export function ImageBankModal({
  kind,
  accent,
  accent2,
  onPick,
  onClose
}: {
  kind: 'banner' | 'gallery'
  accent: string
  accent2?: string
  onPick: (dataUrl: string, credit?: string) => void
  onClose: () => void
}) {
  const s = useStore()
  const [tab, setTab] = useState<'art' | 'photos'>('art')
  const [seed, setSeed] = useState(1)
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockImage[]>([])
  const [page, setPage] = useState({ n: 0, pages: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState<string | null>(null)
  const [error, setError] = useState('')
  const last = useRef('')
  const w = kind === 'banner' ? 1600 : 1400
  const h = kind === 'banner' ? 600 : 1050
  const pal = useMemo(() => paletteFor(accent, accent2, dark), [accent, accent2, dark])
  const arts = useMemo(() => ART_STYLES.map((st, i) => ({ ...st, url: artDataUrl(st.id, pal, seed * 13 + i, w, h) })), [pal, seed, w, h])

  const search = async (q: string, next = false) => {
    if (!q.trim()) return
    setError('')
    setLoading(true)
    last.current = q
    try {
      const n = next ? page.n + 1 : 1
      const res = await window.cvgen.stock.search(q, n, kind === 'banner' ? 'wide' : 'any')
      setResults((cur) => (next ? [...cur, ...res.items] : res.items))
      setPage({ n: res.page, pages: res.pages, total: res.total })
      if (!res.items.length && !next) setError('Aucune photo libre de droits pour cette recherche. Essayez un mot en anglais (ex. « office », « forest »).')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (tab === 'photos' && !results.length && !last.current) void search(kind === 'banner' ? 'abstract' : 'design studio')
  }, [tab])

  const pickPhoto = async (img: StockImage) => {
    setFetching(img.id)
    try {
      const data = await window.cvgen.stock.get(img.url, img.thumbUrl)
      // Data URL → fichier (sans fetch : la politique de sécurité de l'interface l'interdit pour data:).
      const [meta, b64] = data.split(',')
      const bin = atob(b64)
      const u8 = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
      const blob = new Blob([u8], { type: /data:([^;]+)/.exec(meta)?.[1] ?? 'image/jpeg' })
      const file = new File([blob], `${img.id}.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type })
      const out = await chooseImage(kind === 'banner' ? 1800 : 1400, file)
      if (out) {
        onPick(out, [img.title, img.creator && `par ${img.creator}`, `${img.license} via Openverse`].filter(Boolean).join(' · '))
        onClose()
      }
    } catch (e) {
      s.toast({ kind: 'error', title: 'Photo indisponible', detail: (e as Error).message })
    } finally {
      setFetching(null)
    }
  }

  return (
    <Modal
      size="xl"
      title={kind === 'banner' ? 'Banque d’images : bandeau' : 'Banque d’images : réalisation'}
      onClose={onClose}
      footer={
        <>
          <span className="muted" style={{ marginRight: 'auto', fontSize: 12.5 }}>
            {tab === 'art'
              ? 'Visuels créés par CV GEN à partir de vos couleurs : libres de droits, légers et nets à l’impression.'
              : 'Photos sous licence CC0 ou dans le domaine public (Openverse) : utilisation libre, sans attribution obligatoire.'}
          </span>
          <button className="btn btn-ink" onClick={onClose}>
            Fermer
          </button>
        </>
      }
    >
      <div className="imb">
        <div className="seg" style={{ width: 'fit-content' }}>
          <button className={tab === 'art' ? 'on' : ''} onClick={() => setTab('art')}>
            Visuels assortis
          </button>
          <button className={tab === 'photos' ? 'on' : ''} onClick={() => setTab('photos')}>
            Photos libres de droits
          </button>
        </div>

        {tab === 'art' ? (
          <>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="imb-pal">
                <i style={{ background: pal.a }} />
                <i style={{ background: pal.b }} />
                Couleurs de votre CV
              </span>
              <button className="btn btn-outline btn-sm" onClick={() => setSeed((x) => x + 1)}>
                <Shuffle size={14} /> Autres variantes
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDark((x) => !x)}>
                {dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? 'Fond clair' : 'Fond sombre'}
              </button>
            </div>
            <div className={`imb-grid ${kind}`}>
              {arts.map((a) => (
                <button
                  key={a.id + seed}
                  className="imb-cell"
                  onClick={() => {
                    onPick(a.url)
                    onClose()
                  }}
                >
                  <img src={a.url} alt="" loading="lazy" />
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <form
              className="ib-search"
              onSubmit={(e) => {
                e.preventDefault()
                void search(query)
              }}
            >
              <Search size={15} />
              <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une photo (en anglais de préférence) : office, forest, city…" autoFocus />
            </form>
            <div className="chips" style={{ gap: 6 }}>
              {THEMES.map(([label, q]) => (
                <button
                  key={label}
                  className={`chip ${last.current === q ? 'active' : ''}`}
                  onClick={() => {
                    setQuery(q)
                    void search(q)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {error && <div className="callout" style={{ fontSize: 13 }}>{error}</div>}
            <div className={`imb-grid photos ${kind}`}>
              {results.map((img) => (
                <button key={img.id} className="imb-cell" onClick={() => pickPhoto(img)} disabled={Boolean(fetching)} title={`${img.title} · ${img.creator} (${img.license}, ${img.provider})`}>
                  <img src={img.thumb} alt={img.title} />
                  <span>
                    {img.creator || img.provider} · {img.license}
                  </span>
                  {fetching === img.id && (
                    <i className="imb-busy">
                      <Loader2 size={18} className="spin" />
                    </i>
                  )}
                </button>
              ))}
            </div>
            {loading && (
              <div className="row muted" style={{ gap: 8 }}>
                <Loader2 size={15} className="spin" /> Recherche de photos libres de droits…
              </div>
            )}
            {!loading && results.length > 0 && page.n < page.pages && (
              <button className="btn btn-outline btn-sm" style={{ alignSelf: 'center' }} onClick={() => search(last.current, true)}>
                Plus de photos ({page.total} au total)
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
