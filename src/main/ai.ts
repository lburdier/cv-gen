// Toutes les requêtes Claude passent par le processus principal :
// la clé API ne quitte jamais ce processus et n'est jamais exposée à l'interface.
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import * as z from 'zod/v4'
import { noDash, noDashDeep, resumeToText } from '../shared/format'
import { DEFAULT_DESIGN, normalizeDesign } from '../shared/design'
import type {
  BulletVariants,
  CvImageAnalysis,
  DesignSpec,
  ChatReply,
  ChatTurn,
  ImportedResume,
  Lang,
  LetterOptions,
  ModelId,
  Offer,
  OfferAnalysis,
  OfferKeyword,
  Resume,
  TailorResult
} from '../shared/types'
import { OpenRouterError, modelLabel, orCheckKey, orJson, orReply, orText, type OrMessage } from './openrouter'
import { getApiKey, getSettings } from './storage'

export class AiError extends Error {}

/** Fournisseur actif : Claude (Anthropic) ou un modèle OpenRouter (gratuit par défaut). */
function openRouter(): { key: string; model: string } | null {
  const s = getSettings()
  if (s.provider !== 'openrouter') return null
  const key = getApiKey('openrouter')
  if (!key) throw new AiError("Aucune clé OpenRouter configurée. Ajoutez-la dans Paramètres pour activer l'IA gratuite.")
  return { key, model: s.orModel || 'openrouter/free' }
}

/** Convertit le contenu au format Anthropic en message OpenRouter (texte et PDF). */
function toOr(content: Anthropic.Beta.BetaContentBlockParam[] | string): OrMessage['content'] {
  if (typeof content === 'string') return content
  return content.flatMap((b): Exclude<OrMessage['content'], string> => {
    if (b.type === 'text') return [{ type: 'text', text: b.text }]
    if (b.type === 'document' && b.source.type === 'base64')
      return [{ type: 'file', file: { filename: 'cv.pdf', file_data: `data:application/pdf;base64,${b.source.data}` } }]
    if (b.type === 'image' && b.source.type === 'base64') return [{ type: 'image_url', image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } }]
    return []
  })
}

function client(): Anthropic {
  const key = getApiKey()
  if (!key) throw new AiError("Aucune clé API Claude configurée. Ajoutez-la dans Paramètres pour activer l'IA.")
  return new Anthropic({ apiKey: key, maxRetries: 2 })
}

type Effort = 'low' | 'medium' | 'high'

/** Paramètres communs : modèle choisi, effort explicite, repli serveur en cas de refus. */
function common(model: ModelId, effort: Effort) {
  return {
    model,
    output_config: { effort },
    // Repli côté serveur si un classifieur refuse la requête (pas proposé sur Haiku).
    ...(model === 'claude-haiku-5-5' ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const })
  }
}

function friendly(err: unknown): never {
  if (err instanceof AiError) throw err
  if (err instanceof OpenRouterError) throw new AiError(err.message)
  if (err instanceof Anthropic.AuthenticationError) throw new AiError('Clé API invalide ou révoquée. Vérifiez-la dans Paramètres.')
  if (err instanceof Anthropic.PermissionDeniedError) throw new AiError("Cette clé API n'a pas accès au modèle choisi.")
  if (err instanceof Anthropic.RateLimitError) throw new AiError('Limite de requêtes atteinte. Réessayez dans un instant.')
  if (err instanceof Anthropic.BadRequestError) throw new AiError(`Requête refusée par l'API : ${err.message}`)
  if (err instanceof Anthropic.APIConnectionError) throw new AiError('Impossible de joindre l’API Claude. Vérifiez votre connexion Internet.')
  if (err instanceof Anthropic.APIError) throw new AiError(`Erreur de l'API Claude (${err.status ?? '?'}) : ${err.message}`)
  throw new AiError(err instanceof Error ? err.message : String(err))
}

function checkStop(stop: string | null | undefined) {
  if (stop === 'refusal') throw new AiError("Claude a décliné cette demande. Reformulez le contenu et réessayez.")
  if (stop === 'max_tokens') throw new AiError('La réponse a été tronquée (contenu trop long). Réessayez avec un texte plus court.')
}

async function structured<S extends z.ZodType>(opts: {
  schema: S
  system: string
  content: Anthropic.Beta.BetaContentBlockParam[] | string
  effort: Effort
  maxTokens?: number
}): Promise<z.infer<S>> {
  const { model } = getSettings()
  try {
    const or = openRouter()
    if (or) {
      const { $schema: _, ...schema } = z.toJSONSchema(opts.schema) as Record<string, unknown>
      const out = await orJson<unknown>(or.key, or.model, schema, [{ role: 'system', content: opts.system }, { role: 'user', content: toOr(opts.content) }], opts.maxTokens ?? 16000)
      const parsed = opts.schema.safeParse(out)
      if (!parsed.success) throw new AiError("La réponse du modèle gratuit n'a pas pu être interprétée. Réessayez ou choisissez un autre modèle.")
      return noDashDeep(parsed.data) as z.infer<S>
    }
    const res = await client().beta.messages.parse({
      ...common(model, opts.effort),
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.content }],
      output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) }
    })
    checkStop(res.stop_reason)
    if (res.parsed_output == null) throw new AiError("La réponse de l'IA n'a pas pu être interprétée. Réessayez.")
    return noDashDeep(res.parsed_output) as z.infer<S>
  } catch (e) {
    friendly(e)
  }
}

async function text(opts: { system: string; messages: { role: 'user' | 'assistant'; content: string }[]; effort: Effort; maxTokens?: number; timeoutMs?: number }): Promise<string> {
  const { model } = getSettings()
  try {
    const or = openRouter()
    if (or) return noDash(await orText(or.key, or.model, [{ role: 'system', content: opts.system }, ...opts.messages], opts.maxTokens ?? 16000, opts.timeoutMs))
    const res = await client().beta.messages.create({
      ...common(model, opts.effort),
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.system,
      messages: opts.messages
    })
    checkStop(res.stop_reason)
    return noDash(
      res.content
        .map((b) => (b.type === 'text' ? b.text : ''))
        .join('')
        .trim()
    )
  } catch (e) {
    friendly(e)
  }
}

const HONESTY = `Règle absolue : n'invente JAMAIS d'employeur, de diplôme, de date, de chiffre, de certification ni de compétence que la personne n'a pas.
Tu peux reformuler, réordonner, condenser, mettre en avant et employer le vocabulaire de l'offre quand il décrit fidèlement ce qui figure déjà dans le CV.
Si un résultat chiffré manque, garde la phrase sans chiffre plutôt que d'en inventer un.`

const ATS_RULES = `Bonnes pratiques ATS : intitulés standards, verbes d'action en début de puce, une idée par puce (15 à 30 mots),
mots-clés de l'offre écrits exactement comme dans l'offre (ex. « React.js » si l'offre écrit « React.js »), sigles accompagnés de leur forme longue une fois,
pas de première personne (« je », « I »), pas de caractères décoratifs.`

// ---------- Analyse d'offre ----------

const OfferSchema = z.object({
  title: z.string(),
  company: z.string(),
  seniority: z.string(),
  location: z.string(),
  contract: z.string(),
  summary: z.string(),
  // Types volontairement larges : le SDK convertit enum/const en simples indications,
  // les valeurs sont donc normalisées après coup.
  keywords: z.array(
    z.object({
      term: z.string(),
      importance: z.number().describe('1, 2 ou 3'),
      category: z.string().describe('hard | soft | tool | domain | certification | language')
    })
  ),
  mustHaves: z.array(z.string()),
  niceToHaves: z.array(z.string()),
  responsibilities: z.array(z.string())
})

export async function analyzeOffer(offerText: string): Promise<OfferAnalysis> {
  const out = await structured({
    schema: OfferSchema,
    effort: 'low',
    system: `Tu es un recruteur expert des logiciels ATS (Workday, Taleo, Greenhouse, Lever, SmartRecruiters).
Tu analyses une offre d'emploi pour en extraire ce qu'un ATS va filtrer.
- keywords : 15 à 35 termes tels qu'écrits dans l'offre (compétences techniques, outils, méthodes, domaines, certifications, langues, savoir-être).
  importance 3 = exigé / répété / dans le titre ; 2 = important ; 1 = apprécié.
- mustHaves / niceToHaves / responsibilities : phrases courtes.
- Champs inconnus : chaîne vide. Réponds dans la langue de l'offre.`,
    content: `Offre d'emploi :\n\n${offerText}`
  })
  const cats: OfferKeyword['category'][] = ['hard', 'soft', 'tool', 'domain', 'certification', 'language']
  return {
    ...out,
    keywords: out.keywords
      .filter((k) => k.term.trim())
      .map((k) => ({
        term: k.term.trim(),
        importance: Math.min(3, Math.max(1, Math.round(k.importance))) as OfferKeyword['importance'],
        category: (cats.includes(k.category as OfferKeyword['category']) ? k.category : 'hard') as OfferKeyword['category']
      })),
    source: 'ai'
  }
}

// ---------- Adaptation du CV à l'offre ----------

const TailorSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  experiences: z.array(z.object({ id: z.string(), bullets: z.array(z.string()) })),
  skills: z.array(z.object({ name: z.string(), items: z.array(z.string()) })),
  addedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  notes: z.array(z.string())
})

export async function tailor(resume: Resume, offer: Offer): Promise<TailorResult> {
  const cv = {
    headline: resume.basics.headline,
    summary: resume.basics.summary,
    experiences: resume.experiences.map((e) => ({ id: e.id, role: e.role, company: e.company, start: e.start, end: e.current ? 'présent' : e.end, bullets: e.bullets })),
    skills: resume.skills.map((g) => ({ name: g.name, items: g.items })),
    education: resume.education.map((e) => ({ degree: e.degree, school: e.school, details: e.details })),
    projects: resume.projects,
    certifications: resume.certifications
  }
  const lang = resume.lang === 'en' ? 'anglais' : 'français'
  return structured({
    schema: TailorSchema,
    effort: 'high',
    system: `Tu es un coach carrière spécialiste de l'optimisation de CV pour les ATS.
Tu adaptes un CV existant à une offre précise pour maximiser la correspondance de mots-clés ET rester crédible pour un recruteur humain.
${HONESTY}
${ATS_RULES}
Consignes de sortie :
- headline : titre de poste aligné sur l'intitulé de l'offre quand c'est cohérent avec le parcours.
- summary : 3 à 4 phrases, 350 à 550 caractères, intégrant les mots-clés prioritaires réellement justifiés.
- experiences : renvoie CHAQUE expérience avec son id d'origine, ses puces réécrites (3 à 6), les plus pertinentes pour l'offre en premier.
- skills : groupes de compétences réorganisés (compétences de l'offre présentes dans le CV en premier). N'ajoute une compétence que si le CV la démontre.
- addedKeywords : mots-clés de l'offre que tu as intégrés.
- missingKeywords : mots-clés importants de l'offre absents du parcours (à acquérir ou à ajouter seulement si la personne les possède).
- notes : 2 à 5 conseils concrets pour la personne.
Rédige le CV en ${lang}.`,
    content: `OFFRE :\n${offer.text}\n\n${offer.analysis ? 'ANALYSE DE L’OFFRE :\n' + JSON.stringify(offer.analysis.keywords) + '\n\n' : ''}CV ACTUEL (JSON) :\n${JSON.stringify(cv)}`
  })
}

// ---------- Réécriture d'une puce ----------

const BulletSchema = z.object({ variants: z.array(z.string()), tip: z.string() })

export async function improveBullet(bullet: string, context: string, lang: Lang): Promise<BulletVariants> {
  return structured({
    schema: BulletSchema,
    effort: 'low',
    maxTokens: 4000,
    system: `Tu réécris une puce d'expérience de CV pour la rendre percutante et lisible par un ATS.
${HONESTY}
${ATS_RULES}
Propose 3 variantes (verbe d'action + action + résultat/impact). Si un chiffre serait utile mais n'existe pas, utilise le marqueur [X] pour que la personne le complète.
tip : un conseil d'une phrase. Langue : ${lang === 'en' ? 'anglais' : 'français'}.`,
    content: `Contexte du poste : ${context}\nPuce actuelle : ${bullet}`
  })
}

export async function writeSummary(resume: Resume, offer?: Offer): Promise<string> {
  return text({
    effort: 'medium',
    maxTokens: 4000,
    system: `Tu rédiges la section « Profil » d'un CV : 3 à 4 phrases, 350 à 550 caractères, sans « je », sans cliché vide.
${HONESTY}
${ATS_RULES}
Réponds uniquement par le paragraphe, sans guillemets ni titre. Langue : ${resume.lang === 'en' ? 'anglais' : 'français'}.`,
    messages: [{ role: 'user', content: `${offer ? 'Offre visée :\n' + offer.text + '\n\n' : ''}CV :\n${resumeToText(resume)}` }]
  })
}

const LETTER_RULES = `Règles d'écriture :
- Pas de formules creuses : « je me permets », « dynamique et motivé », « force de proposition », « vif intérêt », « n'hésitez pas », « nouveaux défis ».
- Des faits plutôt que des adjectifs : chaque qualité est prouvée par une réalisation précise du CV (chiffres compris).
- Varie les débuts de phrase : pas plus d'une phrase sur trois ne commence par « Je ».
- N'utilise jamais le tiret cadratin (—) : virgules, deux-points ou phrases courtes.
- Si le genre de la personne n'est pas évident, choisis des tournures neutres (« Avec 5 ans d'expérience » plutôt que « Fort de »).
- Texte brut, sans Markdown, sans objet ni en-tête (ils sont ajoutés par l'application).`

const ANGLES: Record<LetterOptions['angle'], string> = {
  poste: "Angle : l'adéquation avec le poste. Relie les attentes principales de l'offre aux réalisations du CV.",
  entreprise: "Angle : l'entreprise. Ouvre sur ce qui attire la personne chez elle (uniquement à partir de sa motivation fournie), puis montre ce qu'elle apporte.",
  reconversion: "Angle : reconversion. Explique le lien entre le parcours précédent et le nouveau métier, valorise les compétences transférables et les formations suivies.",
  alternance: "Angle : stage ou alternance. Mets en avant la formation en cours, le rythme si connu, la capacité d'apprentissage et les premières expériences.",
  spontanee: "Angle : candidature spontanée. Propose une valeur concrète à l'entreprise sans faire référence à une offre."
}

export async function coverLetter(resume: Resume, offer: Offer | undefined, o: LetterOptions): Promise<string> {
  const [min, max] = o.length === 'courte' ? [150, 230] : o.length === 'detaillee' ? [380, 480] : [250, 360]
  const highlights = o.highlights.length ? resume.experiences.filter((e) => o.highlights.includes(e.id)) : []
  const en = o.lang === 'en'
  return text({
    effort: 'medium',
    // Lettre complète : les modèles gratuits peuvent mettre plus d'une minute.
    timeoutMs: 60_000,
    maxTokens: 6000,
    system: `Tu rédiges une lettre de motivation de ${min} à ${max} mots, en ${o.length === 'courte' ? '3' : '4'} paragraphes : accroche précise, apport concret (réalisations tirées du CV), adéquation avec le poste et l'entreprise, conclusion qui propose un échange.
${ANGLES[o.angle]}
Ton : ${o.tone}.
${HONESTY}
La motivation pour l'entreprise ne vient QUE du texte « Motivation » fourni par la personne ; s'il est vide, n'invente aucune raison personnelle (valeurs, produits aimés, anecdotes) : appuie-toi sur l'offre.
${LETTER_RULES}
Commence directement par la formule d'appel (${en ? '« Dear Hiring Manager, »' : '« Madame, Monsieur, »'}), seule sur sa ligne, puis une ligne vide. Sépare les paragraphes par une ligne vide. Termine par une formule de politesse, puis le prénom et le nom sur une ligne à part.
Langue : ${en ? 'anglais' : 'français'}.`,
    messages: [
      {
        role: 'user',
        content: [
          offer ? `Offre :\n${offer.text}` : 'Candidature spontanée (pas d’offre).',
          `Motivation (mots de la personne) :\n${o.motivation.trim() || '(non renseignée)'}`,
          highlights.length ? `Expériences à mettre en avant :\n${highlights.map((e) => `- ${e.role} chez ${e.company}`).join('\n')}` : '',
          `CV :\n${resumeToText(resume)}`
        ]
          .filter(Boolean)
          .join('\n\n')
      }
    ]
  })
}

/** Retouche d'une lettre existante selon une consigne, sans ajouter de faits absents du CV. */
export async function reviseLetter(body: string, instruction: string, resume: Resume, offer?: Offer, lang: Lang = 'fr'): Promise<string> {
  return text({
    effort: 'low',
    timeoutMs: 60_000,
    maxTokens: 6000,
    system: `Tu retouches une lettre de motivation selon une consigne. Garde la structure (formule d'appel, paragraphes, formule de politesse, signature) sauf si la consigne demande autre chose.
${HONESTY}
${LETTER_RULES}
Renvoie uniquement la lettre retouchée, complète. Langue : ${lang === 'en' ? 'anglais' : 'français'}.`,
    messages: [{ role: 'user', content: `Consigne : ${instruction}\n\nLettre :\n${body}\n\n${offer ? 'Offre :\n' + offer.text + '\n\n' : ''}CV (seule source de faits) :\n${resumeToText(resume)}` }]
  })
}

const CLAUDE_NAMES: Record<string, string> = { 'claude-opus-5-5': 'Claude Opus 5.5', 'claude-sonnet-5-5': 'Claude Sonnet 5.5', 'claude-haiku-5-5': 'Claude Haiku 5.5' }

export async function chat(history: ChatTurn[], resume?: Resume, offer?: Offer): Promise<ChatReply> {
  const ctx = [resume ? `CV actuel :\n${resumeToText(resume)}` : '', offer ? `Offre ciblée :\n${offer.text}` : ''].filter(Boolean).join('\n\n')
  const system = `Tu es l'assistant de CV GEN, une application de création de CV compatibles ATS.
Tu aides à améliorer un CV, à préparer une candidature et à comprendre le fonctionnement des ATS.
Réponses courtes, concrètes et actionnables, en français sauf demande contraire. Markdown léger autorisé (listes, gras).
${HONESTY}
${ctx ? '\n' + ctx : ''}`
  // Les messages d'erreur affichés dans la conversation ne sont pas renvoyés au modèle ;
  // la conversation doit commencer par un message de l'utilisateur.
  const turns = history.filter((t) => !t.error && !t.content.startsWith('⚠️')).map((t) => ({ role: t.role, content: t.content }))
  while (turns.length && turns[0].role !== 'user') turns.shift()
  if (!turns.length) throw new AiError('Écrivez une question pour l’assistant.')
  try {
    const or = openRouter()
    if (or) {
      // Réponse de chat : 4 000 jetons suffisent et restent compatibles avec les petits modèles gratuits.
      const r = await orReply(or.key, or.model, [{ role: 'system', content: system }, ...turns], 4000)
      return { text: noDash(r.text), model: modelLabel(r.model) }
    }
  } catch (e) {
    friendly(e)
  }
  const { model } = getSettings()
  return { text: await text({ effort: 'medium', system, messages: turns, maxTokens: 8000 }), model: CLAUDE_NAMES[model] ?? model }
}

// ---------- Import d'un CV existant ----------

const ImportSchema = z.object({
  lang: z.string().describe('fr ou en'),
  basics: z.object({
    firstName: z.string(),
    lastName: z.string(),
    headline: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    website: z.string(),
    linkedin: z.string(),
    github: z.string(),
    summary: z.string()
  }),
  experiences: z.array(
    z.object({
      role: z.string(),
      company: z.string(),
      location: z.string(),
      start: z.string(),
      end: z.string(),
      current: z.boolean(),
      bullets: z.array(z.string())
    })
  ),
  education: z.array(z.object({ degree: z.string(), school: z.string(), location: z.string(), start: z.string(), end: z.string(), details: z.string() })),
  skills: z.array(z.object({ name: z.string(), items: z.array(z.string()) })),
  projects: z.array(z.object({ name: z.string(), link: z.string(), description: z.string() })),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string(), date: z.string() })),
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
  interests: z.string()
})

const uid = () => Math.random().toString(36).slice(2, 10)

/**
 * Structure un CV avec l'IA. Claude lit le PDF lui-même (mise en page comprise) ; les autres
 * fournisseurs reçoivent le texte déjà extrait localement, plus fiable que leur lecture de PDF.
 */
export async function importResumeAi(source: { pdf?: Buffer; text: string }): Promise<ImportedResume> {
  const usePdf = source.pdf && getSettings().provider !== 'openrouter'
  const content: Anthropic.Beta.BetaContentBlockParam[] = usePdf
    ? [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: source.pdf!.toString('base64') } },
        { type: 'text', text: 'Extrais ce CV.' }
      ]
    : [{ type: 'text', text: `CV (texte extrait du document, dans l'ordre de lecture) :\n\n${source.text}` }]
  const out = await structured({
    schema: ImportSchema,
    effort: 'low',
    system: `Tu convertis un CV en données structurées, fidèlement, sans rien inventer ni reformuler.
Dates au format AAAA-MM (ou AAAA-01 si seul l'année est connue ; chaîne vide si inconnue). current = true si le poste est en cours.
Chaque puce d'expérience = une entrée de bullets. Regroupe les compétences par catégorie logique. Champs absents : chaîne vide.`,
    content
  })
  return {
    ...out,
    lang: out.lang.toLowerCase().startsWith('en') ? 'en' : 'fr',
    experiences: out.experiences.map((e) => ({ ...e, id: uid() })),
    education: out.education.map((e) => ({ ...e, id: uid() })),
    skills: out.skills.map((g) => ({ ...g, id: uid() })),
    projects: out.projects.map((p) => ({ ...p, id: uid() })),
    certifications: out.certifications.map((c) => ({ ...c, id: uid() })),
    languages: out.languages.map((l) => ({ ...l, id: uid() }))
  }
}

// ---------- Recréer un CV depuis une image ----------

const DesignSchema = z.object({
  layout: z.string().describe('single | sidebar-left | sidebar-right'),
  sidebarWidth: z.number().describe('largeur de la colonne latérale en % de la page (24 à 42)'),
  header: z.string().describe('band | card | minimal | split'),
  headerAlign: z.string().describe('left | center'),
  photo: z.string().describe('none | circle | rounded | square'),
  photoPlace: z.string().describe('header | sidebar'),
  photoSide: z.string().describe('left | right : côté de la photo dans l’en-tête'),
  headings: z.string().describe('underline | pill | block | caps | highlight | bar'),
  bodyFont: z.string().describe('sans | serif | mono'),
  displayFont: z.string().describe('sans | serif | mono | wide'),
  nameCase: z.string().describe('upper | normal'),
  nameSize: z.string().describe('m | l | xl'),
  skills: z.string().describe('chips | list | columns'),
  timeline: z.boolean(),
  corners: z.string().describe('square | rounded'),
  density: z.string().describe('airy | compact'),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    page: z.string(),
    text: z.string(),
    sidebar: z.string(),
    header: z.string()
  }),
  sidebarSections: z.array(z.string()).describe('parmi summary, experience, education, skills, projects, certifications, languages, interests'),
  photoBox: z
    .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
    .describe('cadre de la photo en % de la largeur (x, w) et de la hauteur (y, h) de l’image ; tout à 0 sans photo')
})

const DESIGN_GUIDE = `Tu es directeur artistique et intégrateur. Tu analyses l'IMAGE d'un CV pour reproduire fidèlement son design avec un moteur paramétrable.
Décris le design avec ces paramètres (valeurs exactes) :
- layout : « sidebar-left » si une colonne latérale distincte (fond coloré ou bloc d'infos étroit) est à gauche, « sidebar-right » si à droite, sinon « single ».
- sidebarWidth : largeur de cette colonne en % de la largeur de la page (souvent 28 à 38).
- header : « band » = bandeau de couleur pleine largeur en haut ; « card » = bloc arrondi coloré qui ne touche pas les bords ; « split » = nom à gauche et coordonnées empilées à droite sans fond ; « minimal » = nom sur fond de page avec un simple filet.
- headerAlign : « center » si le nom est centré, sinon « left ».
- photo : « none » s'il n'y a pas de photo, sinon sa forme (« circle », « rounded », « square ») ; photoPlace : « sidebar » si elle est dans la colonne latérale, sinon « header ».
- headings (titres de section) : « underline » = texte souligné d'un filet ; « pill » = texte dans une pastille arrondie colorée ; « block » = bande colorée pleine largeur ; « caps » = capitales très espacées sans décor ; « highlight » = surlignage coloré derrière le texte ; « bar » = barre verticale colorée à gauche.
- bodyFont / displayFont : « serif » (à empattements), « mono » (chasse fixe), « wide » (grotesque très large/étendue), sinon « sans ».
- nameCase : « upper » si le nom est en capitales ; nameSize : « m », « l » ou « xl » selon sa taille relative.
- skills : « chips » (pastilles), « columns » (listes à puces en colonnes), « list » (texte en ligne).
- timeline : true si le parcours est relié par une ligne verticale avec des points.
- corners : « rounded » si les blocs/pastilles sont arrondis ; density : « compact » si le texte est serré.
- colors : codes hexadécimaux #RRGGBB. primary = couleur d'accent principale (titres, puces, éléments forts) ; secondary = deuxième couleur d'accent (surlignages, pastilles, formes) ou une teinte claire de primary s'il n'y en a pas ; page = fond de la page ; text = couleur du texte courant ; sidebar = fond de la colonne latérale (= page s'il n'y en a pas) ; header = fond de l'en-tête (= page si sans fond).
- sidebarSections : sections placées dans la colonne latérale (le contact y va automatiquement).
- notes : 3 à 6 observations courtes en français sur ce qui caractérise ce design.`

export async function analyzeCvImage(dataUrl: string, withContent: boolean, hint?: DesignSpec): Promise<CvImageAnalysis> {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/s.exec(dataUrl)
  if (!m) throw new AiError('Image illisible : utilisez un fichier PNG, JPEG ou WebP.')
  const image: Anthropic.Beta.BetaContentBlockParam = {
    type: 'image',
    source: { type: 'base64', media_type: m[1] as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif', data: m[2] }
  }
  const measured = hint
    ? `\nMesures faites sur les pixels de l'image (fiables pour les couleurs de fond, à confirmer pour le reste) : ${JSON.stringify({ layout: hint.layout, sidebarWidth: hint.sidebarWidth, header: hint.header, photo: hint.photo, photoPlace: hint.photoPlace, colors: hint.colors })}`
    : ''
  const schema = withContent ? z.object({ design: DesignSchema, notes: z.array(z.string()), content: ImportSchema }) : z.object({ design: DesignSchema, notes: z.array(z.string()) })
  const out = (await structured({
    schema,
    effort: 'medium',
    system: `${DESIGN_GUIDE}${
      withContent
        ? `\nLis aussi tout le TEXTE du CV et range-le dans « content », fidèlement, sans rien inventer ni reformuler.
Dates au format AAAA-MM (AAAA-01 si seule l'année est connue ; chaîne vide si inconnue). current = true si le poste est en cours.
Chaque puce = une entrée de bullets. Regroupe les compétences par catégorie. Champs absents : chaîne vide.`
        : ''
    }`,
    content: [image, { type: 'text', text: `Analyse ce CV.${measured}` }]
  })) as { design: unknown; notes: string[]; content?: z.infer<typeof ImportSchema> }
  const design = normalizeDesign(out.design, hint ?? DEFAULT_DESIGN)
  const result: CvImageAnalysis = { design, notes: (out.notes ?? []).filter((x) => x.trim()).slice(0, 6) }
  const box = (out.design as { photoBox?: { x: number; y: number; w: number; h: number } })?.photoBox
  if (box && box.w > 2 && box.h > 2 && design.photo !== 'none')
    result.photoBox = { x: Math.max(0, box.x), y: Math.max(0, box.y), w: Math.min(100, box.w), h: Math.min(100, box.h) }
  if (out.content) {
    const c = out.content
    result.content = {
      ...c,
      lang: c.lang.toLowerCase().startsWith('en') ? 'en' : 'fr',
      experiences: c.experiences.map((e) => ({ ...e, id: uid() })),
      education: c.education.map((e) => ({ ...e, id: uid() })),
      skills: c.skills.map((g) => ({ ...g, id: uid() })),
      projects: c.projects.map((p) => ({ ...p, id: uid() })),
      certifications: c.certifications.map((x) => ({ ...x, id: uid() })),
      languages: c.languages.map((l) => ({ ...l, id: uid() }))
    }
  }
  return result
}

export async function testKey(): Promise<{ ok: boolean; error?: string }> {
  try {
    const or = openRouter()
    if (or) {
      await orCheckKey(or.key)
      // Petite requête réelle : vérifie aussi que le modèle gratuit choisi répond.
      await orText(or.key, or.model, [{ role: 'user', content: 'Réponds simplement « ok ».' }], 400)
      return { ok: true }
    }
    const { model } = getSettings()
    await client().models.retrieve(model)
    return { ok: true }
  } catch (e) {
    try {
      friendly(e)
    } catch (f) {
      return { ok: false, error: (f as Error).message }
    }
  }
}
