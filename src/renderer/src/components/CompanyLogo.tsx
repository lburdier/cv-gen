import { useEffect, useState } from 'react'
import { logoDomain } from '../../../shared/companies'

// Logos déjà demandés pendant la session : un seul appel par domaine.
const cache = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()

function load(domain: string): Promise<string | null> {
  if (cache.has(domain)) return Promise.resolve(cache.get(domain) ?? null)
  let p = pending.get(domain)
  if (!p) {
    p = (window.cvgen?.logos?.get(domain) ?? Promise.resolve(null))
      .catch(() => null)
      .then((v) => {
        cache.set(domain, v)
        pending.delete(domain)
        return v
      })
    pending.set(domain, p)
  }
  return p
}

function initials(name: string) {
  return (
    name
      .replace(/[^\p{L}\p{N}\s&]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

/**
 * Logo d'entreprise : favicon du site renseigné, sinon de l'entreprise reconnue dans la base,
 * sinon du domaine de l'e-mail du contact ; à défaut, monogramme.
 */
export function CompanyLogo({ company, website, emails, size = 'md' }: { company: string; website?: string; emails?: string[]; size?: 'sm' | 'md' | 'lg' }) {
  const domain = logoDomain(company, website, emails)
  const [src, setSrc] = useState<string | null>(() => (domain ? cache.get(domain) ?? null : null))
  useEffect(() => {
    let alive = true
    if (!domain) {
      setSrc(null)
      return
    }
    setSrc(cache.get(domain) ?? null)
    void load(domain).then((v) => {
      if (alive) setSrc(v)
    })
    return () => {
      alive = false
    }
  }, [domain])
  const cls = `co-logo ${size === 'md' ? '' : size}`
  if (src)
    return (
      <span className={cls} title={domain}>
        <img src={src} alt="" onError={() => setSrc(null)} />
      </span>
    )
  return (
    <span className={`${cls} mono`} aria-hidden>
      {company.trim() ? initials(company) : ''}
    </span>
  )
}
