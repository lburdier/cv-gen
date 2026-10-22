// Lecture des offres LinkedIn via les pages publiques (sans connexion) :
//  - recherche : /jobs-guest/jobs/api/seeMoreJobPostings/search
//  - annonce   : /jobs-guest/jobs/api/jobPosting/<id>
// Partagé par le script de contenu (pages LinkedIn) et la fenêtre de l'extension.
;(() => {
  const BASE = 'https://www.linkedin.com'

  const clean = (s) => (s || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim()

  /** HTML d'une description → texte avec retours à la ligne et puces. */
  function htmlToText(root) {
    if (!root) return ''
    const out = []
    const walk = (node) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) {
          out.push(n.nodeValue.replace(/\s+/g, ' '))
          continue
        }
        if (n.nodeType !== 1) continue
        const tag = n.tagName
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'BUTTON') continue
        if (tag === 'BR') {
          out.push('\n')
          continue
        }
        const block = /^(P|DIV|UL|OL|H[1-6]|SECTION|ARTICLE|TR)$/.test(tag)
        if (tag === 'LI') out.push('\n• ')
        else if (block) out.push('\n')
        walk(n)
        if (block || tag === 'LI') out.push('\n')
      }
    }
    walk(root)
    return out
      .join('')
      .split('\n')
      .map((l) => clean(l))
      .filter((l, i, a) => l || (a[i - 1] && a[i - 1].trim()))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const parse = (html) => new DOMParser().parseFromString(html, 'text/html')
  const txt = (doc, sel) => clean(doc.querySelector(sel)?.textContent)

  /** Identifiant numérique d'une offre depuis une URL ou un URN LinkedIn. */
  function jobIdFrom(s) {
    if (!s) return ''
    const m = /currentJobId=(\d{6,})/.exec(s) || /jobs\/view\/(?:[^/?#]*?-)?(\d{6,})/.exec(s) || /jobPosting:(\d{6,})/.exec(s) || /^(\d{6,})$/.exec(s)
    return m ? m[1] : ''
  }

  const jobUrl = (id) => `${BASE}/jobs/view/${id}/`

  /** Annonce publique → offre pour CV GEN (titre, entreprise, lieu, critères, texte complet). */
  function parsePosting(html, id) {
    const doc = parse(html)
    const title = txt(doc, '.top-card-layout__title, .topcard__title, h1, h2')
    const company = txt(doc, '.topcard__org-name-link, .top-card-layout__second-subline a, .topcard__flavor')
    const location = txt(doc, '.topcard__flavor--bullet')
    const criteria = {}
    for (const li of doc.querySelectorAll('.description__job-criteria-item')) {
      const k = txt(li, '.description__job-criteria-subheader')
      const v = txt(li, '.description__job-criteria-text')
      if (k && v) criteria[k] = v
    }
    const desc = doc.querySelector('.show-more-less-html__markup, .description__text')
    let text = htmlToText(desc)
    const facts = [location && `Lieu : ${location}`, ...Object.entries(criteria).map(([k, v]) => `${k} : ${v}`)].filter(Boolean)
    if (facts.length) text += '\n\n' + facts.join('\n')
    return { title, company, location, criteria, text: [title, company].filter(Boolean).join('\n') + '\n\n' + text, url: jobUrl(id), source: 'linkedin' }
  }

  /** Téléchargement d'une page publique : { status, text }. Remplacé dans le script de contenu (passe par l'extension). */
  async function get(url) {
    const res = await fetch(url, { credentials: 'omit' })
    return { status: res.status, text: res.ok ? await res.text() : '' }
  }
  const api = { get }

  async function fetchJob(id) {
    const res = await api.get(`${BASE}/jobs-guest/jobs/api/jobPosting/${id}`)
    if (res.status !== 200) throw new Error(res.status === 429 ? 'LinkedIn limite les requêtes : réessayez dans une minute.' : `Annonce illisible (${res.status})`)
    const offer = parsePosting(res.text, id)
    if (!offer.title || offer.text.length < 60) throw new Error('Annonce introuvable ou vide.')
    return offer
  }

  /** Paramètres de recherche LinkedIn (mêmes noms que l'URL du site). */
  function searchParams(q, start) {
    const p = new URLSearchParams()
    if (q.keywords) p.set('keywords', q.keywords)
    if (q.location) p.set('location', q.location)
    if (q.date) p.set('f_TPR', q.date)
    if (q.remote) p.set('f_WT', q.remote)
    if (q.type) p.set('f_JT', q.type)
    if (q.level) p.set('f_E', q.level)
    if (start) p.set('start', String(start))
    return p
  }

  const searchUrl = (q) => `${BASE}/jobs/search/?${searchParams(q, 0)}`

  async function search(q, start = 0) {
    const res = await api.get(`${BASE}/jobs-guest/jobs/api/seeMoreJobPostings/search?${searchParams(q, start)}`)
    if (res.status === 400 || res.status === 404) return []
    if (res.status !== 200) throw new Error(res.status === 429 ? 'LinkedIn limite les requêtes : réessayez dans une minute.' : `Recherche impossible (${res.status})`)
    const doc = parse(res.text)
    const seen = new Set()
    const items = []
    for (const card of doc.querySelectorAll('[data-entity-urn*="jobPosting"], .job-search-card')) {
      const id = jobIdFrom(card.getAttribute('data-entity-urn') || card.querySelector('a')?.getAttribute('href') || '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      items.push({
        id,
        title: txt(card, '.base-search-card__title'),
        company: txt(card, '.base-search-card__subtitle'),
        location: txt(card, '.job-search-card__location'),
        date: txt(card, 'time'),
        url: jobUrl(id)
      })
    }
    return items
  }

  globalThis.CVGEN_LI = Object.assign(api, { htmlToText, jobIdFrom, jobUrl, parsePosting, fetchJob, search, searchUrl, clean })
})()
