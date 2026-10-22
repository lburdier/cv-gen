// Mise en forme commune (aperçu, PDF, DOCX, TXT) : un seul endroit pour les
// intitulés de sections et les dates, pour que chaque export reste identique.
import type { Education, Experience, Lang, LanguageItem, Resume, SectionKey } from './types'

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
/** Retire les tirets cadratins (U+2014, l'app n'en affiche aucun) : remplacés par le séparateur donné. */
export function noDash(s: string, sep = ', '): string {
  if (!s.includes('\u2014')) return s
  return s
    .replace(/^([ \t]*)\u2014[ \t]*/gm, '$1- ') // en début de ligne : puce
    .replace(/[ \t]*\u2014[ \t]*/g, sep)
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

/** Mot de nom de fichier : sans accents ni caractères spéciaux, majuscule initiale (« jean pierre » → « Jean-Pierre »). */
function filePart(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('-')
}

/**
 * Nom de fichier propre, tel que les recruteurs l'attendent : « Prenom-Nom-CV-2026 ».
 * kind = 'CV' ou 'Lettre' ; sans nom renseigné, repli sur le titre du document.
 */
export function documentFileName(first: string, last: string, kind: 'CV' | 'Lettre', fallback = '', year = new Date().getFullYear()): string {
  const who = [filePart(first), filePart(last)].filter(Boolean).join('-')
  return [who || filePart(fallback), kind, String(year)].filter(Boolean).join('-')
}

export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')
}

/** Adresse cliquable d'un lien du CV (site, LinkedIn, portfolio, e-mail) ; '' si ce n'en est pas un. */
export function linkHref(value: string): string {
  const v = value.trim()
  if (!v || /\s/.test(v)) return ''
  if (/^mailto:|^https?:\/\//i.test(v)) return v
  if (/^[^@]+@[^@]+\.[a-z]{2,}$/i.test(v)) return `mailto:${v}`
  if (/^(www\.)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(v)) return `https://${v}`
  return ''
}

/** Longueur conseillée de l'accroche (profil) : 3 à 4 lignes, pas plus. */
export const SUMMARY_MIN = 200
export const SUMMARY_MAX = 400

/** Mobilité affichée avec son libellé (« Mobile : Lyon, Paris »), sauf si le texte le dit déjà. */
export function mobilityText(r: Resume): string {
  const m = r.basics.mobility?.trim() ?? ''
  if (!m) return ''
  if (/^(mobil|open to|available|disponible)/i.test(m)) return m
  return r.lang === 'en' ? `Mobility: ${m}` : `Mobile : ${m}`
}

/** Ligne de candidature sous le titre : ce que la personne recherche, puis où elle est mobile. */
export function pitchParts(r: Resume): string[] {
  return [r.basics.target?.trim() ?? '', mobilityText(r)].filter(Boolean)
}

/** Principaux cours de l'année (3 au plus), avec leur libellé. */
export function coursesText(e: Education, lang: Lang): string {
  const c = (e.courses ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 3)
  if (!c.length) return ''
  return lang === 'en' ? `Key courses: ${c.join(', ')}` : `Cours principaux : ${c.join(', ')}`
}

/** Détails d'une formation affichés par les modèles : mention ou spécialité, puis les principaux cours. */
export function eduDetails(e: Education, lang: Lang): string {
  return [e.details.trim(), coursesText(e, lang)].filter(Boolean).join('. ')
}

/** Niveaux du cadre européen (CECRL), seul référentiel accepté pour les langues. */
export const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export const CEFR_HINT: Record<Lang, Record<(typeof CEFR)[number], string>> = {
  fr: { A1: 'débutant', A2: 'élémentaire', B1: 'intermédiaire', B2: 'avancé', C1: 'autonome', C2: 'maîtrise' },
  en: { A1: 'beginner', A2: 'elementary', B1: 'intermediate', B2: 'upper intermediate', C1: 'advanced', C2: 'proficient' }
}
const NATIVE = /maternelle|natif|native|mother/i
/** Le niveau au format CECRL (« B2 ») : anciens libellés convertis, certification conservée (« C1, TOEIC 945 »). */
export function cefrLevel(level: string, lang: Lang = 'fr'): string {
  const v = level.trim()
  if (!v) return ''
  if (NATIVE.test(v)) return lang === 'en' ? 'Native' : 'Langue maternelle'
  const code = /([ABC][12])/i.exec(v)
  if (code) return v.replace(code[0], code[1].toUpperCase())
  const words: [RegExp, string][] = [
    [/bilingue|bilingual|ma[iî]trise|proficient/i, 'C2'],
    [/courant|fluent|autonome|advanced/i, 'C1'],
    [/professionnel|professional|avanc[ée]|upper/i, 'B2'],
    [/interm[ée]diaire|intermediate|op[ée]rationnel/i, 'B1'],
    [/notions|scolaire|[ée]l[ée]mentaire|elementary|basic|basique/i, 'A2'],
    [/d[ée]butant|beginner/i, 'A1']
  ]
  return words.find(([re]) => re.test(v))?.[1] ?? v
}

/** Langue dans laquelle le CV est rédigé : inutile de la préciser (« Français, langue maternelle » sur un CV en français). */
const CV_LANGUAGE: Record<Lang, RegExp> = { fr: /^\s*(fran[cç]ais|french)/i, en: /^\s*(anglais|english)/i }

/** Langues affichées sur le CV : sans la langue du CV, niveaux au format CECRL. */
export function cvLanguages(r: Resume): LanguageItem[] {
  return r.languages.filter((l) => !CV_LANGUAGE[r.lang].test(l.name)).map((l) => ({ ...l, level: cefrLevel(l.level, r.lang) }))
}

/** CV tel qu'il est affiché et exporté : langues filtrées et normalisées. */
export function displayResume(r: Resume): Resume {
  return { ...r, languages: cvLanguages(r) }
}

/** Missions détaillées attendues au minimum par expérience. */
export const MIN_MISSIONS = 3
/** Une mission « détaillée » : au moins ce nombre de mots (verbe + action + résultat). */
const MISSION_WORDS = 8

/** Ce qui manque à une expérience : intitulé, entreprise, ville, dates et au moins 3 missions détaillées. */
export function experienceGaps(e: Experience): string[] {
  const missions = e.bullets.filter((b) => b.trim())
  const detailed = missions.filter((b) => b.trim().split(/\s+/).length >= MISSION_WORDS).length
  return [
    !e.role.trim() && 'intitulé du poste',
    !e.company.trim() && 'entreprise',
    !e.location.trim() && 'ville',
    (!e.start || (!e.end && !e.current)) && 'dates',
    missions.length < MIN_MISSIONS && `${MIN_MISSIONS - missions.length} mission(s) de plus`,
    missions.length >= MIN_MISSIONS && detailed < MIN_MISSIONS && 'missions plus détaillées'
  ].filter((x): x is string => Boolean(x))
}

/** Exemples de savoir-être (qualités humaines) proposés dans le formulaire des compétences. */
export const SOFT_SKILLS: Record<Lang, string[]> = {
  fr: [
    'Autonomie',
    'Rigueur',
    'Esprit d’équipe',
    'Curiosité',
    'Adaptabilité',
    'Sens de l’organisation',
    'Communication',
    'Écoute',
    'Créativité',
    'Esprit d’initiative',
    'Persévérance',
    'Gestion du stress',
    'Sens du service',
    'Esprit d’analyse',
    'Pédagogie',
    'Leadership',
    'Fiabilité',
    'Diplomatie'
  ],
  en: [
    'Autonomy',
    'Attention to detail',
    'Teamwork',
    'Curiosity',
    'Adaptability',
    'Organization',
    'Communication',
    'Active listening',
    'Creativity',
    'Initiative',
    'Perseverance',
    'Stress management',
    'Customer focus',
    'Analytical thinking',
    'Teaching',
    'Leadership',
    'Reliability',
    'Diplomacy'
  ]
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
  if (pitchParts(r).length) out.push(pitchParts(r).join(' | '))
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
          if (coursesText(e, r.lang)) out.push(coursesText(e, r.lang))
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
