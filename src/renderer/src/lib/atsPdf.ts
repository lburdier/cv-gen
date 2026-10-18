import type { OfferKeyword, PdfExtraction, PdfLine, SectionKey } from '../../../shared/types'
import { FIRST_PERSON, containsTerm, norm, startsWithAction, type AtsCheck, type CheckStatus } from './ats'

/**
 * Score ATS d'un CV déposé (PDF ou DOCX) : on juge ce que lit réellement un logiciel de
 * recrutement, texte extractible, ordre de lecture, intitulés, coordonnées, contenu, mots-clés.
 */

export type PdfCategory = 'read' | 'structure' | 'content' | 'keywords'
export interface PdfCheck extends Omit<AtsCheck, 'category'> {
  category: PdfCategory
}

export interface ScanLine {
  text: string
  /** Intitulé de section reconnu sur cette ligne. */
  section?: SectionKey | 'contact'
  /** Intitulé reconnu mais peu standard. */
  weak?: boolean
  page: number
}

export interface ScanReport {
  score: number
  categories: { read: number; structure: number; content: number; keywords: number | null }
  checks: PdfCheck[]
  lines: ScanLine[]
  /** Texte dans l'ordre brut du fichier (ce que lit un ATS simple). */
  rawText: string
  stats: { pages: number; words: number; fonts: string[]; producer: string; columns: boolean; bytes: number }
  sections: Partial<Record<SectionKey | 'contact', boolean>>
  contact: { email: string; phone: string; linkedin: string }
  keywords: { coverage: number; matched: OfferKeyword[]; missing: OfferKeyword[] } | null
}

const HEADINGS: [SectionKey | 'contact', string[], string[]][] = [
  ['experience', ['experience', 'experiences', 'experience professionnelle', 'experiences professionnelles', 'parcours professionnel', 'emplois', 'work experience', 'professional experience', 'employment', 'employment history', 'career history', 'stages'], ['parcours', 'carriere']],
  ['education', ['formation', 'formations', 'education', 'diplomes', 'diplome', 'etudes', 'cursus', 'academic background', 'formation academique', 'scolarite'], []],
  ['skills', ['competences', 'skills', 'competences techniques', 'technical skills', 'hard skills', 'soft skills', 'savoir faire', 'outils', 'logiciels', 'savoir etre'], ['expertise', 'atouts', 'qualites']],
  ['summary', ['profil', 'profile', 'resume', 'summary', 'professional summary', 'a propos', 'about', 'about me', 'objectif', 'presentation'], ['moi', 'qui suis je']],
  ['languages', ['langues', 'languages', 'langues etrangeres'], []],
  ['interests', ['centres d interet', 'centres d interets', 'interets', 'loisirs', 'interests', 'hobbies', 'passions'], []],
  ['certifications', ['certifications', 'certificats', 'certification', 'licences et certifications'], []],
  ['projects', ['projets', 'projects', 'projets personnels'], ['realisations', 'portfolio']],
  ['contact', ['contact', 'coordonnees', 'informations personnelles', 'contact information'], []]
]

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/
const PHONE = /(\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}|\+\d{1,3}[\s().-]*\d[\d\s().-]{7,}\d/
const LINKEDIN = /linkedin\.com\/in\/[\w-]+/i
const DATE = /\b(0[1-9]|1[0-2])\/(19|20)\d{2}\b|\b(janv|f[ée]vr|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[ée]c|jan|feb|mar|apr|may|jun|jul|aug|sep|dec)[a-zé]*\.?\s+(19|20)\d{2}\b|\b(19|20)\d{2}\s*[–\u2014-]\s*((19|20)\d{2}|pr[ée]sent|aujourd|auj|now|present|en cours)/gi
const BULLET = /^\s*[•▪◦●■◆►▸‣∙·*–\u2014-]\s*|^\s*[→✓✔]\s*/

/** Intitulé de section : ligne courte qui correspond à un nom de section connu. */
function headingOf(text: string): { key: SectionKey | 'contact'; weak: boolean } | null {
  // Numéro de section (« 01 Profil », « 2. Formation ») ignoré.
  const t = norm(text.replace(/[:✦★↗→+•|]/g, ' ')).replace(/^\d{1,2}[\s.)-]*/, '')
  if (!t || t.split(' ').length > 5) return null
  for (const [key, strong, weak] of HEADINGS) {
    if (strong.some((h) => t === h || (t.startsWith(h + ' ') && t.split(' ').length <= h.split(' ').length + 1))) return { key, weak: false }
    if (weak.some((h) => t === h)) return { key, weak: true }
  }
  return null
}

/** Lignes dans l'ordre visuel (colonne de gauche puis de droite si une gouttière est détectée). */
function visualOrder(ex: PdfExtraction): (PdfLine & { page: number })[] {
  return ex.pages.flatMap((p, i) => {
    const lines = p.lines.map((l) => ({ ...l, page: i }))
    if (p.columnAt == null) return lines
    const col = p.columnAt
    // Ce qui traverse la gouttière (en-tête pleine largeur) reste en tête.
    const spanning = lines.filter((l) => l.x < col - 2 && l.x + l.w > col + 2)
    const left = lines.filter((l) => !spanning.includes(l) && l.x + l.w <= col + 2)
    const right = lines.filter((l) => !spanning.includes(l) && l.x >= col - 2)
    return [...spanning, ...left, ...right]
  })
}

export function scanFromText(text: string, name: string, bytes: number): PdfExtraction {
  // DOCX : pas de positions ; une page fictive avec une ligne par paragraphe.
  const lines = text
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => ({ text: t, x: 0, y: i * 14, w: 400, size: 10, bold: false, order: i }))
  return {
    pages: [{ width: 595, height: Math.max(842, lines.length * 14), lines, columnAt: null, streamText: text, unknownGlyphs: 0, glyphs: text.length, images: 0 }],
    encrypted: false,
    bytes,
    title: name,
    producer: 'Document Word',
    fonts: [],
    fontsWithoutUnicode: 0
  }
}

export function scoreExtraction(ex: PdfExtraction, offerKeywords: OfferKeyword[] | null, opts: { docx?: boolean } = {}): ScanReport {
  const checks: PdfCheck[] = []
  const add = (category: PdfCategory, id: string, status: CheckStatus, weight: number, label: string, detail: string) => checks.push({ category, id, status, weight, label, detail })

  const ordered = visualOrder(ex)
  const lines: ScanLine[] = ordered.map((l) => {
    const h = l.text.length < 60 ? headingOf(l.text) : null
    return { text: l.text, page: l.page, ...(h ? { section: h.key, weak: h.weak } : {}) }
  })
  const full = lines.map((l) => l.text).join('\n')
  const fullNorm = norm(full)
  const words = full.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
  const pages = ex.pages.length
  const chars = full.replace(/\s/g, '').length
  const glyphs = ex.pages.reduce((n, p) => n + p.glyphs, 0)
  const unknown = ex.pages.reduce((n, p) => n + p.unknownGlyphs, 0) + (full.match(/[�-]/g)?.length ?? 0)
  const columns = ex.pages.some((p) => p.columnAt != null)
  const rawText = ex.pages.map((p) => p.streamText).join('\n\n')

  // ---------- Lisibilité par un robot ----------
  if (ex.encrypted) add('read', 'encrypted', 'fail', 5, 'PDF protégé', 'Le fichier est chiffré : de nombreux ATS ne peuvent pas l’ouvrir. Exportez-le sans mot de passe ni restriction.')
  add(
    'read',
    'text',
    chars > 400 ? 'pass' : chars > 80 ? 'warn' : 'fail',
    6,
    chars > 400 ? 'Texte extractible' : 'Peu ou pas de texte lisible',
    chars > 400
      ? `${words} mots lus directement dans le fichier : le texte est réel, pas une image.`
      : 'Le CV semble être une image (scan, export Canva en image, capture) : un ATS ne lira presque rien. Exportez-le en PDF texte.'
  )
  const scanned = ex.pages.filter((p) => p.lines.reduce((n, l) => n + l.text.length, 0) < 40 && p.images > 0).length
  if (scanned) add('read', 'scanned', 'fail', 4, `${scanned} page${scanned > 1 ? 's' : ''} en image`, 'Ces pages ne contiennent que des images : leur contenu est invisible pour un ATS.')
  const badRatio = glyphs ? unknown / glyphs : 0
  add(
    'read',
    'glyphs',
    badRatio < 0.005 && !ex.fontsWithoutUnicode ? 'pass' : badRatio < 0.03 ? 'warn' : 'fail',
    4,
    badRatio < 0.005 && !ex.fontsWithoutUnicode ? 'Caractères correctement encodés' : 'Caractères illisibles',
    badRatio < 0.005 && !ex.fontsWithoutUnicode
      ? 'Chaque lettre se convertit en texte (accents compris).'
      : `${Math.round(badRatio * 1000) / 10} % des caractères ne se convertissent pas en texte (police sans table Unicode) : réexportez avec une police standard.`
  )
  if (!opts.docx)
    add(
      'read',
      'columns',
      columns ? 'warn' : 'pass',
      4,
      columns ? 'Mise en page en colonnes' : 'Lecture en une colonne',
      columns
        ? 'Deux colonnes détectées : certains ATS lisent ligne par ligne et mélangent les colonnes (voir « Ordre brut »). Gardez une version une colonne pour les candidatures en ligne.'
        : 'Ordre de lecture linéaire, sans risque de mélange.'
    )
  // Lignes où deux blocs côte à côte se retrouvent fusionnés à la lecture.
  const merged = ex.pages.reduce((n, p) => n + p.lines.filter((l) => p.lines.some((o) => o !== l && Math.abs(o.y - l.y) < 2 && Math.abs(o.x - l.x) > 120)).length, 0)
  if (!columns && merged > 6 && !opts.docx)
    add('read', 'side', 'warn', 2, 'Blocs côte à côte', `${merged} lignes partagent la même hauteur avec un autre bloc (tableau, grille de compétences) : leur ordre de lecture peut se mélanger.`)
  add('read', 'pages', pages <= 2 ? 'pass' : pages === 3 ? 'warn' : 'fail', 2, `${pages} page${pages > 1 ? 's' : ''}`, pages <= 2 ? 'Longueur adaptée.' : 'Visez 1 à 2 pages : les recruteurs survolent, les ATS tronquent parfois.')
  const fontsCount = ex.fonts.map((f) => f.replace(/[-,](Bold|Italic|Regular|Medium|Semi.*|Light|Black|Oblique).*$/i, '')).filter((v, i, a) => a.indexOf(v) === i).length
  if (!opts.docx)
    add('read', 'fonts', fontsCount <= 3 ? 'pass' : 'warn', 1, `${fontsCount || 'Aucune'} famille${fontsCount > 1 ? 's' : ''} de polices`, fontsCount <= 3 ? 'Typographie sobre.' : 'Beaucoup de polices différentes : simplifiez pour une lecture plus fiable.')
  if (ex.bytes > 4 * 1024 * 1024) add('read', 'size', 'warn', 1, 'Fichier lourd', `${(ex.bytes / 1024 / 1024).toFixed(1)} Mo : certaines plateformes refusent au-delà de 2 à 5 Mo. Compressez les images.`)

  // ---------- Structure ----------
  const sections: ScanReport['sections'] = {}
  for (const l of lines) if (l.section) sections[l.section] = true
  const weak = lines.filter((l) => l.weak).map((l) => `« ${l.text} »`)
  add('structure', 'sec-exp', sections.experience ? 'pass' : 'fail', 4, 'Section Expérience', sections.experience ? 'Intitulé reconnu.' : 'Aucun intitulé « Expérience professionnelle » reconnu : l’ATS risque de ne pas classer votre parcours.')
  add('structure', 'sec-edu', sections.education ? 'pass' : 'warn', 3, 'Section Formation', sections.education ? 'Intitulé reconnu.' : 'Ajoutez un intitulé « Formation » : de nombreux filtres portent sur le diplôme.')
  add('structure', 'sec-skills', sections.skills ? 'pass' : 'warn', 3, 'Section Compétences', sections.skills ? 'Intitulé reconnu.' : 'Ajoutez une section « Compétences » avec les mots-clés de votre métier.')
  add('structure', 'sec-summary', sections.summary ? 'pass' : 'warn', 1, 'Profil / résumé', sections.summary ? 'Accroche présente.' : 'Une accroche de 3 à 4 phrases aide l’ATS et le recruteur à situer votre profil.')
  if (weak.length) add('structure', 'weak', 'warn', 2, 'Intitulés peu standards', `${weak.join(', ')} : préférez « Profil », « Expérience professionnelle », « Compétences », « Formation ».`)
  const email = EMAIL.exec(full)?.[0] ?? ''
  const phone = PHONE.exec(full)?.[0] ?? ''
  const linkedin = LINKEDIN.exec(full)?.[0] ?? ''
  add('structure', 'email', email ? 'pass' : 'fail', 3, 'E-mail', email ? email : 'Aucune adresse e-mail lisible : le recruteur ne pourra pas vous répondre.')
  add('structure', 'phone', phone ? 'pass' : 'warn', 2, 'Téléphone', phone ? phone.trim() : 'Aucun numéro lisible.')
  add('structure', 'linkedin', linkedin ? 'pass' : 'warn', 1, 'Profil LinkedIn', linkedin || 'Ajoutez l’URL de votre profil LinkedIn.')
  if (email && !opts.docx) {
    const page = ex.pages.find((p) => p.lines.some((l) => l.text.includes(email)))
    const line = page?.lines.find((l) => l.text.includes(email))
    if (page && line && (line.y < page.height * 0.035 || line.y > page.height * 0.965))
      add('structure', 'margin', 'warn', 2, 'Coordonnées en marge', 'L’e-mail est dans l’en-tête ou le pied de page du document : certains ATS ignorent ces zones. Placez-le dans le corps du CV.')
  }
  const dates = full.match(DATE)?.length ?? 0
  add('structure', 'dates', dates >= 2 ? 'pass' : 'warn', 2, `Dates : ${dates}`, dates >= 2 ? 'Périodes lisibles (MM/AAAA ou mois et année).' : 'Datez chaque expérience au format MM/AAAA – MM/AAAA.')

  // ---------- Contenu ----------
  add('content', 'length', words >= 250 && words <= 950 ? 'pass' : words < 150 || words > 1300 ? 'fail' : 'warn', 2, `Longueur : ${words} mots`, words < 250 ? 'CV un peu court : détaillez vos réalisations.' : words > 950 ? 'CV long : resserrez sur l’essentiel.' : 'Longueur idéale (250 à 950 mots).')
  // Puces : lignes à puce, ou lignes indentées de la section Expérience.
  const items: string[] = []
  let inExp = false
  let baseX = Infinity
  for (const l of ordered) {
    const h = l.text.length < 60 ? headingOf(l.text) : null
    if (h) {
      inExp = h.key === 'experience' || h.key === 'projects'
      baseX = Infinity
      continue
    }
    if (!inExp) continue
    baseX = Math.min(baseX, l.x)
    const isItem = BULLET.test(l.text) || (!opts.docx && l.x > baseX + 6)
    const clean = l.text.replace(BULLET, '').trim()
    if (isItem && (BULLET.test(l.text) || !items.length || /[.;!]$/.test(items[items.length - 1]) || /^[A-ZÉÈÀÂÎÔÛÇ]/.test(clean))) items.push(clean)
    else if (isItem && items.length) items[items.length - 1] += ' ' + clean
  }
  const bulletCount = items.length
  add('content', 'bullets', bulletCount >= 6 ? 'pass' : bulletCount >= 3 ? 'warn' : 'fail', 2, `Réalisations listées : ${bulletCount}`, bulletCount >= 6 ? 'Expériences détaillées en puces.' : 'Détaillez chaque poste en 3 à 5 puces : action + résultat.')
  if (bulletCount) {
    const verbs = items.filter(startsWithAction).length / bulletCount
    add('content', 'verbs', verbs >= 0.5 ? 'pass' : verbs >= 0.25 ? 'warn' : 'fail', 2, `Verbes d’action : ${Math.round(verbs * 100)} %`, verbs >= 0.5 ? 'Puces percutantes.' : 'Commencez chaque puce par un verbe : « Conçu », « Piloté », « Réduit »…')
    const nums = items.filter((x) => /\d/.test(x)).length / bulletCount
    add('content', 'numbers', nums >= 0.3 ? 'pass' : nums >= 0.15 ? 'warn' : 'fail', 2, `Résultats chiffrés : ${Math.round(nums * 100)} %`, nums >= 0.3 ? 'Impact mesurable.' : 'Ajoutez des chiffres (%, volumes, délais, budgets) à au moins 30 % des puces.')
  }
  const fp = FIRST_PERSON.test(full)
  add('content', 'pronoun', fp ? 'warn' : 'pass', 1, 'Style impersonnel', fp ? 'Évitez « je », « mon », « nous » : style télégraphique attendu.' : 'Aucune première personne détectée.')

  // ---------- Mots-clés ----------
  let keywords: ScanReport['keywords'] = null
  if (offerKeywords?.length) {
    const matched = offerKeywords.filter((k) => containsTerm(fullNorm, k.term))
    const missing = offerKeywords.filter((k) => !matched.includes(k))
    const total = offerKeywords.reduce((s, k) => s + k.importance, 0)
    const got = matched.reduce((s, k) => s + k.importance, 0)
    const coverage = total ? Math.round((got / total) * 100) : 0
    keywords = { coverage, matched, missing }
    add('keywords', 'kw', coverage >= 75 ? 'pass' : coverage >= 50 ? 'warn' : 'fail', 5, `Couverture des mots-clés : ${coverage} %`, coverage >= 75 ? 'Excellent alignement avec l’offre.' : `Il manque ${missing.length} mot(s)-clé(s) de l’offre.`)
    const critical = missing.filter((k) => k.importance === 3)
    add('keywords', 'kw-critical', critical.length === 0 ? 'pass' : critical.length <= 2 ? 'warn' : 'fail', 4, 'Exigences prioritaires', critical.length ? `Absents : ${critical.map((k) => k.term).join(', ')}.` : 'Tous les termes prioritaires figurent dans le CV.')
  }

  const scoreOf = (cat: PdfCategory) => {
    const cs = checks.filter((c) => c.category === cat)
    const total = cs.reduce((s, c) => s + c.weight, 0)
    const got = cs.reduce((s, c) => s + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0)
    return total ? Math.round((got / total) * 100) : 0
  }
  const read = scoreOf('read')
  const structure = scoreOf('structure')
  const content = scoreOf('content')
  const kw = keywords ? Math.round(scoreOf('keywords') * 0.4 + keywords.coverage * 0.6) : null
  // Un CV illisible par la machine ne peut pas avoir un bon score, quel que soit son contenu.
  let score = kw == null ? Math.round(read * 0.4 + structure * 0.3 + content * 0.3) : Math.round(read * 0.3 + structure * 0.2 + content * 0.2 + kw * 0.3)
  if (chars <= 80 || ex.encrypted) score = Math.min(score, 15)

  return {
    score,
    categories: { read, structure, content, keywords: kw },
    checks,
    lines,
    rawText,
    stats: { pages, words, fonts: ex.fonts, producer: ex.producer, columns, bytes: ex.bytes },
    sections,
    contact: { email, phone, linkedin },
    keywords
  }
}
