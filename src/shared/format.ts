// Mise en forme commune (aperçu, PDF, DOCX, TXT) : un seul endroit pour les
// intitulés de sections et les dates, pour que chaque export reste identique.
import type { Lang, Resume, SectionKey } from './types'

export const SECTION_TITLES: Record<Lang, Record<SectionKey, string>> = {
  fr: {
    summary: 'Profil',
    experience: 'Expérience professionnelle',
    education: 'Formation',
    skills: 'Compétences',
    projects: 'Projets',
    certifications: 'Certifications',
    languages: 'Langues',
    interests: "Centres d'intérêt",
    gallery: 'Réalisations'
  },
  en: {
    summary: 'Summary',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certifications: 'Certifications',
    languages: 'Languages',
    interests: 'Interests',
    gallery: 'Portfolio'
  }
}

/** Variantes d'intitulés reconnues par les ATS : la toile n'autorise que celles-ci. */
export const TITLE_VARIANTS: Record<Lang, Record<SectionKey, string[]>> = {
  fr: {
    summary: ['Profil', 'Profil professionnel', 'Résumé', 'À propos'],
    experience: ['Expérience professionnelle', 'Expériences professionnelles', 'Expérience', 'Parcours professionnel'],
    education: ['Formation', 'Formations', 'Diplômes', 'Éducation'],
    skills: ['Compétences', 'Compétences techniques', 'Savoir-faire'],
    projects: ['Projets', 'Projets personnels', 'Réalisations'],
    certifications: ['Certifications', 'Certifications et licences'],
    languages: ['Langues'],
    interests: ["Centres d'intérêt", 'Loisirs', 'Activités extra-professionnelles'],
    gallery: ['Réalisations', 'Portfolio']
  },
  en: {
    summary: ['Summary', 'Professional Summary', 'Profile', 'About'],
    experience: ['Work Experience', 'Professional Experience', 'Experience', 'Employment History'],
    education: ['Education', 'Academic Background'],
    skills: ['Skills', 'Technical Skills', 'Core Competencies'],
    projects: ['Projects', 'Personal Projects'],
    certifications: ['Certifications', 'Licenses & Certifications'],
    languages: ['Languages'],
    interests: ['Interests', 'Hobbies'],
    gallery: ['Portfolio', 'Selected Work']
  }
}

/** Intitulés du CV : variante choisie si elle est standard, sinon l'intitulé par défaut. */
export function sectionTitles(r: Resume): Record<SectionKey, string> {
  const base = { ...SECTION_TITLES[r.lang] }
  for (const [k, v] of Object.entries(r.titles ?? {}) as [SectionKey, string][]) if (v && TITLE_VARIANTS[r.lang][k]?.includes(v)) base[k] = v
  return base
}

export const DEFAULT_ORDER: SectionKey[] = [
  'summary',
  'experience',
  'skills',
  'education',
  'projects',
  'certifications',
  'languages',
  'interests',
  'gallery'
]

const PRESENT: Record<Lang, string> = { fr: 'Présent', en: 'Present' }

/** AAAA-MM → MM/AAAA, format le plus fiable pour les parseurs ATS. */
/** Retire les tirets cadratins « — » (l'app n'en affiche aucun) : remplacés par le séparateur donné. */
export function noDash(s: string, sep = ', '): string {
  if (!s.includes('—')) return s
  return s
    .replace(/^([ \t]*)—[ \t]*/gm, '$1- ') // en début de ligne : puce
    .replace(/[ \t]*—[ \t]*/g, sep)
    .trim()
}

/** Même chose dans toutes les chaînes d'un objet (réponses structurées de l'IA). */
export function noDashDeep<T>(v: T): T {
  if (typeof v === 'string') return noDash(v) as T
  if (Array.isArray(v)) return v.map(noDashDeep) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, noDashDeep(x)])) as T
  return v
}

export function formatMonth(value: string): string {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})/.exec(value)
  if (m) return `${m[2]}/${m[1]}`
  return value
}

export function formatRange(start: string, end: string, current: boolean, lang: Lang): string {
  const s = formatMonth(start)
  const e = current ? PRESENT[lang] : formatMonth(end)
  if (s && e) return `${s} – ${e}`
  return s || e
}

export function fullName(r: Resume): string {
  return `${r.basics.firstName} ${r.basics.lastName}`.trim()
}

export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

export function contactParts(r: Resume): string[] {
  const b = r.basics
  return [b.email, b.phone, b.location, b.linkedin && stripProtocol(b.linkedin), b.github && stripProtocol(b.github), b.website && stripProtocol(b.website)].filter(
    (x): x is string => Boolean(x && x.trim())
  )
}

export function visibleSections(r: Resume): SectionKey[] {
  return r.sectionOrder.filter((k) => !r.hidden.includes(k) && sectionHasContent(r, k))
}

/** Sections lisibles par un ATS : la galerie n'apparaît que si elle a des légendes (texte). */
export function atsSections(r: Resume): SectionKey[] {
  return visibleSections(r).filter((k) => k !== 'gallery' || (r.gallery ?? []).some((g) => g.caption.trim()))
}

export function sectionHasContent(r: Resume, k: SectionKey): boolean {
  switch (k) {
    case 'summary':
      return Boolean(r.basics.summary.trim())
    case 'experience':
      return r.experiences.length > 0
    case 'education':
      return r.education.length > 0
    case 'skills':
      return r.skills.some((g) => g.items.length > 0)
    case 'projects':
      return r.projects.length > 0
    case 'certifications':
      return r.certifications.length > 0
    case 'languages':
      return r.languages.length > 0
    case 'interests':
      return Boolean(r.interests.trim())
    case 'gallery':
      return Boolean(r.gallery?.length)
  }
}

/** Version texte brut : c'est aussi ce qu'un ATS « voit » une fois le CV parsé. */
export function resumeToText(r: Resume): string {
  const t = sectionTitles(r)
  const out: string[] = []
  out.push(fullName(r).toUpperCase())
  if (r.basics.headline) out.push(r.basics.headline)
  const contact = contactParts(r)
  if (contact.length) out.push(contact.join(' | '))
  for (const k of atsSections(r)) {
    out.push('', t[k].toUpperCase())
    switch (k) {
      case 'summary':
        out.push(r.basics.summary.trim())
        break
      case 'experience':
        for (const e of r.experiences) {
          out.push(`${e.role}${e.company ? ' · ' + e.company : ''}${e.location ? ', ' + e.location : ''}`)
          const range = formatRange(e.start, e.end, e.current, r.lang)
          if (range) out.push(range)
          for (const b of e.bullets.filter((x) => x.trim())) out.push(`- ${b.trim()}`)
          out.push('')
        }
        break
      case 'education':
        for (const e of r.education) {
          out.push(`${e.degree}${e.school ? ' · ' + e.school : ''}${e.location ? ', ' + e.location : ''}`)
          const range = formatRange(e.start, e.end, false, r.lang)
          if (range) out.push(range)
          if (e.details.trim()) out.push(e.details.trim())
        }
        break
      case 'skills':
        for (const g of r.skills.filter((g) => g.items.length)) out.push(`${g.name ? g.name + ' : ' : ''}${g.items.join(', ')}`)
        break
      case 'projects':
        for (const p of r.projects) out.push(`${p.name}${p.link ? ' (' + stripProtocol(p.link) + ')' : ''}${p.description ? ' : ' + p.description : ''}`)
        break
      case 'certifications':
        for (const c of r.certifications) out.push([c.name, c.issuer, formatMonth(c.date)].filter(Boolean).join(' · '))
        break
      case 'languages':
        out.push(r.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(', '))
        break
      case 'interests':
        out.push(r.interests.trim())
        break
      case 'gallery':
        out.push((r.gallery ?? []).map((g) => g.caption).filter(Boolean).join(' | '))
        break
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
