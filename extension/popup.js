// Fenêtre de l'extension : état de la connexion, offre de l'onglet actif, recherche LinkedIn et import en lot.
const LI = globalThis.CVGEN_LI
const $ = (id) => document.getElementById(id)
const send = (m) => chrome.runtime.sendMessage(m)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let tab = null
let page = null // { current, currentTitle, jobs } sur LinkedIn
let results = []
let start = 0
let imported = new Set()
let query = {}

function msg(el, text, cls = '') {
  el.textContent = text
  el.className = 'msg ' + cls
}

function report(el, r, n = 1) {
  if (r?.ok) msg(el, n > 1 ? `${n} offres importées dans CV GEN.` : 'Importée dans CV GEN.', 'ok')
  else if (r?.queued) msg(el, n > 1 ? `CV GEN est fermé : ${n} offres gardées, envoyées à son ouverture.` : r.error)
  else msg(el, r?.error || 'Échec de l’envoi.', 'err')
}

async function refreshStatus() {
  const st = await send({ type: 'status' })
  const el = $('status')
  el.textContent = st.ok ? `Connecté · v${st.version}` : 'CV GEN fermé'
  el.className = 'pill ' + (st.ok ? 'ok' : 'off')
  el.title = st.ok ? '' : 'Cliquer pour ouvrir CV GEN'
  el.onclick = st.ok ? null : () => chrome.tabs.create({ url: 'cvgen://open' })
  $('queued').hidden = !st.queued
  $('queued').textContent = st.queued ? `${st.queued} offre(s) en attente : envoyées dès que CV GEN est ouvert.` : ''
  return st
}

/** Annonce d'un site quelconque : données structurées JobPosting, sinon texte sélectionné ou principal. */
function extractGeneric() {
  const text = (el) => (el?.innerText || '').replace(/\n{3,}/g, '\n\n').trim()
  const strip = (html) => {
    const d = document.createElement('div')
    d.innerHTML = String(html || '').replace(/<(br|\/p|\/li|\/h\d)>/gi, '$&\n')
    return (d.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  }
  const flat = (x) => (Array.isArray(x) ? x.flatMap(flat) : x && x['@graph'] ? flat(x['@graph']) : x ? [x] : [])
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const job = flat(JSON.parse(s.textContent)).find((x) => [].concat(x['@type']).includes('JobPosting'))
      if (!job) continue
      const loc = [].concat(job.jobLocation || [])[0]?.address
      const place = loc ? [loc.addressLocality, loc.addressCountry?.name || loc.addressCountry].filter((v) => typeof v === 'string').join(', ') : ''
      const company = typeof job.hiringOrganization === 'string' ? job.hiringOrganization : job.hiringOrganization?.name || ''
      const body = strip(job.description)
      const criteria = {}
      if (job.employmentType) criteria['Type de contrat'] = [].concat(job.employmentType).join(', ')
      return { title: job.title || document.title, company, location: place, criteria, text: [job.title, company, '', body].join('\n') }
    } catch {
      /* JSON invalide : bloc suivant */
    }
  }
  const sel = String(getSelection() || '').trim()
  const main = document.querySelector('main, article, [role="main"]') || document.body
  const h1 = text(document.querySelector('h1'))
  return { title: h1 || document.title, company: '', location: '', text: sel.length > 200 ? sel : text(main).slice(0, 60000) }
}

async function showHere() {
  tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
  if (!tab?.url || !/^https?:/.test(tab.url)) return
  const onLi = /^https:\/\/[\w.]*linkedin\.com\//.test(tab.url)
  $('here').hidden = false
  if (onLi) {
    page = await chrome.tabs.sendMessage(tab.id, { type: 'page' }).catch(() => null)
    const id = page?.current || LI.jobIdFrom(tab.url)
    $('hereTitle').textContent = id ? page?.currentTitle || 'Offre LinkedIn détectée' : 'Aucune offre ouverte sur cette page'
    $('hereImport').disabled = $('hereApply').disabled = !id
    const n = page?.jobs?.length || 0
    $('visibleImport').hidden = n < 2
    $('visibleImport').textContent = `Importer les ${Math.min(n, 25)} offres de la liste`
  } else {
    $('hereTitle').textContent = 'Importer l’annonce de cette page'
    $('hereApply').textContent = 'Appliquer dans CV GEN'
  }
}

async function readHere() {
  if (/linkedin\.com\//.test(tab.url)) {
    const id = page?.current || LI.jobIdFrom(tab.url)
    return LI.fetchJob(id)
  }
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractGeneric })
  if (!result || (result.text || '').length < 80) throw new Error('Aucune annonce lisible : sélectionnez le texte de l’offre puis réessayez.')
  const host = new URL(tab.url).hostname.replace(/^www\./, '')
  return { ...result, url: tab.url.split('#')[0], source: host.split('.').slice(-2, -1)[0] || 'web' }
}

async function hereAction(apply) {
  const el = $('hereMsg')
  $('hereImport').disabled = $('hereApply').disabled = true
  msg(el, 'Lecture de l’annonce…')
  try {
    const offer = await readHere()
    report(el, await send({ type: 'send', offers: [offer], apply }))
    if (apply) setTimeout(() => window.close(), 900)
  } catch (e) {
    msg(el, e.message, 'err')
  } finally {
    $('hereImport').disabled = $('hereApply').disabled = false
    chrome.tabs.sendMessage(tab.id, { type: 'refresh' }).catch(() => {})
    refreshStatus()
  }
}

/** Lit chaque annonce (avec une pause pour ne pas être limité par LinkedIn) puis envoie le lot. */
async function importIds(ids, el) {
  const offers = []
  const fails = []
  for (let i = 0; i < ids.length; i++) {
    msg(el, `Lecture des annonces… ${i + 1} / ${ids.length}`)
    try {
      offers.push(await LI.fetchJob(ids[i]))
    } catch (e) {
      fails.push(e.message)
      if (/limite/.test(e.message)) break
    }
    if (i < ids.length - 1) await sleep(450)
  }
  if (!offers.length) return msg(el, fails[0] || 'Aucune annonce lisible.', 'err')
  const r = await send({ type: 'send', offers, apply: false })
  report(el, r, offers.length)
  if (fails.length && (r.ok || r.queued)) el.textContent += ` ${fails.length} illisible(s).`
  offers.forEach((o) => imported.add(o.url))
  if (tab) chrome.tabs.sendMessage(tab.id, { type: 'refresh' }).catch(() => {})
  refreshStatus()
}

// ---------- Recherche ----------
function readQuery() {
  return { keywords: $('kw').value.trim(), location: $('loc').value.trim(), date: $('date').value, remote: $('remote').value, type: $('type').value, level: $('level').value }
}

function renderResults() {
  const list = $('list')
  list.replaceChildren()
  for (const r of results) {
    const li = document.createElement('li')
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.value = r.id
    cb.addEventListener('change', updateSel)
    const info = document.createElement('div')
    const t = document.createElement('strong')
    const a = document.createElement('a')
    a.href = r.url
    a.target = '_blank'
    a.textContent = r.title || 'Offre'
    t.append(a)
    if (imported.has(r.url)) {
      const tag = document.createElement('span')
      tag.className = 'tag'
      tag.textContent = 'importée'
      t.append(tag)
    }
    const sub = document.createElement('small')
    sub.textContent = [r.company, r.location, r.date].filter(Boolean).join(' · ')
    info.append(t, sub)
    li.append(cb, info)
    list.append(li)
  }
  $('results').hidden = false
  $('count').textContent = results.length ? `${results.length} offres` : 'Aucune offre trouvée'
  $('more').hidden = results.length === 0 || results.length % 10 !== 0
  updateSel()
}

function selected() {
  return [...document.querySelectorAll('#list input:checked')].map((c) => c.value)
}
function updateSel() {
  const n = selected().length
  $('importSel').disabled = n === 0
  $('importSel').textContent = n ? `Importer ${n} offre${n > 1 ? 's' : ''}` : 'Importer la sélection'
}

async function runSearch(more) {
  const el = $('resMsg')
  if (!more) {
    query = readQuery()
    start = 0
    results = []
    chrome.storage.local.set({ lastQuery: query })
  }
  if (!query.keywords && !query.location) return msg(el, 'Indiquez un poste ou un lieu.', 'err')
  $('results').hidden = false
  msg(el, 'Recherche…')
  try {
    const page = await LI.search(query, start)
    const known = new Set(results.map((r) => r.id))
    results.push(...page.filter((p) => !known.has(p.id)))
    start += page.length || 10
    renderResults()
    msg(el, '')
  } catch (e) {
    msg(el, e.message, 'err')
  }
}

$('search').addEventListener('submit', (e) => {
  e.preventDefault()
  runSearch(false)
})
$('more').addEventListener('click', () => runSearch(true))
$('openLi').addEventListener('click', () => chrome.tabs.create({ url: LI.searchUrl(readQuery()) }))
$('all').addEventListener('change', (e) => {
  for (const c of document.querySelectorAll('#list input')) c.checked = e.target.checked
  updateSel()
})
$('importSel').addEventListener('click', async () => {
  $('importSel').disabled = true
  await importIds(selected().slice(0, 50), $('resMsg'))
  renderResults()
})
$('hereImport').addEventListener('click', () => hereAction(false))
$('hereApply').addEventListener('click', () => hereAction(true))
$('visibleImport').addEventListener('click', async () => {
  $('visibleImport').disabled = true
  await importIds(page.jobs.slice(0, 25).map((j) => j.id), $('hereMsg'))
  $('visibleImport').disabled = false
})

;(async () => {
  const [st, saved, imp] = await Promise.all([refreshStatus(), chrome.storage.local.get('lastQuery'), send({ type: 'imported' })])
  imported = new Set(imp?.urls || [])
  const q = saved.lastQuery
  if (q) {
    $('kw').value = q.keywords || ''
    $('loc').value = q.location || ''
    for (const k of ['date', 'remote', 'type', 'level']) $(k).value = q[k] || ''
  } else if (st.ok) {
    // Première utilisation : pistes tirées du profil ou du dernier CV.
    const s = await send({ type: 'suggest' })
    if (s?.ok) {
      $('kw').value = s.keywords || ''
      $('loc').value = s.location || ''
    }
  }
  showHere().catch(() => {})
})()
