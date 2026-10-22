import { linkHref, stripProtocol } from '../../../shared/format'
import type { Resume } from '../../../shared/types'

/** Textes du CV qui sont des liens (site, LinkedIn, GitHub, portfolio, e-mail), sous toutes leurs formes affichées. */
function linkTexts(r: Resume): Map<string, string> {
  const b = r.basics
  const raw = [b.email, b.website, b.linkedin, b.github, b.ctaUrl ?? '', ...(r.links ?? []).map((l) => l.url), ...r.projects.map((p) => p.link)]
  const map = new Map<string, string>()
  for (const v of raw) {
    const href = linkHref(v ?? '')
    if (!href) continue
    const t = v.trim()
    for (const shown of [t, stripProtocol(t), stripProtocol(t).replace(/^linkedin\.com\/in\//, ''), t.replace(/^mailto:/, '')]) if (shown.length > 3 && !map.has(shown)) map.set(shown, href)
  }
  return map
}

/**
 * Export PDF : chaque lien affiché dans le CV devient cliquable (Chromium garde les <a href> dans le PDF).
 * Le texte d'origine est simplement entouré d'un lien : la page d'impression ne se met plus à jour ensuite.
 */
export function linkifyCv(root: Element, r: Resume) {
  const links = linkTexts(r)
  if (!links.size) return
  // Les plus longs d'abord : « linkedin.com/in/x » avant « x ».
  const keys = [...links.keys()].sort((a, b) => b.length - a.length)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!n.parentElement?.closest('a')) nodes.push(n as Text)
  for (const node of nodes) {
    const text = node.data
    const key = keys.find((k) => text.includes(k))
    if (!key) continue
    const start = text.indexOf(key)
    const target = start > 0 ? node.splitText(start) : node
    if (target.data.length > key.length) target.splitText(key.length)
    const a = document.createElement('a')
    a.href = links.get(key)!
    a.className = 'cv-link'
    target.parentNode!.insertBefore(a, target)
    a.appendChild(target)
  }
}
