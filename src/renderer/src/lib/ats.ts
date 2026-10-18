// Analyse ATS locale (hors ligne) : structure, contenu et correspondance de mots-clés.
// Les règles reprennent ce que vérifient les parseurs courants (Workday, Taleo, Greenhouse…).
import { resumeToText } from '../../../shared/format'
import type { Offer, OfferAnalysis, OfferKeyword, Resume } from '../../../shared/types'
import { isVisual } from '../templates/registry'

export type CheckStatus = 'pass' | 'warn' | 'fail'
export interface AtsCheck {
  id: string
  category: 'format' | 'content' | 'keywords'
  status: CheckStatus
  label: string
  detail: string
  weight: number
}
export interface KeywordMatch {
  found: OfferKeyword[]
  missing: OfferKeyword[]
  coverage: number // 0..100, pondéré par l'importance
}
export interface AtsReport {
  score: number
  format: number
  content: number
  keywords: number | null
  checks: AtsCheck[]
  match: KeywordMatch | null
  wordCount: number
}

// ---------- Normalisation ----------

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+#.\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Variantes tolérées : node.js ≈ nodejs ≈ node js, pluriels simples. */
function variants(term: string): string[] {
  const n = norm(term)
  const set = new Set([n, n.replace(/\./g, ''), n.replace(/\./g, ' '), n.replace(/-/g, ' '), n.replace(/\s/g, '')])
  if (n.length > 4 && n.endsWith('s')) set.add(n.slice(0, -1))
  else if (n.length > 3) set.add(n + 's')
  return [...set].filter((v) => v.length > 0)
}

export function containsTerm(haystackNorm: string, term: string): boolean {
  return variants(term).some((v) => {
    const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9])${esc}($|[^a-z0-9])`).test(haystackNorm)
  })
}

// ---------- Extraction locale de mots-clés (sans IA) ----------

const STOP = new Set(
  `a à au aux avec ce ces cette dans de des du elle en et être eux il ils je la le les leur lui ma mais me même mes moi mon ne nos notre nous on ou où par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l m n s t y été étée étées étés étant suis es est sommes êtes sont serai sera seront ai as avons avez ont avoir fait faire plus moins très tout tous toute toutes afin ainsi alors aussi autre autres bien car chez comme dont donc entre lors leurs peu peut pendant puis quand sans selon sous tant tel telle vers via h f hf cdi cdd stage poste profil mission missions vos nos notre votre équipe equipe entreprise rejoindre rejoignez recherche recherchons cherchons candidat candidate expérience experience ans année années minimum idéalement appréciée apprécié souhaité souhaitée requis requise maîtrise connaissance connaissances capacité capacités compétences compétence sens bonne bon bonnes bons forte fort nouvelle nouveau nouvelles nouveaux développer participer garantir collaborer concevoir the and or of to in for with on at by an be is are as from this that our your you we will have has who what work team role job years year experience skills skill strong ability knowledge plus nice etc ainsi`.split(
    /\s+/
  )
)

// Vocabulaire connu (outils, langages, méthodes, savoir-être) pour mieux détecter les termes composés.
const KNOWN = [
  'react', 'react.js', 'react native', 'next.js', 'vue.js', 'vue', 'angular', 'svelte', 'typescript', 'javascript', 'node.js', 'node', 'express', 'nestjs', 'deno',
  'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'spring boot', 'kotlin', 'swift', 'c#', '.net', 'c++', 'go', 'golang', 'rust', 'php', 'symfony', 'laravel', 'ruby', 'rails', 'scala',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'graphql', 'rest', 'api', 'grpc', 'kafka', 'rabbitmq',
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible', 'ci/cd', 'github actions', 'gitlab ci', 'jenkins', 'linux', 'git',
  'html', 'css', 'sass', 'tailwind', 'tailwind css', 'redux', 'webpack', 'vite', 'storybook', 'jest', 'cypress', 'playwright', 'tdd', 'bdd',
  'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'ui', 'ux', 'ui/ux', 'design system', 'accessibilité', 'accessibility', 'rgaa', 'wcag', 'seo', 'sea',
  'machine learning', 'deep learning', 'data science', 'pandas', 'numpy', 'pytorch', 'tensorflow', 'llm', 'nlp', 'power bi', 'tableau', 'excel', 'looker', 'dbt', 'airflow', 'spark', 'snowflake',
  'scrum', 'agile', 'kanban', 'safe', 'jira', 'confluence', 'notion', 'devops', 'sre', 'microservices', 'cloud', 'saas', 'b2b', 'b2c', 'crm', 'erp', 'sap', 'salesforce', 'hubspot',
  'gestion de projet', 'project management', 'product management', 'product owner', 'product manager', 'chef de projet', 'pmp', 'prince2', 'itil', 'lean', 'six sigma',
  'communication', 'leadership', 'autonomie', 'rigueur', 'esprit d équipe', 'esprit d equipe', 'travail en équipe', 'teamwork', 'problem solving', 'résolution de problèmes', 'organisation', 'curiosité', 'adaptabilité', 'sens du produit', 'sens du service', 'négociation', 'management',
  'anglais', 'english', 'allemand', 'espagnol', 'français', 'french', 'german', 'spanish', 'performance', 'sécurité', 'security', 'cybersécurité', 'rgpd', 'gdpr', 'iso 27001'
]

export function localAnalyze(text: string): OfferAnalysis {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const n = norm(text)
  const head = norm(lines.slice(0, 2).join(' '))
  const counts = new Map<string, number>()

  for (const k of KNOWN) {
    const c = countOccurrences(n, k)
    if (c > 0) counts.set(k, c)
  }
  // Sigles et noms propres d'outils (mots avec majuscules internes ou en capitales).
  const caps = text.match(/\b([A-Z][a-zA-Z0-9+#.]*[A-Z0-9+#][a-zA-Z0-9+#.]*|[A-Z]{2,}[0-9]*)\b/g) ?? []
  for (const c of caps) {
    const k = norm(c)
    if (k.length < 2 || STOP.has(k) || /^(h|f|hf|cdi|cdd)$/.test(k)) continue
    counts.set(k, Math.max(counts.get(k) ?? 0, countOccurrences(n, k)))
  }
  // Bigrammes fréquents de deux mots pleins réellement adjacents dans le texte
  // (on ne saute pas les mots vides, sinon « React et TypeScript » donnerait « react typescript »).
  const words = n.split(' ')
  const full = (w: string) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)
  const bi = new Map<string, number>()
  for (let i = 0; i < words.length - 1; i++) {
    if (!full(words[i]) || !full(words[i + 1])) continue
    const b = `${words[i]} ${words[i + 1]}`
    bi.set(b, (bi.get(b) ?? 0) + 1)
  }
  for (const [b, c] of bi) if (c >= 2 && !counts.has(b)) counts.set(b, c)
  // Doublons de graphie (« esprit d’équipe » / « esprit d'equipe ») : on garde une seule forme.
  const seen = new Set<string>()
  for (const k of [...counts.keys()]) {
    const key = norm(k)
    if (seen.has(key)) counts.delete(k)
    else seen.add(key)
  }

  // On supprime les termes contenus dans un terme plus long déjà retenu avec la même fréquence.
  const terms = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
  const kept: [string, number][] = []
  for (const [t, c] of terms) {
    // Fragment d'un terme plus long (« ci » dans « ci/cd », « node » dans « node.js ») : ignoré.
    if (kept.some(([k, kc]) => k !== t && (` ${k} `.includes(` ${t} `) || k.split(/[\s/.-]+/).includes(t)) && kc >= c)) continue
    kept.push([t, c])
  }
  const original = (k: string) => {
    const m = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').exec(text.normalize('NFC'))
    return m ? m[0] : k
  }
  const soft = new Set(['communication', 'leadership', 'autonomie', 'rigueur', 'esprit d équipe', 'esprit d equipe', 'travail en équipe', 'teamwork', 'curiosité', 'adaptabilité', 'organisation', 'sens du produit', 'sens du service', 'négociation'])
  const langs = new Set(['anglais', 'english', 'allemand', 'espagnol', 'français', 'french', 'german', 'spanish'])
  const keywords: OfferKeyword[] = kept.slice(0, 28).map(([k, c]) => ({
    term: original(k),
    importance: c >= 3 || head.includes(k) ? 3 : c === 2 ? 2 : 1,
    category: soft.has(k) ? 'soft' : langs.has(k) ? 'language' : KNOWN.includes(k) ? 'tool' : 'hard'
  }))

  const bullets = lines.filter((l) => /^[-•*·▪●]/.test(l)).map((l) => l.replace(/^[-•*·▪●]\s*/, ''))
  return {
    title: lines[0]?.replace(/\s*[\u2014–-]\s*(CDI|CDD|Stage|Alternance|Freelance).*$/i, '').slice(0, 90) ?? '',
    company: '',
    seniority: /senior|confirm|lead|\b[5-9]\s*ans/i.test(text) ? 'Confirmé / Senior' : /junior|débutant|stage|alternance/i.test(text) ? 'Junior' : '',
    location: /(Paris|Lyon|Marseille|Toulouse|Bordeaux|Lille|Nantes|Rennes|Strasbourg|Nice|Montpellier|Grenoble|remote|télétravail|hybride)/i.exec(text)?.[0] ?? '',
    contract: /\b(CDI|CDD|Stage|Alternance|Freelance|Intérim)\b/i.exec(text)?.[0] ?? '',
    summary: lines.slice(1, 3).join(' ').slice(0, 280),
    keywords,
    mustHaves: bullets.filter((b) => /(ans|maîtrise|expérience|obligatoire|requis|minimum|diplôme)/i.test(b)).slice(0, 8),
    niceToHaves: bullets.filter((b) => /(appréci|idéalement|un plus|bonus|souhait)/i.test(b)).slice(0, 6),
    responsibilities: bullets.filter((b) => /^(développer|concevoir|participer|garantir|collaborer|piloter|gérer|assurer|animer|mettre|construire|analyser|accompagner|définir)/i.test(b)).slice(0, 8),
    source: 'local'
  }
}

function countOccurrences(hay: string, term: string): number {
  const esc = norm(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!esc) return 0
  return (hay.match(new RegExp(`(^|[^a-z0-9])${esc}(?=$|[^a-z0-9])`, 'g')) ?? []).length
}

// ---------- Correspondance CV / offre ----------

export function matchKeywords(resume: Resume, keywords: OfferKeyword[]): KeywordMatch {
  const hay = norm(resumeToText(resume))
  const found: OfferKeyword[] = []
  const missing: OfferKeyword[] = []
  for (const k of keywords) (containsTerm(hay, k.term) ? found : missing).push(k)
  const total = keywords.reduce((s, k) => s + k.importance, 0)
  const got = found.reduce((s, k) => s + k.importance, 0)
  return {
    found: found.sort((a, b) => b.importance - a.importance),
    missing: missing.sort((a, b) => b.importance - a.importance),
    coverage: total ? Math.round((got / total) * 100) : 0
  }
}

// ---------- Contrôles ----------

const ACTION_VERBS = norm(
  `accompagn accél achev adapt administr align améliorer amélior analys anim anticip appliqu apport assur atteint augment automatis bâti budgét cadr centralis challeng chiffr coach collabor communiqu concev conçu conduit configur consolid construi contribu contrôl convaincu coordon cré décroch défini déléguer délivr déploy dessin détect développ diagnostiqu dirig divis document doubl dynamis élabor éliminer encadr engag enrich établi évalu exécut expérimenté facilit fédér fiabilis finalis form formalis gagn géré gér gouvern guid identifi implément industrialis initi innov install instaur intégr interview lanc livr maintenu maîtris manag maximis mené men mentor mesur migr minimis modernis modélis monitor monté motiv négoci obten optimis orchestr organis pilot planifi port pris produi programm promu propos prototyp publi qualifi rationalis réalis recrut rédig redress réduit réduis refond renforc réorganis repens résolu restructur réussi révis sécuris sélectionn simplifi stabilis standardis structur supervis soutenu synthétis test tripl transform unifi valid vend
  achiev administer analyz architect automat boost built chair coach collaborat communicat complet conceiv conduct consolidat construct coordinat creat cut decreas defin deliver deploy design develop direct doubl drove driv earn eliminat enabl engineer establish evaluat execut expand facilitat forecast form generat grew guid handl head identif implement improv increas initiat innovat install integrat introduc launch lead led maintain manag maximiz mentor migrat minimiz moderniz monitor negotiat optimiz orchestrat organiz oversaw own pilot plan produc program promot propos publish rais rebuilt recruit redesign reduc refactor reorganiz resolv restructur revamp saved scal secur shipped simplif spearhead standardiz streamlin strengthen supervis test train transform tripl unifi upgrad won wrote`
).split(' ')

export const FIRST_PERSON = /\b(je|j'|j’|moi|mon|ma|mes|nous|i|my|me|we|our)\b/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const SAFE_FONTS = ['inter', 'arial', 'calibri', 'georgia', 'serif']

export function startsWithAction(b: string) {
  const w = norm(b).split(' ')[0] ?? ''
  return ACTION_VERBS.some((v) => v.length >= 3 && w.startsWith(v))
}

export function analyze(resume: Resume, offer?: Offer | null): AtsReport {
  const checks: AtsCheck[] = []
  const add = (c: AtsCheck) => checks.push(c)
  const b = resume.basics
  const text = resumeToText(resume)
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const bullets = resume.experiences.flatMap((e) => e.bullets.filter((x) => x.trim()))

  // FORMAT, garanti par les modèles, vérifié par principe
  const visual = isVisual(resume.templateId)
  add(
    visual
      ? { id: 'layout', category: 'format', status: 'warn', weight: 3, label: 'Modèle visuel en colonnes', detail: 'Parfait à envoyer directement à un recruteur. Pour une plateforme de candidature, exportez la « PDF version ATS ».' }
      : { id: 'layout', category: 'format', status: 'pass', weight: 3, label: 'Mise en page une colonne', detail: 'Ordre de lecture linéaire, sans tableau ni zone de texte flottante.' }
  )
  add({ id: 'text', category: 'format', status: 'pass', weight: 3, label: 'Texte réel et sélectionnable', detail: 'Export PDF balisé (tagged PDF) et DOCX natif, aucun texte en image.' })
  add({ id: 'headings', category: 'format', status: 'pass', weight: 2, label: 'Intitulés de sections standards', detail: resume.lang === 'fr' ? '« Expérience professionnelle », « Formation », « Compétences »…' : '“Work Experience”, “Education”, “Skills”…' })
  add({
    id: 'font',
    category: 'format',
    status: SAFE_FONTS.includes(resume.font) ? 'pass' : 'warn',
    weight: 1,
    label: 'Police standard',
    detail: SAFE_FONTS.includes(resume.font) ? 'Police lisible et intégrée correctement au PDF.' : 'Préférez Inter, Arial, Calibri ou Georgia.'
  })
  add({
    id: 'length',
    category: 'format',
    status: wordCount >= 250 && wordCount <= 950 ? 'pass' : wordCount < 150 || wordCount > 1300 ? 'fail' : 'warn',
    weight: 2,
    label: `Longueur : ${wordCount} mots`,
    detail: wordCount < 250 ? 'CV trop court : visez 350 à 800 mots (1 à 2 pages).' : wordCount > 950 ? 'CV long : condensez pour rester sur 2 pages maximum.' : 'Longueur idéale pour 1 à 2 pages.'
  })
  const missingDates = resume.experiences.filter((e) => !e.start || (!e.end && !e.current)).length
  add({
    id: 'dates',
    category: 'format',
    status: resume.experiences.length === 0 ? 'warn' : missingDates === 0 ? 'pass' : 'fail',
    weight: 2,
    label: 'Dates complètes (MM/AAAA)',
    detail:
      resume.experiences.length === 0
        ? 'Ajoutez au moins une expérience datée.'
        : missingDates
          ? `${missingDates} expérience(s) sans date de début ou de fin : les ATS calculent l'ancienneté avec.`
          : 'Toutes les expériences sont datées.'
  })

  // CONTENU
  const contactMissing = [!EMAIL.test(b.email.trim()) && 'e-mail valide', !b.phone.trim() && 'téléphone', !b.location.trim() && 'ville'].filter(Boolean)
  add({
    id: 'contact',
    category: 'content',
    status: contactMissing.length === 0 ? 'pass' : contactMissing.length > 1 ? 'fail' : 'warn',
    weight: 3,
    label: 'Coordonnées complètes',
    detail: contactMissing.length ? `Manquant : ${contactMissing.join(', ')}.` : 'E-mail, téléphone et ville présents dans le corps du document.'
  })
  add({
    id: 'name',
    category: 'content',
    status: b.firstName.trim() && b.lastName.trim() ? 'pass' : 'fail',
    weight: 2,
    label: 'Nom et prénom',
    detail: b.firstName.trim() && b.lastName.trim() ? 'Placés en tête, en texte simple.' : 'Renseignez prénom et nom.'
  })
  add({
    id: 'linkedin',
    category: 'content',
    status: b.linkedin.trim() ? 'pass' : 'warn',
    weight: 1,
    label: 'Profil LinkedIn',
    detail: b.linkedin.trim() ? 'Lien présent.' : 'Ajoutez votre URL LinkedIn : la plupart des recruteurs la consultent.'
  })
  add({
    id: 'headline',
    category: 'content',
    status: b.headline.trim() ? 'pass' : 'warn',
    weight: 2,
    label: 'Titre de poste visé',
    detail: b.headline.trim() ? 'Idéalement identique à l’intitulé de l’offre.' : 'Ajoutez un titre sous votre nom : c’est l’un des premiers champs lus par l’ATS.'
  })
  const sl = b.summary.trim().length
  add({
    id: 'summary',
    category: 'content',
    status: sl >= 250 && sl <= 750 ? 'pass' : sl === 0 ? 'fail' : 'warn',
    weight: 2,
    label: `Profil : ${sl} caractères`,
    detail: sl === 0 ? 'Ajoutez 3 à 4 phrases de synthèse riches en mots-clés.' : sl < 250 ? 'Un peu court : visez 350 à 550 caractères.' : sl > 750 ? 'Trop long : 3 à 4 phrases suffisent.' : 'Bonne longueur.'
  })
  add({
    id: 'experience',
    category: 'content',
    status: resume.experiences.length ? 'pass' : 'fail',
    weight: 3,
    label: 'Expérience professionnelle',
    detail: resume.experiences.length ? `${resume.experiences.length} expérience(s) renseignée(s).` : 'Ajoutez au moins une expérience (stage, alternance, projet).'
  })
  const thin = resume.experiences.filter((e) => e.bullets.filter((x) => x.trim()).length < 2).length
  add({
    id: 'bullets',
    category: 'content',
    status: resume.experiences.length === 0 ? 'warn' : thin === 0 ? 'pass' : 'warn',
    weight: 2,
    label: 'Réalisations par poste',
    detail: thin ? `${thin} poste(s) avec moins de 2 puces : visez 3 à 5 réalisations.` : 'Chaque poste détaille plusieurs réalisations.'
  })
  if (bullets.length) {
    const act = bullets.filter(startsWithAction).length / bullets.length
    add({
      id: 'verbs',
      category: 'content',
      status: act >= 0.7 ? 'pass' : act >= 0.4 ? 'warn' : 'fail',
      weight: 2,
      label: `Verbes d’action : ${Math.round(act * 100)} %`,
      detail: act >= 0.7 ? 'Les puces commencent par un verbe d’action.' : 'Commencez chaque puce par un verbe : « Conçu », « Piloté », « Réduit »…'
    })
    const q = bullets.filter((x) => /\d|%|€|\$|k€|m€/i.test(x)).length / bullets.length
    add({
      id: 'metrics',
      category: 'content',
      status: q >= 0.4 ? 'pass' : q >= 0.2 ? 'warn' : 'fail',
      weight: 2,
      label: `Résultats chiffrés : ${Math.round(q * 100)} %`,
      detail: q >= 0.4 ? 'Bonne proportion de résultats mesurables.' : 'Ajoutez des chiffres (%, volumes, délais, budgets) à au moins 40 % des puces.'
    })
    const long = bullets.filter((x) => x.split(/\s+/).length > 38).length
    add({
      id: 'bulletlen',
      category: 'content',
      status: long === 0 ? 'pass' : 'warn',
      weight: 1,
      label: 'Puces concises',
      detail: long ? `${long} puce(s) de plus de 38 mots : une idée par puce.` : 'Toutes les puces font moins de 38 mots.'
    })
  }
  const fp = [b.summary, ...bullets].some((x) => FIRST_PERSON.test(x))
  add({
    id: 'pronoun',
    category: 'content',
    status: fp ? 'warn' : 'pass',
    weight: 1,
    label: 'Style impersonnel',
    detail: fp ? 'Évitez « je », « mon », « nous » : style télégraphique attendu.' : 'Aucune première personne détectée.'
  })
  const skillCount = resume.skills.reduce((s, g) => s + g.items.length, 0)
  add({
    id: 'skills',
    category: 'content',
    status: skillCount >= 8 ? 'pass' : skillCount >= 4 ? 'warn' : 'fail',
    weight: 2,
    label: `Compétences : ${skillCount}`,
    detail: skillCount >= 8 ? 'Section compétences bien fournie.' : 'Listez au moins 8 compétences, écrites comme dans les offres.'
  })
  add({
    id: 'education',
    category: 'content',
    status: resume.education.length ? 'pass' : 'warn',
    weight: 1,
    label: 'Formation',
    detail: resume.education.length ? 'Diplôme(s) renseigné(s).' : 'Ajoutez votre formation : de nombreux filtres ATS portent sur le diplôme.'
  })

  // MOTS-CLÉS
  let match: KeywordMatch | null = null
  const kws = offer?.analysis?.keywords ?? (offer ? localAnalyze(offer.text).keywords : null)
  if (offer && kws && kws.length) {
    match = matchKeywords(resume, kws)
    add({
      id: 'kw-coverage',
      category: 'keywords',
      status: match.coverage >= 75 ? 'pass' : match.coverage >= 50 ? 'warn' : 'fail',
      weight: 5,
      label: `Couverture des mots-clés : ${match.coverage} %`,
      detail: match.coverage >= 75 ? 'Excellent alignement avec l’offre.' : `Il manque ${match.missing.length} mot(s)-clé(s) : intégrez ceux que vous maîtrisez réellement.`
    })
    const critical = match.missing.filter((k) => k.importance === 3)
    add({
      id: 'kw-critical',
      category: 'keywords',
      status: critical.length === 0 ? 'pass' : critical.length <= 2 ? 'warn' : 'fail',
      weight: 4,
      label: 'Exigences prioritaires',
      detail: critical.length ? `Absents : ${critical.map((k) => k.term).join(', ')}.` : 'Tous les termes prioritaires de l’offre figurent dans le CV.'
    })
    const title = offer.analysis?.title || offer.title
    const titleWords = norm(title)
      .split(' ')
      .filter((w) => w.length > 3 && !STOP.has(w))
    const hl = norm(b.headline)
    const tHit = titleWords.length ? titleWords.filter((w) => hl.includes(w)).length / titleWords.length : 1
    add({
      id: 'kw-title',
      category: 'keywords',
      status: tHit >= 0.5 ? 'pass' : 'warn',
      weight: 2,
      label: 'Titre aligné sur l’offre',
      detail: tHit >= 0.5 ? 'Votre titre reprend l’intitulé du poste.' : `Reprenez l’intitulé « ${title} » dans votre titre si c’est cohérent.`
    })
  }

  const scoreOf = (cat: AtsCheck['category']) => {
    const cs = checks.filter((c) => c.category === cat)
    const total = cs.reduce((s, c) => s + c.weight, 0)
    const got = cs.reduce((s, c) => s + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0)
    return total ? Math.round((got / total) * 100) : 0
  }
  const format = scoreOf('format')
  const content = scoreOf('content')
  const keywords = match ? Math.round(scoreOf('keywords') * 0.4 + match.coverage * 0.6) : null
  const score = keywords == null ? Math.round(format * 0.4 + content * 0.6) : Math.round(format * 0.2 + content * 0.35 + keywords * 0.45)
  return { score, format, content, keywords, checks, match, wordCount }
}

export function scoreColor(score: number): string {
  return score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warn)' : 'var(--danger)'
}
