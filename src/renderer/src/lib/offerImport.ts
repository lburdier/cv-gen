import type { BridgeDelivery, IncomingOffer, Offer } from '../../../shared/types'
import { noDash } from '../../../shared/format'
import { useStore } from '../store'
import { localAnalyze } from './ats'
import { uid } from './sample'
import { fromOffer } from './tracker'

/** Libellé lisible de la source d'une offre importée. */
export function sourceLabel(source?: string) {
  if (!source) return ''
  if (source === 'linkedin') return 'LinkedIn'
  if (source === 'web') return 'Web'
  return source[0].toUpperCase() + source.slice(1)
}

/** Identité d'une annonce : l'URL sans paramètres de suivi (LinkedIn : l'identifiant de l'offre). */
export function offerKey(url?: string) {
  if (!url) return ''
  const li = /linkedin\.com\/jobs\/view\/(?:[^/?#]*?-)?(\d{6,})/i.exec(url)
  if (li) return `linkedin:${li[1]}`
  return url.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase()
}

/** URL stable d'une annonce LinkedIn (sans sous-domaine de langue ni paramètres de suivi). */
function canonicalUrl(url?: string) {
  const li = url && /linkedin\.com\/jobs\/view\/(?:[^/?#]*?-)?(\d{6,})/i.exec(url)
  return li ? `https://www.linkedin.com/jobs/view/${li[1]}/` : url
}

/** Critères LinkedIn (souvent en anglais) en français ; « Not Applicable » ignoré. */
const CRITERIA_FR: Record<string, string> = {
  'full-time': 'Temps plein',
  'part-time': 'Temps partiel',
  contract: 'CDD / contrat',
  temporary: 'Temporaire',
  internship: 'Stage',
  volunteer: 'Bénévolat',
  'entry level': 'Débutant',
  associate: 'Junior',
  'mid-senior level': 'Confirmé',
  director: 'Directeur',
  executive: 'Cadre dirigeant'
}

function criterion(c: Record<string, string> | undefined, re: RegExp) {
  if (!c) return ''
  const v = Object.entries(c).find(([k]) => re.test(k))?.[1] ?? ''
  if (/^(not applicable|non applicable|sans objet)$/i.test(v)) return ''
  return CRITERIA_FR[v.toLowerCase()] ?? v
}

/** Offre de l'extension → offre de l'app, analysée localement (mots-clés, niveau, contrat, lieu). */
export function toOffer(i: IncomingOffer, existing?: Offer): Offer {
  const text = noDash(i.text)
  const analysis = localAnalyze(text || i.title)
  const c = i.criteria
  const seniority = criterion(c, /seniority|niveau|exp[ée]rience/i)
  const contract = criterion(c, /employment|type d.emploi|contrat|job type/i)
  return {
    id: existing?.id ?? uid(),
    title: noDash(i.title, ' · ') || analysis.title || 'Offre sans titre',
    company: i.company || analysis.company,
    text,
    createdAt: existing?.createdAt ?? Date.now(),
    url: i.url,
    location: i.location,
    source: i.source,
    analysis: {
      ...analysis,
      // Le résumé local reprendrait l'en-tête (titre, entreprise) : on le garde seulement s'il dit autre chose.
      summary: analysis.summary.length > 80 ? analysis.summary : '',
      title: i.title || analysis.title,
      company: i.company || analysis.company,
      location: i.location || analysis.location,
      seniority: seniority || analysis.seniority,
      contract: contract || analysis.contract
    }
  }
}

/** Ajoute (ou met à jour) les offres reçues ; « Appliquer » ouvre l'offre et lance l'adaptation. */
export function receiveOffers(d: BridgeDelivery) {
  const s = useStore.getState()
  const byKey = new Map(s.data.offers.filter((o) => o.url).map((o) => [offerKey(o.url), o]))
  let added = 0
  let lastId = ''
  for (const raw of d.offers) {
    const i = { ...raw, url: canonicalUrl(raw.url) }
    const prev = i.url ? byKey.get(offerKey(i.url)) : undefined
    // Offre déjà importée : on garde l'analyse IA éventuelle et les retouches de titre.
    const next = toOffer(i, prev)
    if (prev) {
      s.saveOffer({ ...next, title: prev.title || next.title, company: prev.company || next.company, analysis: prev.analysis?.source === 'ai' ? prev.analysis : next.analysis })
    } else {
      s.saveOffer(next)
      added++
    }
    lastId = next.id
  }
  const src = sourceLabel(d.offers[0]?.source)
  s.log('analyze', d.offers.length === 1 ? `Offre importée${src ? ` depuis ${src}` : ''} : ${d.offers[0].title}` : `${d.offers.length} offres importées${src ? ` depuis ${src}` : ''}`)
  if (d.apply && lastId) {
    // « Appliquer » : la candidature rejoint le suivi (À postuler) si elle n'y est pas déjà.
    const st = useStore.getState()
    const offer = st.data.offers.find((o) => o.id === lastId)
    if (offer && !(st.data.applications ?? []).some((a) => a.offerId === offer.id)) st.saveApplication(fromOffer(offer))
    s.go({ name: 'offers', id: lastId, tailor: true })
    return
  }
  const one = d.offers.length === 1
  s.toast({
    kind: 'success',
    title: one ? (added ? 'Offre importée' : 'Offre mise à jour') : `${d.offers.length} offres importées`,
    detail: one ? `${d.offers[0].title}${d.offers[0].company ? ` · ${d.offers[0].company}` : ''}` : added < d.offers.length ? `${d.offers.length - added} déjà présentes, mises à jour` : undefined,
    action: { label: 'Voir', run: () => useStore.getState().go({ name: 'offers', id: one ? lastId : undefined }) }
  })
}
