// Import local d'un CV (sans IA) : à partir des lignes d'un PDF (positions, tailles, gras) ou du texte
// d'un Word, retrouve l'identité, les coordonnées et les rubriques, puis découpe expériences, formations,
// compétences, langues, certifications et projets. Fidèle au texte : rien n'est reformulé ni inventé.
import type { Basics, Certification, Education, Experience, ImportedResume, LanguageItem, PdfExtraction, Project, SectionKey, SkillGroup } from './types'

export interface ParseLine {
  text: string
  size: number
  bold: boolean
  /** Ligne en retrait (puce sans symbole dans le PDF) ou commençant par un symbole de puce. */
  bullet?: boolean
  /** Abscisse dans la page (PDF seulement) : sert à repérer les puces sans symbole, en retrait. */
  x?: number
  /** Ligne située dans le haut de la première page (zone de l'identité). */
  top?: boolean
}

type Key = SectionKey | 'contact' | 'other'

const uid = () => Math.random().toString(36).slice(2, 10)

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'ʼ]/g, ' ')
    .replace(/[^a-z0-9+#.\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const HEADINGS: [Key, string[]][] = [
  ['experience', ['experience', 'experiences', 'experience professionnelle', 'experiences professionnelles', 'parcours professionnel', 'parcours', 'emplois', 'emploi', 'work experience', 'professional experience', 'experience pro', 'employment', 'employment history', 'career history', 'carriere', 'stages', 'stage', 'missions', 'experiences et stages', 'historique professionnel']],
  ['education', ['formation', 'formations', 'education', 'diplomes', 'diplome', 'etudes', 'cursus', 'academic background', 'formation academique', 'scolarite', 'diplomes et formations', 'formations et diplomes', 'parcours academique', 'parcours scolaire']],
  ['skills', ['competences', 'skills', 'competences techniques', 'technical skills', 'hard skills', 'soft skills', 'savoir faire', 'savoir-faire', 'outils', 'logiciels', 'savoir etre', 'savoir-etre', 'expertise', 'expertises', 'atouts', 'qualites', 'stack', 'stack technique', 'technologies', 'tools', 'core skills', 'key skills', 'competences cles', 'informatique', 'outils et logiciels', 'competences techniques et outils']],
  ['summary', ['profil', 'profile', 'resume', 'summary', 'professional summary', 'a propos', 'a propos de moi', 'about', 'about me', 'objectif', 'objectif professionnel', 'presentation', 'qui suis-je', 'qui suis je', 'en bref', 'profil professionnel']],
  ['languages', ['langues', 'languages', 'langues etrangeres', 'langue']],
  ['interests', ['centres d interet', 'centres d interets', 'centre d interet', 'centres interet', 'interets', 'loisirs', 'interests', 'hobbies', 'passions', 'activites', 'activites extra-professionnelles', 'engagements', 'benevolat', 'loisirs et interets']],
  ['certifications', ['certifications', 'certificats', 'certification', 'licences et certifications', 'licenses certifications', 'licenses and certifications', 'habilitations']],
  ['projects', ['projets', 'projects', 'projets personnels', 'realisations', 'portfolio', 'projets academiques', 'side projects', 'personal projects', 'projets cles']],
  ['contact', ['contact', 'coordonnees', 'informations personnelles', 'contact information', 'infos', 'informations', 'details', 'personal details', 'me contacter', 'liens']],
  ['other', ['references', 'publications', 'prix', 'distinctions', 'awards', 'reconnaissances', 'permis', 'rendus', 'galerie']]
]

/** Intitulé de rubrique : ligne courte correspondant à un nom de rubrique connu (numéro et pictogrammes ignorés). */
export function headingKey(text: string): Key | null {
  const t = norm(text.replace(/[:✦★↗→+•|_]/g, ' '))
    .replace(/^\d{1,2}[\s.)-]*/, '')
    .replace(/\s*[.-]+$/, '')
  if (!t || t.split(' ').length > 5 || t.length > 42) return null
  for (const [key, names] of HEADINGS) if (names.some((h) => t === h || t === h + 's')) return key
  return null
}

// ---------- Motifs ----------

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const PHONE = /(?:\+33\s?\(?0?\)?\s?|0)[1-9](?:[\s.-]?\d{2}){4}|\+\d{1,3}[\s().-]*\d[\d\s().-]{7,}\d/
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w%-]+\/?/i
const GITHUB = /(?:https?:\/\/)?github\.com\/[\w-]+\/?/i
const URL = /(?:https?:\/\/)?(?:www\.)?[a-z0-9][\w-]*(?:\.[\w-]+)*\.(?:com|fr|io|dev|net|org|me|art|design|studio|eu|co|app|site|portfolio|xyz|be|ch|ca)(?:\/[^\s|,;]*)?/i
const BULLET = /^\s*(?:[•▪◦●■◆►▸‣∙·*–—✓✔→➜➤-]|\d{1,2}[.)])\s+/
/** Séparateurs forts : cellules d'une même ligne, barres, points médians. */
const CELL = ' | '
const STRONG = /\s* \| \s*|\s+[|·•]\s+|\s*\|\s*/
/** Séparateurs faibles (tirets) : seulement pour « Poste — Entreprise ». */
const DASH = /\s+[–—]\s+|\s+-\s+/

const MONTHS: [RegExp, number][] = [
  [/^janv|^jan/, 1],
  [/^f[eé]v|^feb/, 2],
  [/^mars|^mar/, 3],
  [/^avr|^apr/, 4],
  [/^mai|^may/, 5],
  [/^juin|^jun/, 6],
  [/^juil|^jul/, 7],
  [/^ao[uû]|^aug/, 8],
  [/^sep/, 9],
  [/^oct/, 10],
  [/^nov/, 11],
  [/^d[eé]c|^dec/, 12]
]
const MONTH_WORD = '(?:janv(?:ier)?|f[ée]vr?(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|ao[uû]t|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|d[ée]c(?:embre)?|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|october|november|dec(?:ember)?)\\.?'
const ONE_DATE = `(?:(?:0?[1-9]|1[0-2])[/.-](?:19|20)\\d{2}|${MONTH_WORD}\\s+(?:19|20)\\d{2}|(?:19|20)\\d{2}[/.-](?:0[1-9]|1[0-2])|(?:19|20)\\d{2})`
const NOW = "(?:pr[ée]sent|aujourd['’ʼ]hui|auj\\.?|actuel(?:lement)?|en cours|now|present|current|ce jour|à ce jour)"
const RANGE = new RegExp(`(?:de(?:puis)?\\s+|from\\s+|since\\s+)?(?<![\\d,.])(${ONE_DATE})(?![\\d%])(?:\\s*(?:[–—-]|à|au|to|>|→)\\s*(${ONE_DATE}|${NOW}))?`, 'i')
const NOW_RE = new RegExp(NOW, 'i')

/** « 03/2021 », « mars 2021 », « 2021-03 », « 2021 » → « 2021-03 » (mois 01 si seule l'année est connue). */
export function toYm(s: string): string {
  const t = s.trim().toLowerCase()
  let m = /^(0?[1-9]|1[0-2])[/.-]((?:19|20)\d{2})$/.exec(t)
  if (m) return `${m[2]}-${m[1].padStart(2, '0')}`
  m = /^((?:19|20)\d{2})[/.-](0[1-9]|1[0-2])$/.exec(t)
  if (m) return `${m[1]}-${m[2]}`
  m = /^([a-zéû]+)\.?\s+((?:19|20)\d{2})$/.exec(t)
  if (m) {
    const month = MONTHS.find(([re]) => re.test(m![1]))?.[1]
    return `${m[2]}-${String(month ?? 1).padStart(2, '0')}`
  }
  m = /^((?:19|20)\d{2})$/.exec(t)
  if (m) return `${m[1]}-01`
  return ''
}

/** Période trouvée dans une ligne, et la ligne sans elle. */
function findDates(text: string): { start: string; end: string; current: boolean; rest: string } | null {
  const m = RANGE.exec(text)
  if (!m) return null
  const start = toYm(m[1])
  if (!start) return null
  const current = !!m[2] && NOW_RE.test(m[2])
  const end = m[2] && !current ? toYm(m[2]) : ''
  const rest = clean(text.slice(0, m.index) + CELL + text.slice(m.index + m[0].length))
  return { start, end, current, rest }
}

/** Ligne d'en-tête qui contient une période (dates d'un poste ou d'un diplôme). */
const dated = (t: string) => {
  const d = findDates(t)
  // Une année isolée au milieu d'une phrase longue n'est pas une période.
  return !!d && (t.length < 90 || /[–—-]|\b(?:0?[1-9]|1[0-2])\/\d{4}/.test(t))
}

function clean(s: string): string {
  return s
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s|·•,;:–— -]+|[\s|·•,;:–— -]+$/g, '')
    .trim()
}

const LOCATION_HINT =
  /\b\d{5}\b|\(\d{2,3}\)|,\s*[A-ZÀ-Ý]|\b(?:France|Belgique|Suisse|Canada|Qu[ée]bec|Luxembourg|Paris|Lyon|Marseille|Toulouse|Bordeaux|Lille|Nantes|Nice|Rennes|Strasbourg|Montpellier|Grenoble|Rouen|Toulon|Dijon|Angers|Reims|Tours|Brest|Valence|Clermont|Limoges|Metz|Nancy|Caen|Orl[ée]ans|Avignon|Annecy|Gen[eè]ve|Bruxelles|Montr[ée]al|London|Berlin|Madrid|Remote|T[ée]l[ée]travail|Hybride|[ÎI]le-de-France)\b/i
const isLocation = (s: string) => s.length <= 48 && !/@|\d{2}[\s.]\d{2}|https?:/.test(s) && LOCATION_HINT.test(s)
/** Court segment en majuscule initiale (lieu probable après une entreprise : « ACME · Rennes »). */
const placeLike = (s: string) => s.split(' ').length <= 4 && /^[A-ZÀ-Ý]/.test(s) && !/\d{3,}|@/.test(s)

// ---------- Lignes d'un PDF ----------

interface Geo {
  text: string
  x: number
  y: number
  w: number
  size: number
  bold: boolean
}

/** Fusionne les morceaux d'une même ligne visuelle (intitulé à gauche, dates à droite). */
function rows(lines: Geo[]): Geo[] {
  const sorted = [...lines].sort((a, b) => a.y - b.y || a.x - b.x)
  const out: Geo[] = []
  for (const l of sorted) {
    const prev = out[out.length - 1]
    if (prev && Math.abs(l.y - prev.y) <= Math.max(2, Math.min(prev.size, l.size) * 0.3) && l.x >= prev.x) {
      const gap = l.x - (prev.x + prev.w)
      prev.text = prev.text + (gap > Math.max(prev.size, l.size) * 1.2 ? CELL : ' ') + l.text
      prev.w = Math.max(prev.x + prev.w, l.x + l.w) - prev.x
      // La taille et le gras du premier morceau (l'intitulé) priment.
      prev.bold = prev.bold || l.bold
    } else out.push({ ...l })
  }
  return out
}

const shortCaps = (t: string) => t.length <= 32 && t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t)

/** Lignes d'un PDF dans l'ordre de lecture, avec puces (retraits) et lignes coupées recollées. */
export function pdfLines(ex: PdfExtraction): ParseLine[] {
  const out: ParseLine[] = []
  ex.pages.forEach((p, pi) => {
    const all: Geo[] = p.lines.map((l) => ({ text: l.text.replace(/\s+/g, ' ').trim(), x: l.x, y: l.y, w: l.w, size: l.size, bold: l.bold })).filter((l) => l.text)
    const col = p.columnAt
    let seqs: Geo[][]
    if (col == null) seqs = [rows(all)]
    else {
      const spanning = all.filter((l) => l.x < col - 2 && l.x + l.w > col + 2)
      const left = rows(all.filter((l) => !spanning.includes(l) && l.x + l.w <= col + 2))
      const right = rows(all.filter((l) => !spanning.includes(l) && l.x >= col - 2))
      const head = rows(spanning)
      // Marge d'intitulés (« rail ») : la colonne étroite ne contient que des titres de rubrique.
      // (Une barre latérale de coordonnées a aussi des étiquettes en capitales, mais peu d'intitulés de rubrique.)
      const railOf = (a: Geo[], b: Geo[]) =>
        a.length > 0 &&
        b.length > a.length * 2 &&
        a.filter((l) => headingKey(l.text)).length / a.length >= 0.5 &&
        a.filter((l) => headingKey(l.text) || shortCaps(l.text)).length / a.length >= 0.85
      if (railOf(left, right) || railOf(right, left)) {
        const [rail, body] = railOf(left, right) ? [left, right] : [right, left]
        // Titres sur deux lignes (« EXPÉRIENCE / PROFESSIONNELLE ») recollés.
        const titles: Geo[] = []
        for (const r of rail) {
          const prev = titles[titles.length - 1]
          if (prev && r.y - prev.y <= prev.size * 2 && Math.abs(r.x - prev.x) < 3 && !headingKey(r.text)) prev.text += ' ' + r.text
          else titles.push({ ...r })
        }
        const merged: Geo[] = []
        let ti = 0
        for (const b of body) {
          while (ti < titles.length && titles[ti].y <= b.y + 3) merged.push(titles[ti++])
          merged.push(b)
        }
        merged.push(...titles.slice(ti))
        seqs = [[...head, ...merged]]
      } else seqs = [[...head, ...left], right]
    }
    for (const seq of seqs) out.push(...flow(seq, pi === 0 ? p.height * 0.3 : -1))
  })
  return out
}

/** Puces par retrait et lignes coupées recollées, dans une colonne. */
function flow(seq: Geo[], topLimit: number): ParseLine[] {
  if (!seq.length) return []
  const sizes = seq.map((l) => l.size).sort((a, b) => a - b)
  const body = sizes[Math.floor(sizes.length / 2)]
  const bodyLines = seq.filter((l) => Math.abs(l.size - body) <= 0.8 && !headingKey(l.text))
  const margin = Math.min(...(bodyLines.length ? bodyLines : seq).map((l) => l.x))
  const right = Math.max(...seq.map((l) => l.x + l.w))
  const width = right - margin
  const out: (ParseLine & { g: Geo })[] = []
  for (const l of seq) {
    const marker = BULLET.test(l.text)
    const heading = !!headingKey(l.text)
    const prev = out[out.length - 1]
    if (prev && !heading && !headingKey(prev.text) && !marker) {
      const p = prev.g
      const gap = l.y - p.y
      const sameStyle = Math.abs(l.size - p.size) < 0.6
      const fullLine = p.x + p.w >= right - Math.max(28, width * 0.1)
      const aligned = Math.abs(l.x - p.x) < 3 || (prev.bullet && l.x >= p.x - 1 && l.x <= p.x + 14)
      const hyphen = /[-/]$/.test(p.text) && /^[a-z0-9]/.test(l.text)
      // Pas de recollage devant une ligne « Catégorie : … » ou une période seule (« 03/2021 – Présent »).
      const newItem = /^[^:]{2,40}\s:\s/.test(l.text) || (dated(l.text) && l.text.length < 32)
      if (gap > 0 && gap <= p.size * 1.9 && sameStyle && ((fullLine && aligned && !newItem) || hyphen) && !p.text.includes(CELL)) {
        prev.text += (hyphen ? '' : ' ') + l.text
        prev.g = { ...l, x: p.x, w: Math.max(p.x + p.w, l.x + l.w) - p.x }
        continue
      }
    }
    out.push({ text: l.text, size: l.size, bold: l.bold, bullet: marker, x: l.x, top: topLimit > 0 && l.y < topLimit, g: l })
  }
  return out.map(({ g: _g, ...l }) => l)
}

export function textLines(text: string): ParseLine[] {
  return text
    .split(/\r?\n/)
    .map((t) => t.replace(/\t+/g, CELL).replace(/ {3,}/g, CELL).trim())
    .filter(Boolean)
    .map((t, i) => ({ text: t, size: 10, bold: false, bullet: BULLET.test(t), top: i < 8 }))
}

// ---------- Analyse ----------

export function parseResume(input: ParseLine[]): ImportedResume {
  const lines = input
    .map((l) => ({ ...l, text: l.text.replace(/[ \t]+/g, ' ').trim() }))
    .filter((l) => l.text && !/^(page\s*)?\d{1,2}\s*(\/|sur|of)\s*\d{1,2}$/i.test(l.text))
  const sizes = lines.map((l) => l.size).sort((a, b) => a - b)
  const body = sizes[Math.floor(sizes.length / 2)] || 10
  const all = lines.map((l) => l.text.split(CELL).join(' | ')).join('\n')

  // Rubriques : en-tête (avant le premier intitulé), puis un bloc par intitulé reconnu.
  const blocks: { key: Key; lines: ParseLine[] }[] = [{ key: 'contact', lines: [] }]
  for (const l of lines) {
    const k = headingKey(l.text)
    if (k) blocks.push({ key: k, lines: [] })
    else blocks[blocks.length - 1].lines.push(l)
  }
  const head = blocks[0].lines
  const of = (k: Key) => blocks.filter((b) => b.key === k).flatMap((b) => b.lines)

  const basics = parseBasics(lines, head, of('contact'), all, body)
  // Sans intitulé « Profil », le paragraphe de présentation est souvent dans l'en-tête.
  let summary = paragraph(of('summary'))
  if (!summary) summary = paragraph([...head, ...of('contact')].filter((l) => l.text.length > 110 && !EMAIL.test(l.text) && !PHONE.test(l.text)))
  basics.summary = summary

  const french = (all.match(/\b(et|les|des|avec|pour|dans|une)\b/gi) ?? []).length
  const english = (all.match(/\b(and|the|with|for|in|of)\b/gi) ?? []).length

  return {
    lang: english > french * 1.2 ? 'en' : 'fr',
    basics,
    experiences: entries(of('experience'), body).map(toExperience).filter((e) => e.role || e.company),
    education: entries(of('education'), body).map(toEducation).filter((e) => e.degree || e.school),
    skills: parseSkills(of('skills')),
    projects: entries(of('projects'), body).map(toProject).filter((p) => p.name || p.description),
    certifications: entries(of('certifications'), body).flatMap(toCertifications).filter((c) => c.name),
    languages: parseLanguages(of('languages')),
    interests: of('interests')
      .map((l) => l.text.replace(BULLET, '').split(CELL).join(', '))
      .join(', ')
      .replace(/\s*,\s*,/g, ',')
      .replace(/\.$/, '')
      .trim()
  }
}

function paragraph(ls: ParseLine[]): string {
  return ls
    .map((l) => l.text.replace(BULLET, '').split(CELL).join(' '))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const LABEL = /^(t[ée]l[ée]phone|t[ée]l\.?|phone|mobile|portable|e-?mail|courriel|mail|ville|adresse|address|localisation|location|lieu|domicile|site|site web|web|website|portfolio|linkedin|github|mobilit[ée]|permis|n[ée]e? le|[âa]ge)\s*:?\s*/i

function parseBasics(lines: ParseLine[], head: ParseLine[], contact: ParseLine[], all: string, body: number): Basics {
  const b: Basics = { firstName: '', lastName: '', headline: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', summary: '' }
  const flat = all.replace(/\s*\n\s*/g, '\n')
  b.email = EMAIL.exec(flat)?.[0] ?? ''
  b.phone = (PHONE.exec(flat)?.[0] ?? '').trim()
  b.linkedin = (LINKEDIN.exec(flat)?.[0] ?? '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  b.github = (GITHUB.exec(flat)?.[0] ?? '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  const emailDomain = (b.email.split('@')[1] ?? '').toLowerCase()
  for (const m of flat.matchAll(new RegExp(URL.source, 'gi'))) {
    const u = m[0].replace(/[.)]+$/, '')
    const before = flat[m.index! - 1]
    if (/linkedin|github|instagram|behance|artstation|dribbble|youtube|vimeo/i.test(u) || before === '@' || (emailDomain && u.toLowerCase() === emailDomain)) continue
    if (!/\//.test(u) && !/^www\./i.test(u) && /^\w+\.(js|ts|net|io)$/i.test(u) && !/^[a-z]+\.(io|dev)$/.test(u)) continue
    b.website = u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    break
  }

  const isContact = (t: string) => EMAIL.test(t) || PHONE.test(t) || LINKEDIN.test(t) || GITHUB.test(t) || (URL.test(t) && t.split(' ').length <= 3) || LABEL.test(t)
  const topLines = lines.filter((l) => l.top)
  const pool = topLines.length ? topLines : head.length ? head : contact

  // Nom : la plus grande ligne du haut de page, de 1 à 5 mots sans chiffre ; nom sur deux lignes recollé.
  const nameOk = (t: string) => !isContact(t) && !/\d/.test(t) && /^[\p{L}' .-]+$/u.test(t) && t.split(' ').length <= 5 && !headingKey(t) && !/^(cv|curriculum|portfolio|resume)\b/i.test(t)
  // Seule la première cellule compte : les coordonnées alignées à droite du nom sont ignorées.
  const firstCell = (l: ParseLine) => ({ ...l, text: clean(l.text.split(CELL)[0]) })
  const cells = pool.map(firstCell)
  const cands = cells.slice(0, 14).filter((l) => nameOk(l.text))
  const maxSize = Math.max(0, ...cands.map((l) => l.size))
  const big = cands.filter((l) => l.size >= maxSize - 0.3)
  let nameText = ''
  if (big.length) {
    const i0 = cells.indexOf(big[0])
    const next = cells[i0 + 1]
    nameText = big[0].text
    if (nameText.split(' ').length === 1 && next && big.includes(next)) nameText += ' ' + next.text
  }
  if (nameText && maxSize > body * 1.15 || nameText.split(' ').length >= 2) {
    const words = nameText.split(' ').filter(Boolean)
    const caps = words.filter((w) => w.length > 1 && w === w.toUpperCase())
    if (caps.length && caps.length < words.length) {
      b.lastName = caps.map(title).join(' ')
      b.firstName = words.filter((w) => !caps.includes(w)).join(' ')
    } else {
      b.firstName = title(words[0] ?? '')
      b.lastName = words
        .slice(1)
        .map((w) => (w === w.toUpperCase() ? title(w) : w))
        .join(' ')
    }
  }

  // Titre : première ligne après le nom qui n'est ni une coordonnée, ni un lieu, ni un intitulé.
  const nameIdx = cells.findIndex((l) => !!l.text && nameText.startsWith(l.text))
  const after = pool
    .slice(nameIdx + 1, nameIdx + 6)
    .find((l) => !isContact(l.text) && !isLocation(l.text) && !nameText.includes(l.text) && l.text.length <= 110 && l.text.length >= 3 && !headingKey(l.text) && !/^(cv|portfolio)\b/i.test(l.text))
  b.headline = after ? clean(after.text.split(CELL)[0]) : ''

  // Ville : valeur suivant une étiquette « Ville / Adresse », sinon segment de coordonnées qui ressemble à un lieu.
  const scan = [...pool, ...head, ...contact]
  for (let i = 0; i < scan.length && !b.location; i++) {
    const t = scan[i].text
    if (/^(ville|adresse|address|localisation|location|lieu|domicile)\s*:?$/i.test(t) && scan[i + 1]) b.location = clean(scan[i + 1].text)
  }
  for (const l of scan) {
    if (b.location) break
    for (const part of l.text.split(/\s*[|·•;]\s*| \| /)) {
      const p = clean(part.replace(EMAIL, '').replace(PHONE, '').replace(LABEL, ''))
      if (p && p !== b.headline && isLocation(p) && !URL.test(p)) {
        b.location = p
        break
      }
    }
  }
  return b
}

const title = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()

interface Entry {
  head: ParseLine[]
  bullets: string[]
}

/** Découpe une rubrique en entrées : en-tête (poste, entreprise, dates) puis puces. */
function entries(ls: ParseLine[], body: number): Entry[] {
  const out: Entry[] = []
  let cur: Entry | null = null
  let lastWasBullet = false
  const xs = ls.map((l) => l.x).filter((x): x is number => x != null)
  const minX = xs.length ? Math.min(...xs) : 0
  for (const l of ls) {
    const text = l.text.replace(BULLET, '').trim()
    if (!text) continue
    const titleLike = (l.size > body + 0.25 || l.bold) && text.length < 90
    // Retrait par rapport à l'en-tête de l'entrée (PDF) : puce dont le symbole n'est pas du texte.
    const headX = cur?.head[0]?.x ?? minX
    const indented = l.x != null && l.x > headX + 6 && Math.abs(l.size - body) <= 0.8
    const marked = l.bullet || BULLET.test(l.text)
    // Une année dans une phrase de puce (« … en 2025 ») n'en fait pas un en-tête daté.
    const hasDate = dated(text) && !((marked || indented) && text.length > 45 && !RANGE.exec(text)?.[2])
    const bullet = (marked || indented) && !hasDate && !titleLike
    if (bullet) {
      if (!cur) cur = pushNew(out)
      cur.bullets.push(text)
      lastWasBullet = true
      continue
    }
    // Phrase longue sans puce dans une entrée : description.
    // (Word : les puces n'ont souvent ni symbole ni retrait, mais ce sont des phrases.)
    if (cur && cur.head.length && !hasDate && !titleLike && (text.length > 95 || (text.length > 40 && /[.!]$/.test(text)))) {
      cur.bullets.push(text)
      lastWasBullet = true
      continue
    }
    const curHasDate = !!cur?.head.some((h) => dated(h.text))
    const startNew = !cur || lastWasBullet || (hasDate && curHasDate) || (titleLike && cur.head.length >= 2) || cur.head.length >= 4
    if (startNew) cur = pushNew(out)
    cur!.head.push({ ...l, text })
    lastWasBullet = false
  }
  return out.filter((e) => e.head.length || e.bullets.length)
}

function pushNew(out: Entry[]): Entry {
  const e: Entry = { head: [], bullets: [] }
  out.push(e)
  return e
}

/** En-tête d'entrée : lignes découpées en morceaux (dates retirées) et période. */
function headInfo(head: ParseLine[], splitDash: boolean) {
  let start = ''
  let end = ''
  let current = false
  const lines: string[][] = []
  for (const h of head) {
    let t = h.text
    const d = dated(t) ? findDates(t) : null
    if (d && !start) {
      start = d.start
      end = d.end
      current = d.current
      t = d.rest
    }
    let parts = t.split(STRONG).map(clean).filter(Boolean)
    if (splitDash && parts.length === 1) parts = parts[0].split(DASH).map(clean).filter(Boolean)
    if (parts.length) lines.push(parts)
  }
  return { lines, start, end, current }
}

const JOB =
  /(d[ée]velopp|ing[ée]nieur|engineer|manager|chef|cheffe|responsable|consultant|designer|analyste|analyst|assistant|charg[ée]|directeur|directrice|director|stagiaire|stage|alternan|intern|technicien|lead|head|artiste|artist|commercial|comptable|juriste|avocat|infirmi|professeur|enseignant|teacher|op[ée]rat|vendeu|conseill|coordinat|architecte|product|owner|data|devops|sre|admin|gestionnaire|agent|employ|serveu|cuisin|r[ée]dact|journalist|photograph|graphiste|animat|formateur|auditeur|contr[ôo]leur|acheteu|logisticien|m[ée]decin|pharmacien|[ée]ducat|cadre|freelance|ind[ée]pendant|fondat|founder|ceo|cto|cpo)/i

function toExperience(e: Entry): Experience {
  const h = headInfo(e.head, true)
  const flat = h.lines.flat()
  let role = h.lines[0]?.[0] ?? ''
  // « Poste — Entreprise » sur une ligne, sinon l'entreprise sur la ligne suivante.
  const second = h.lines[0]?.[1]
  let company = (second && !isLocation(second) ? second : '') || h.lines[1]?.[0] || ''
  let location = ''
  // Lieu : segment qui ressemble à une ville, ou celui qui suit l'entreprise sur sa ligne.
  const companyLine = h.lines.find((l) => l.includes(company))
  for (const p of flat) if (!location && p !== role && p !== company && isLocation(p)) location = p
  if (!location && companyLine) {
    const nxt = companyLine[companyLine.indexOf(company) + 1]
    if (nxt && placeLike(nxt) && !JOB.test(nxt)) location = nxt
  }
  if (!company) {
    const m = /^(.+?)\s+(?:chez|at|@|pour|for)\s+(.+)$/i.exec(role)
    if (m) [role, company] = [clean(m[1]), clean(m[2])]
  }
  // Entreprise en premier (« ACME — Développeur ») : le poste contient un mot-métier.
  if (company && JOB.test(company) && !JOB.test(role)) [role, company] = [company, role]
  const used = new Set([role, company, location])
  const extra = flat.filter((p) => !used.has(p) && p.length > 40)
  return { id: uid(), role, company, location, start: h.start, end: h.end, current: h.current, bullets: [...extra, ...e.bullets] }
}

const SCHOOL = /(universit|[ée]cole|school|lyc[ée]e|institut|iut|\bens\b|ynov|epitech|epita|insa|hec|essec|sciences po|college|coll[èe]ge|academy|acad[ée]mie|campus|cnam|afpa|conservatoire|\biae\b|sorbonne|polytechnique|centrale|mines|business school|\bcfa\b|greta|openclassrooms|\bgobelins\b|\bisart\b|\becv\b|\bbellecour\b|\bdigital\b)/i

function toEducation(e: Entry): Education {
  const h = headInfo(e.head, false)
  const flat = h.lines.flat()
  let degree = h.lines[0]?.[0] ?? ''
  let school = flat.find((p) => p !== degree && SCHOOL.test(p)) ?? h.lines[1]?.[0] ?? h.lines[0]?.[1] ?? ''
  if (SCHOOL.test(degree) && school && !SCHOOL.test(school)) [degree, school] = [school, degree]
  if (!school) {
    const parts = degree.split(DASH)
    const i = parts.findIndex((p) => SCHOOL.test(p))
    if (i > 0) {
      school = clean(parts[i])
      degree = clean(parts.slice(0, i).join(' — '))
    }
  }
  let location = flat.find((p) => p !== degree && p !== school && isLocation(p)) ?? ''
  const schoolLine = h.lines.find((l) => l.includes(school))
  if (!location && schoolLine) {
    const nxt = schoolLine[schoolLine.indexOf(school) + 1]
    if (nxt && placeLike(nxt)) location = nxt
  }
  const used = new Set([degree, school, location])
  // Une date seule sur un diplôme est l'année d'obtention.
  const single = h.start && !h.end && !h.current
  return {
    id: uid(),
    degree,
    school,
    location,
    start: single ? '' : h.start,
    end: single ? h.start : h.end,
    details: [...flat.filter((p) => !used.has(p)), ...e.bullets].join(' · ')
  }
}

function toProject(e: Entry): Project {
  const h = headInfo(e.head, true)
  const flat = h.lines.flat()
  const isLink = (s: string) => URL.test(s) && s.split(' ').length === 1
  const link = (flat.find(isLink) ?? e.bullets.find(isLink) ?? '').replace(/^https?:\/\//, '')
  const name = flat.find((p) => p !== link) ?? ''
  const desc = [...flat.filter((p) => p !== name && p !== link), ...e.bullets.filter((b) => b.replace(/^https?:\/\//, '') !== link)]
  return { id: uid(), name, link, description: desc.join(' ') }
}

function toCertifications(e: Entry): Certification[] {
  // Une ligne par certification (« Nom — Organisme — 2023 ») ou en-tête + organisme sur la ligne suivante.
  if (e.head.length === 0) return e.bullets.map((b) => toCertification([b]))
  const h = headInfo(e.head, true)
  const date = h.start
  const first = h.lines[0] ?? []
  const issuer = first[1] ?? h.lines[1]?.[0] ?? ''
  return [{ id: uid(), name: first[0] ?? '', issuer, date }, ...e.bullets.map((b) => toCertification([b]))]
}

function toCertification(texts: string[]): Certification {
  const t = texts.join(' ')
  const d = findDates(t)
  const parts = (d ? d.rest : t).split(STRONG).flatMap((p) => p.split(DASH)).map(clean).filter(Boolean)
  return { id: uid(), name: parts[0] ?? '', issuer: parts[1] ?? '', date: d?.start ?? '' }
}

function parseSkills(ls: ParseLine[]): SkillGroup[] {
  const groups: SkillGroup[] = []
  let loose: SkillGroup | null = null
  let pending: SkillGroup | null = null
  for (const l of ls) {
    const t = l.text.replace(BULLET, '').trim()
    if (!t) continue
    const m = /^([^:]{2,40})\s*:\s*(.+)$/.exec(t)
    if (m) {
      groups.push({ id: uid(), name: clean(m[1]), items: splitItems(m[2]) })
      pending = null
      continue
    }
    // Sous-titre de catégorie (court, gras ou terminé par « : ») suivi d'éléments.
    if ((l.bold || /:$/.test(t)) && t.length <= 40 && !/[,·|]/.test(t)) {
      pending = { id: uid(), name: clean(t.replace(/:$/, '')), items: [] }
      groups.push(pending)
      continue
    }
    const items = splitItems(t)
    let target = pending
    if (!target) {
      if (!loose) {
        loose = { id: uid(), name: 'Compétences', items: [] }
        groups.push(loose)
      }
      target = loose
    }
    target.items.push(...items)
  }
  return groups.filter((g) => g.items.length).map((g) => ({ ...g, items: [...new Set(g.items)] }))
}

function splitItems(s: string): string[] {
  return s
    .split(/\s*[,;|·•]\s*| \| |\s+\/\s+|\s+[–—-]\s+/)
    .map((x) => clean(x.replace(/\.$/, '')))
    .filter((x) => x && x.length <= 60)
}

const LEVEL =
  /\b(natif|native|maternelle|langue maternelle|mother tongue|bilingue|bilingual|courant|fluent|professionnel|professional|interm[ée]diaire|intermediate|scolaire|notions|basic|d[ée]butant|beginner|avanc[ée]|advanced|lu,? [ée]crit,? parl[ée]|[ABC][12]|toeic\s*\d+|toefl\s*\d+|ielts\s*[\d.]+)\b/i

function parseLanguages(ls: ParseLine[]): LanguageItem[] {
  const out: LanguageItem[] = []
  const text = ls.map((l) => l.text.replace(BULLET, '').split(CELL).join(' · ')).join(' · ')
  // « Anglais (C1) · Espagnol : B2 », « Français natif / Anglais intermédiaire », une langue par ligne…
  for (const c of text.split(/\s*[,;|·•]\s*|\s+\/\s+/)) {
    const t = clean(c)
    if (!t) continue
    const m = /^([\p{L}' -]{2,30}?)\s*(?:[:(–—-]\s*|\s+)(.+?)\)?$/u.exec(t)
    if (m && LEVEL.test(m[2]) && !LEVEL.test(m[1])) out.push({ id: uid(), name: clean(m[1]), level: clean(m[2].replace(/\)$/, '')) })
    else if (LEVEL.test(t) && out.length && !out[out.length - 1].level) out[out.length - 1].level = t
    else if (/^[\p{L}' -]{2,30}$/u.test(t) && !LEVEL.test(t)) out.push({ id: uid(), name: t, level: '' })
  }
  return out.filter((x) => x.name)
}
