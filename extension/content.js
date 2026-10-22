// Pages LinkedIn : bouton flottant « CV GEN » sur une offre, et « + CV GEN » sur chaque carte d'une liste d'offres.
;(() => {
  if (window.__cvgenLoaded) return
  window.__cvgenLoaded = true
  const LI = globalThis.CVGEN_LI
  // Les pages publiques passent par l'extension (le site connecté n'y a pas toujours accès).
  LI.get = (url) => chrome.runtime.sendMessage({ type: 'get', url })

  const clean = LI.clean
  const sent = new Set()

  /** Offre affichée : URL (/jobs/view/<id>, ?currentJobId=<id>) ou carte active de la liste. */
  function currentJobId() {
    const fromUrl = LI.jobIdFrom(location.href)
    if (fromUrl) return fromUrl
    const active = document.querySelector('.jobs-search-results-list__list-item--active [data-job-id], .job-card-container--active[data-job-id], [aria-current="page"][data-job-id]')
    return active ? LI.jobIdFrom(active.getAttribute('data-job-id')) : ''
  }

  /** Repli si la page publique est indisponible : lecture de l'offre affichée (version connectée). */
  function scrapeVisible(id) {
    const q = (sel) => clean(document.querySelector(sel)?.textContent)
    const title = q('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.job-details-jobs-unified-top-card__job-title, main h1')
    const company = q('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name')
    const location = clean((q('.job-details-jobs-unified-top-card__primary-description-container, .job-details-jobs-unified-top-card__tertiary-description-container, .jobs-unified-top-card__bullet') || '').split('·')[0])
    const desc = document.querySelector('#job-details, .jobs-description__content, .jobs-box__html-content, .jobs-description-content__text')
    const body = LI.htmlToText(desc)
    if (!title || body.length < 60) throw new Error('Offre illisible sur cette page : ouvrez l’annonce en entier.')
    return { title, company, location, text: [title, company].filter(Boolean).join('\n') + '\n\n' + body, url: LI.jobUrl(id), source: 'linkedin' }
  }

  async function readJob(id) {
    try {
      return await LI.fetchJob(id)
    } catch (e) {
      if (id === currentJobId()) return scrapeVisible(id)
      throw e
    }
  }

  async function sendJob(id, apply) {
    const offer = await readJob(id)
    const r = await chrome.runtime.sendMessage({ type: 'send', offers: [offer], apply })
    if (r?.ok || r?.queued) sent.add(LI.jobUrl(id))
    return { ...r, offer }
  }

  // ---------- Bouton flottant (Shadow DOM : styles isolés de LinkedIn) ----------
  const host = document.createElement('div')
  host.id = 'cvgen-host'
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .box { position: fixed; right: 20px; bottom: 20px; z-index: 2147483000; font: 13px/1.35 Inter, "Segoe UI", system-ui, sans-serif;
        background: #fff; color: #0b0b0c; border: 1px solid #0b0b0c; border-radius: 22px; padding: 10px 10px 10px 16px;
        display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.14); max-width: 440px; }
      .mark { width: 9px; height: 9px; border-radius: 50%; background: #0b0b0c; flex: none; }
      .txt { min-width: 0; display: grid; }
      .txt b { font-weight: 650; letter-spacing: .02em; font-size: 11px; text-transform: uppercase; }
      .txt span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #555; max-width: 210px; }
      button { font: inherit; border-radius: 999px; padding: 7px 13px; cursor: pointer; border: 1px solid #0b0b0c; background: #fff; color: #0b0b0c; white-space: nowrap; }
      button.main { background: #0b0b0c; color: #fff; }
      button:disabled { opacity: .5; cursor: default; }
      button.x { border: 0; padding: 4px 6px; color: #777; }
      .ok { color: #13803d; } .err { color: #b42318; }
      @media (prefers-color-scheme: dark) {
        .box { background: #0b0b0c; color: #f4f4f2; border-color: #f4f4f2; } .mark { background: #f4f4f2; }
        .txt span { color: #aaa; } button { background: #0b0b0c; color: #f4f4f2; border-color: #f4f4f2; }
        button.main { background: #f4f4f2; color: #0b0b0c; } .ok { color: #4ade80; } .err { color: #f87171; }
      }
    </style>
    <div class="box" hidden>
      <div class="mark"></div>
      <div class="txt"><b>CV GEN</b><span class="msg">Offre détectée</span></div>
      <button class="imp" title="Ajouter l’offre à CV GEN">Importer</button>
      <button class="main app" title="Ouvrir l’offre dans CV GEN et adapter votre CV">Appliquer</button>
      <button class="x" title="Masquer">✕</button>
    </div>`
  const box = root.querySelector('.box')
  const msg = root.querySelector('.msg')
  let hiddenFor = ''
  let shownId = ''

  const setMsg = (t, cls = '') => {
    msg.textContent = t
    msg.className = 'msg ' + cls
  }

  async function act(apply) {
    const id = currentJobId()
    if (!id) return
    for (const b of root.querySelectorAll('button')) b.disabled = true
    setMsg('Lecture de l’annonce…')
    try {
      const r = await sendJob(id, apply)
      if (r.ok) setMsg(apply ? 'Ouverte dans CV GEN' : 'Importée dans CV GEN', 'ok')
      else setMsg(r.queued ? 'CV GEN fermé : gardée pour plus tard' : r.error || 'Échec', r.queued ? '' : 'err')
      markCards()
    } catch (e) {
      setMsg(e.message, 'err')
    } finally {
      for (const b of root.querySelectorAll('button')) b.disabled = false
    }
  }
  root.querySelector('.imp').addEventListener('click', () => act(false))
  root.querySelector('.app').addEventListener('click', () => act(true))
  root.querySelector('.x').addEventListener('click', () => {
    hiddenFor = shownId
    box.hidden = true
  })

  function refreshBox() {
    const id = currentJobId()
    if (!document.body.contains(host)) document.body.appendChild(host)
    if (!id || id === hiddenFor) {
      box.hidden = true
      return
    }
    box.hidden = false
    if (id !== shownId) {
      shownId = id
      setMsg(sent.has(LI.jobUrl(id)) ? 'Déjà importée' : 'Offre détectée', sent.has(LI.jobUrl(id)) ? 'ok' : '')
    }
  }

  // ---------- Boutons « + CV GEN » sur les cartes ----------
  const CARD = '[data-occludable-job-id], .job-card-container[data-job-id], li[data-job-id], [data-entity-urn*="jobPosting"]'
  function cardId(card) {
    return LI.jobIdFrom(card.getAttribute('data-occludable-job-id') || card.getAttribute('data-job-id') || card.getAttribute('data-entity-urn') || '')
  }

  function markCards() {
    for (const card of document.querySelectorAll(CARD)) {
      if (card.parentElement?.closest(CARD)) continue // carte imbriquée : un seul bouton
      const id = cardId(card)
      if (!id) continue
      let btn = card.querySelector(':scope .cvgen-card-btn')
      if (!btn) {
        btn = document.createElement('button')
        btn.className = 'cvgen-card-btn'
        btn.type = 'button'
        btn.addEventListener('click', async (e) => {
          e.preventDefault()
          e.stopPropagation()
          btn.disabled = true
          btn.textContent = '…'
          try {
            const r = await sendJob(id, false)
            btn.textContent = r.ok ? '✓ CV GEN' : r.queued ? '⏳ En attente' : '! Échec'
            if (!r.ok && !r.queued) btn.title = r.error || ''
          } catch (err) {
            btn.textContent = '! Échec'
            btn.title = err.message
          } finally {
            btn.disabled = false
          }
        })
        if (getComputedStyle(card).position === 'static') card.style.position = 'relative'
        card.appendChild(btn)
      }
      // Écritures seulement si quelque chose change : sinon l'observateur de mutations tournerait en boucle.
      const done = sent.has(LI.jobUrl(id))
      const label = done && !btn.disabled ? '✓ CV GEN' : btn.textContent || '+ CV GEN'
      if (btn.textContent !== label) btn.textContent = label
      const tip = done ? 'Déjà dans CV GEN (cliquer pour mettre à jour)' : 'Importer cette offre dans CV GEN'
      if (!btn.title.startsWith('!') && btn.title !== tip && !/Échec/.test(btn.textContent)) btn.title = tip
    }
  }

  /** Offres listées sur la page (pour « Importer les offres visibles » dans la fenêtre de l'extension). */
  function visibleJobs() {
    const out = []
    const seen = new Set()
    for (const card of document.querySelectorAll(CARD)) {
      const id = cardId(card)
      if (!id || seen.has(id)) continue
      seen.add(id)
      const title = clean(card.querySelector('.job-card-list__title, .job-card-list__title--link, .base-search-card__title, a strong, h3')?.textContent)
      out.push({ id, title: title.split('\n')[0] })
    }
    return out
  }

  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (m?.type === 'page') {
      reply({ current: currentJobId(), currentTitle: currentJobId() ? clean(document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, main h1')?.textContent) : '', jobs: visibleJobs() })
    } else if (m?.type === 'refresh') {
      chrome.runtime.sendMessage({ type: 'imported' }).then((r) => {
        for (const u of r?.urls || []) sent.add(u)
        markCards()
      })
      reply({ ok: true })
    }
  })

  // LinkedIn est une application d'une seule page : on surveille l'URL et la liste.
  let lastUrl = ''
  let timer = 0
  const tick = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      hiddenFor = hiddenFor && hiddenFor === currentJobId() ? hiddenFor : ''
    }
    refreshBox()
    markCards()
  }
  new MutationObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(tick, 400)
  }).observe(document.documentElement, { childList: true, subtree: true })
  chrome.runtime.sendMessage({ type: 'imported' }).then((r) => {
    for (const u of r?.urls || []) sent.add(u)
    tick()
  }, tick)
})()
