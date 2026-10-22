// Service de l'extension : relais vers CV GEN (pont local 127.0.0.1) et file d'attente quand l'app est fermée.
const PORTS = [47615, 47616, 47617]
let knownPort = null

async function call(path, init) {
  const order = knownPort ? [knownPort, ...PORTS.filter((p) => p !== knownPort)] : PORTS
  let lastErr = null
  for (const port of order) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 2500)
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { ...init, signal: ctrl.signal })
      clearTimeout(t)
      const body = await res.json().catch(() => ({}))
      // Un autre programme peut occuper le port : on vérifie que c'est bien CV GEN.
      if (path === '/cvgen/ping' && body.app !== 'CV GEN') continue
      knownPort = port
      if (!res.ok) throw Object.assign(new Error(body.error || `Erreur ${res.status}`), { fatal: true })
      return body
    } catch (e) {
      if (e.fatal) throw e
      lastErr = e
    }
  }
  knownPort = null
  throw lastErr || new Error('CV GEN est fermé')
}

const ping = () => call('/cvgen/ping').then((b) => ({ ok: true, version: b.version }), () => ({ ok: false }))

async function queue() {
  return (await chrome.storage.local.get('queue')).queue || []
}
async function setQueue(q) {
  await chrome.storage.local.set({ queue: q })
  await chrome.action.setBadgeBackgroundColor({ color: '#0B0B0C' })
  await chrome.action.setBadgeText({ text: q.length ? String(q.length) : '' })
}

async function postOffers(offers, apply) {
  return call('/cvgen/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offers, apply }) })
}

/** Envoie à CV GEN ; si l'app est fermée, garde les offres pour plus tard. */
async function send(offers, apply) {
  try {
    await flush()
    const r = await postOffers(offers, apply)
    await remember(offers)
    return { ok: true, received: r.received }
  } catch (e) {
    if (e.fatal) return { ok: false, error: e.message }
    const q = await queue()
    const urls = new Set(offers.map((o) => o.url).filter(Boolean))
    await setQueue([...q.filter((o) => !urls.has(o.url)), ...offers].slice(-100))
    return { ok: false, queued: true, error: 'CV GEN est fermé : offre gardée, elle sera envoyée à son ouverture.' }
  }
}

async function flush() {
  const q = await queue()
  if (!q.length) return 0
  for (let i = 0; i < q.length; i += 50) await postOffers(q.slice(i, i + 50), false)
  await remember(q)
  await setQueue([])
  return q.length
}

/** URLs déjà envoyées (repère « Importée » sur les cartes LinkedIn). */
async function remember(offers) {
  const { sent = [] } = await chrome.storage.local.get('sent')
  const next = [...new Set([...sent, ...offers.map((o) => o.url).filter(Boolean)])].slice(-2000)
  await chrome.storage.local.set({ sent: next })
}

async function imported() {
  const { sent = [] } = await chrome.storage.local.get('sent')
  try {
    const s = await call('/cvgen/suggest')
    return [...new Set([...sent, ...(s.imported || [])])]
  } catch {
    return sent
  }
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const run = async () => {
    switch (msg?.type) {
      case 'status': {
        const st = await ping()
        if (st.ok) await flush().catch(() => 0)
        return { ...st, queued: (await queue()).length }
      }
      case 'send':
        return send(msg.offers || [], Boolean(msg.apply))
      case 'suggest':
        return call('/cvgen/suggest').catch(() => ({ ok: false }))
      case 'imported':
        return { urls: await imported() }
      case 'get': {
        // Pages publiques LinkedIn uniquement (le script de contenu n'a pas accès aux autres sous-domaines).
        if (!/^https:\/\/www\.linkedin\.com\/jobs-guest\//.test(msg.url)) return { status: 400, text: '' }
        const res = await fetch(msg.url, { credentials: 'omit' })
        return { status: res.status, text: res.ok ? await res.text() : '' }
      }
      default:
        return { ok: false, error: 'Message inconnu' }
    }
  }
  run().then(reply, (e) => reply({ ok: false, error: e.message }))
  return true
})

// Renvoi régulier des offres en attente (l'app vient peut-être d'être ouverte).
chrome.alarms.create('flush', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'flush') flush().catch(() => {})
})
chrome.runtime.onStartup.addListener(() => flush().catch(() => {}))
chrome.runtime.onInstalled.addListener(() => queue().then(setQueue))
