// Lettres de motivation : options, en-tête (destinataire, lieu et date, objet), brouillon guidé sans IA
// construit uniquement à partir du CV et de l'offre, et vérifications de qualité.
import type { CoverLetter, Lang, LetterOptions, Offer, Resume } from './types'

export const LETTER_TONES = ['professionnel et chaleureux', 'enthousiaste et dynamique', 'direct et concis', 'formel (grands groupes, secteur public)'] as const

export const LETTER_ANGLES: { id: LetterOptions['angle']; label: string; hint: string }[] = [
  { id: 'poste', label: 'Le poste', hint: 'Montrer que vous cochez les attentes de l’offre.' },
  { id: 'entreprise', label: 'L’entreprise', hint: 'Mettre en avant ce qui vous attire chez elle.' },
  { id: 'reconversion', label: 'Reconversion', hint: 'Relier votre parcours précédent au nouveau métier.' },
  { id: 'alternance', label: 'Stage / alternance', hint: 'Formation en cours, rythme, envie d’apprendre.' },
  { id: 'spontanee', label: 'Spontanée', hint: 'Sans offre : proposer votre valeur à l’entreprise.' }
]

export const LETTER_LENGTHS: { id: LetterOptions['length']; label: string; words: [number, number] }[] = [
  { id: 'courte', label: 'Courte', words: [150, 230] },
  { id: 'standard', label: 'Standard', words: [220, 380] },
  { id: 'detaillee', label: 'Détaillée', words: [380, 480] }
]

export function defaultLetterOptions(offer?: Offer): LetterOptions {
  return { tone: LETTER_TONES[0], length: 'standard', angle: offer ? 'poste' : 'spontanee', lang: 'fr', motivation: '', highlights: [] }
}

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** « Lyon, le 17 octobre 2026 » ou « Lyon, 17 October 2026 ». */
export function placeDate(place: string, isoDate: string, lang: Lang): string {
  const d = isoDate ? new Date(isoDate + 'T12:00:00') : new Date()
  const day = d.getDate()
  const when = lang === 'en' ? `${day} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}` : `${day === 1 ? '1er' : day} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
  const city = place.split(',')[0].trim()
  return city ? (lang === 'en' ? `${city}, ${when}` : `${city}, le ${when}`) : lang === 'en' ? when : `Le ${when}`
}

export function defaultSubject(offer: Offer | undefined, resume: Resume | undefined, lang: Lang): string {
  const job = offer?.analysis?.title || offer?.title || resume?.basics.headline.split(/[,·|]/)[0].trim() || ''
  if (lang === 'en') return offer ? `Application for the ${job} position` : `Spontaneous application${job ? ` (${job})` : ''}`
  return offer ? `Candidature au poste ${de(job)}` : `Candidature spontanée${job ? ` (${job})` : ''}`
}

export function defaultRecipient(offer: Offer | undefined): string {
  const company = offer?.analysis?.company || offer?.company || ''
  return company ? `Service recrutement\n${company}` : ''
}

/** Complète l'en-tête d'une lettre (lettres créées avant ces champs, ou champs vides). */
export function withHeader(l: CoverLetter, resume?: Resume, offer?: Offer): CoverLetter {
  const lang = l.options?.lang ?? 'fr'
  return {
    ...l,
    recipient: l.recipient ?? defaultRecipient(offer),
    place: l.place ?? resume?.basics.location.split(',')[0].trim() ?? '',
    date: l.date ?? new Date(l.createdAt).toISOString().slice(0, 10),
    subject: l.subject ?? defaultSubject(offer, resume, lang)
  }
}

// ---------- Brouillon guidé (sans IA) ----------

function yearsOf(r: Resume): number {
  const starts = r.experiences.map((e) => e.start).filter(Boolean).sort()
  if (!starts.length) return 0
  const y = Number(starts[0].slice(0, 4))
  return Math.max(0, new Date().getFullYear() - y)
}

const lowerFirst = (s: string) => (s && !/^[A-Z]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)
// Élisions : « poste d’ingénieur », « en tant qu’assistant ».
const vowel = (s: string) => /^[aeiouyhàâäéèêëîïôöùûü]/i.test(s)
const de = (s: string) => (vowel(s) ? `d’${s}` : `de ${s}`)
const que = (lead: string, s: string) => (vowel(s) ? `${lead} qu’${s}` : `${lead} que ${s}`)
const sentence = (s: string) => s.trim().replace(/[.;:,\s]+$/, '') + '.'

/** Puce la plus parlante d'une expérience : chiffrée de préférence. */
function bestBullet(bullets: string[]): string | undefined {
  return [...bullets].sort((a, b) => Number(/\d/.test(b)) - Number(/\d/.test(a)) || b.length - a.length)[0]
}

/** Mots-clés de l'offre présents dans le CV (les plus importants d'abord). */
export function sharedKeywords(resume: Resume, offer?: Offer): string[] {
  if (!offer?.analysis) return []
  const hay = JSON.stringify([resume.basics, resume.experiences, resume.skills, resume.education, resume.certifications]).toLowerCase()
  return offer.analysis.keywords
    .filter((k) => k.category !== 'language' && hay.includes(k.term.toLowerCase()))
    .sort((a, b) => b.importance - a.importance)
    .map((k) => k.term)
}

/**
 * Lettre construite à partir du CV et de l'offre, sans IA ni invention : chaque phrase reprend
 * un élément réel (poste, entreprise, réalisation, compétence). À personnaliser ensuite.
 */
export function draftLetter(resume: Resume, offer: Offer | undefined, o: LetterOptions): string {
  const en = o.lang === 'en'
  const name = `${resume.basics.firstName} ${resume.basics.lastName}`.trim()
  const job = offer?.analysis?.title || offer?.title || ''
  const company = offer?.analysis?.company || offer?.company || ''
  const years = yearsOf(resume)
  const headline = resume.basics.headline.split(/[,·|]/)[0].trim()
  const chosen = (o.highlights.length ? resume.experiences.filter((e) => o.highlights.includes(e.id)) : resume.experiences).slice(0, o.length === 'detaillee' ? 3 : o.length === 'courte' ? 1 : 2)
  const keywords = sharedKeywords(resume, offer).slice(0, 4)
  const skills = keywords.length ? keywords : resume.skills.flatMap((g) => g.items).slice(0, 4)
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${en ? 'and' : 'et'} ${xs[xs.length - 1]}`)
  const motivation = o.motivation.trim()
  const paras: string[] = []

  if (en) {
    const opening =
      o.angle === 'spontanee' || !offer
        ? `I am writing to offer my skills${company ? ` to ${company}` : ''} as ${headline ? `a ${headline}` : 'a candidate'}.`
        : o.angle === 'alternance'
          ? `I am applying for the ${job} position${company ? ` at ${company}` : ''} as part of my training.`
          : `I am applying for the ${job} position${company ? ` at ${company}` : ''}.`
    paras.push([opening, years >= 2 ? `With ${years} years of experience${headline ? ` as ${headline}` : ''}, I would like to bring my skills to your team.` : '', motivation].filter(Boolean).join(' '))
    const proofs = chosen.map((e) => {
      const b = bestBullet(e.bullets)
      return `At ${e.company || 'my previous employer'}, as ${e.role}${b ? `, I ${lowerFirst(sentence(b))}` : '.'}`
    })
    if (proofs.length) paras.push(proofs.join(' '))
    if (skills.length && o.length !== 'courte') paras.push(`My experience with ${list(skills)} ${offer ? 'matches what you are looking for' : 'can be useful to your projects'}, and I am used to working with demanding teams and clear goals.`)
    paras.push(`I would be glad to discuss how I can contribute${company ? ` to ${company}` : ''} in an interview.`)
    return ['Dear Hiring Manager,', ...paras, 'Yours sincerely,', name].join('\n\n')
  }

  const opening =
    o.angle === 'spontanee' || !offer
      ? `Je vous adresse ma candidature spontanée${company ? ` au sein de ${company}` : ''}${headline ? ' ' + que('en tant', lowerFirst(headline)) : ''}.`
      : o.angle === 'alternance'
        ? `Je vous propose ma candidature pour le poste ${de(lowerFirst(job))}${company ? ` chez ${company}` : ''}, dans le cadre de ma formation.`
        : o.angle === 'reconversion'
          ? `Je vous adresse ma candidature pour le poste ${de(lowerFirst(job))}${company ? ` chez ${company}` : ''}, une étape que je prépare après ${years >= 2 ? `${years} ans` : 'plusieurs années'} dans un autre métier.`
          : `Je vous adresse ma candidature pour le poste ${de(lowerFirst(job))}${company ? ` chez ${company}` : ''}.`
  // Formulations neutres (« Avec X ans d'expérience ») : pas d'accord de genre à deviner.
  const exp = years >= 2 && o.angle !== 'reconversion' ? `Avec ${years} ans d’expérience${headline ? ` comme ${lowerFirst(headline)}` : ''}, je souhaite mettre mes compétences au service de votre équipe.` : ''
  paras.push([opening, exp, motivation].filter(Boolean).join(' '))

  // Puces au participe passé (« Migré 40 services… ») → « j'ai migré… » ; sinon reprise après deux-points.
  const PARTICIPLE = /^\p{L}+(?:é|ée|és|i|is|it|u|us|ert|eint|uit|ait)(?=[\s,]|$)/u
  const said = (b: string) => (PARTICIPLE.test(b) ? `j’ai ${lowerFirst(sentence(b))}` : lowerFirst(sentence(b)))
  const proofs = chosen.map((e, i) => {
    const ranked = [...e.bullets].sort((a, b) => Number(/\d/.test(b)) - Number(/\d/.test(a)) || b.length - a.length)
    const where = e.company ? `chez ${e.company}` : 'dans mon poste précédent'
    const role = lowerFirst(e.role)
    const lead = i === 0 ? `${que('En tant', role)} ${where}` : `Auparavant, comme ${role} ${where}`
    if (!ranked[0]) return `${lead}, j’ai acquis une pratique solide du métier.`
    const first = PARTICIPLE.test(ranked[0]) ? `${lead}, ${said(ranked[0])}` : `${lead} : ${said(ranked[0])}`
    // Première expérience d'une lettre standard ou détaillée : une seconde réalisation.
    const more = i === 0 && o.length !== 'courte' && ranked[1] ? ` ${PARTICIPLE.test(ranked[1]) ? 'J’ai également ' + lowerFirst(sentence(ranked[1])) : 'Autre résultat : ' + lowerFirst(sentence(ranked[1]))}` : ''
    return first + more
  })
  if (proofs.length) paras.push(proofs.join(' '))

  if (skills.length && o.length !== 'courte') {
    const edu = resume.education[0]
    const training = edu?.degree ? ` Ma formation (${edu.degree}${edu.school ? `, ${edu.school}` : ''}) m’a donné des bases solides, que l’expérience du terrain a consolidées.` : ''
    paras.push(
      `${offer ? 'Votre offre met l’accent sur' : 'Mon parcours m’a permis de maîtriser'} ${list(skills)}${offer ? ' : ce sont des compétences que je mobilise au quotidien' : ''}.${training} J’aime travailler avec des objectifs clairs et mesurer l’impact de mon travail.`
    )
  }
  paras.push(`J’aimerais beaucoup échanger avec vous${company ? ` sur les besoins de ${company}` : ''} et vous présenter plus en détail ce que je peux apporter.`)
  return ['Madame, Monsieur,', ...paras, 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.', name].join('\n\n')
}

// ---------- Vérifications ----------

export interface LetterCheck {
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail?: string
}

const CLICHES = [
  'je me permets',
  'dynamique et motivé',
  'motivé et dynamique',
  'rigoureux et motivé',
  'force de proposition',
  'polyvalent',
  'n’hésitez pas',
  "n'hésitez pas",
  'vif intérêt',
  'grand intérêt',
  'à la recherche de nouveaux défis',
  'sortir de ma zone de confort',
  'passionné depuis toujours',
  'je suis la personne idéale',
  'je pense être',
  'esprit d’équipe et',
  'team player',
  'hard-working',
  'think outside the box'
]

export function letterChecks(body: string, resume: Resume | undefined, offer: Offer | undefined, o: LetterOptions): LetterCheck[] {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  const [min, max] = LETTER_LENGTHS.find((l) => l.id === o.length)?.words ?? [250, 380]
  const low = body.toLowerCase()
  const company = offer?.analysis?.company || offer?.company || ''
  const job = offer?.analysis?.title || offer?.title || ''
  const checks: LetterCheck[] = []
  checks.push({
    label: 'Longueur',
    status: words >= min && words <= max ? 'pass' : words >= min * 0.75 && words <= max * 1.2 ? 'warn' : 'fail',
    detail: `${words} mots (visé : ${min} à ${max})`
  })
  if (company) checks.push({ label: 'Entreprise citée', status: low.includes(company.toLowerCase()) ? 'pass' : 'fail', detail: company })
  if (job) checks.push({ label: 'Poste cité', status: low.includes(job.toLowerCase().split(' (')[0]) ? 'pass' : 'warn', detail: job })
  if (offer?.analysis) {
    const kws = offer.analysis.keywords.filter((k) => k.importance >= 2 && k.category !== 'language')
    const hit = kws.filter((k) => low.includes(k.term.toLowerCase()))
    checks.push({
      label: 'Mots-clés de l’offre',
      status: hit.length >= Math.min(3, kws.length) ? 'pass' : hit.length ? 'warn' : 'fail',
      detail: kws.length ? `${hit.length} sur ${kws.length} : ${hit.slice(0, 4).map((k) => k.term).join(', ') || 'aucun'}` : 'aucun mot-clé important'
    })
  }
  checks.push({ label: 'Réalisation chiffrée', status: /\d+\s?(%|k€|€|ans?|mois|clients|projets|personnes|collaborateurs|x\b)|\d{2,}/i.test(body) ? 'pass' : 'warn', detail: 'Un résultat concret retient l’attention.' })
  const cl = CLICHES.filter((c) => low.includes(c))
  checks.push({ label: 'Formules creuses', status: cl.length ? 'warn' : 'pass', detail: cl.length ? cl.map((c) => `« ${c} »`).join(', ') : 'aucune' })
  const sentences = body.split(/(?<=[.!?])\s+/).filter((x) => x.length > 3)
  const je = sentences.filter((x) => /^(je|j’|j')/i.test(x.trim())).length
  checks.push({ label: 'Phrases commençant par « Je »', status: sentences.length && je / sentences.length > 0.45 ? 'warn' : 'pass', detail: `${je} sur ${sentences.length}` })
  checks.push({
    label: 'Formule de politesse',
    status: /(salutations|sentiments|considération|sincerely|regards|cordialement)/i.test(body) ? 'pass' : 'warn',
    detail: 'Termine la lettre et précède la signature.'
  })
  if (resume?.basics.firstName) checks.push({ label: 'Signature', status: body.includes(resume.basics.firstName) ? 'pass' : 'warn', detail: `${resume.basics.firstName} ${resume.basics.lastName}` })
  return checks
}

export function letterScore(checks: LetterCheck[]): number {
  if (!checks.length) return 0
  return Math.round((checks.reduce((n, c) => n + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0) / checks.length) * 100)
}
