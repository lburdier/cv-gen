// Lettres avec le mini modèle local. Un petit modèle invente facilement (noms, chiffres, « [Nom de
// l'entreprise] ») : il ne rédige donc pas la lettre lui-même. On part du brouillon guidé, exact et
// construit à partir du CV, puis le modèle reformule chaque paragraphe ; une reformulation n'est gardée
// que si elle reste fidèle (mêmes chiffres, aucun nom nouveau, pas de trou à compléter, longueur proche).
import { noDash } from '../shared/format'
import { draftLetter } from '../shared/letter'
import type { Lang, LetterOptions, Offer, Resume } from '../shared/types'
import { localGenerate } from './localLlm'

const SYSTEM_FR = `Tu es relecteur de lettres de motivation en français.
Tu reçois un paragraphe et une consigne. Tu renvoies UNIQUEMENT le paragraphe réécrit : pas de titre, pas de guillemets, pas de commentaire, pas de liste.
Tu gardes exactement les mêmes faits, noms, chiffres et dates. Tu n'ajoutes aucune information. Jamais de crochets ni de texte à compléter. Jamais de tiret cadratin.`
const SYSTEM_EN = `You proofread cover letters in English.
You receive one paragraph and an instruction. Return ONLY the rewritten paragraph: no title, no quotes, no comment, no list.
Keep exactly the same facts, names, figures and dates. Add no information. Never use brackets or placeholders. Never use em dashes.`

/** Formule d'appel, formule de politesse, signature : jamais reformulées. */
function isFixed(p: string, i: number, n: number): boolean {
  const t = p.trim()
  if (i === 0 && t.length < 50 && /,$/.test(t)) return true
  if (i === n - 1 && t.length < 60 && !/[.!?]$/.test(t)) return true
  return /salutations|agréer|sentiments|considération|sincerely|regards|faithfully/i.test(t) && t.length < 220
}

function clean(out: string): string {
  return noDash(
    out
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/^\s*(paragraphe( réécrit)?|rewritten paragraph|voici[^:]*)\s*:\s*/i, '')
      .replace(/\*\*/g, '')
      .trim()
      .replace(/^["«“]\s*|\s*["»”]$/g, '')
      .replace(/\s*\n\s*/g, ' ')
      // Erreur fréquente des petits modèles : « ma expérience » → « mon expérience ».
      .replace(/\b([MmTtSs])a (?=[aeiouéèêëâîïôûü])/g, (_m, c: string) => `${c}on `)
      .trim()
  )
}

const numbers = (s: string) => new Set((s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')))
const words = (s: string) => s.split(/\s+/).filter(Boolean).length

/** Mots en majuscule qui ne commencent pas une phrase : noms propres (entreprises, outils, villes). */
function properNouns(s: string): string[] {
  const out: string[] = []
  const tokens = s.split(/\s+/)
  tokens.forEach((tok, i) => {
    const w = tok.replace(/^[«"“(]+|[»"”),.;:!?]+$/g, '')
    const prev = tokens[i - 1] ?? ''
    if (i === 0 || /[.!?:]$/.test(prev)) return
    if (/^[A-ZÀ-Ý][\p{L}\d.+#-]{1,}$/u.test(w)) out.push(w.toLowerCase())
  })
  return out
}

/** La reformulation reste-t-elle fidèle au paragraphe d'origine ? */
export function faithful(orig: string, out: string, ratio: [number, number] = [0.6, 1.5], allowLoss = false): boolean {
  if (!out || out.length < 20) return false
  if (/[[\]{}<>]|\bXXX\b|\.\.\.\s*$|\n-\s/.test(out)) return false
  const r = words(out) / Math.max(1, words(orig))
  if (r < ratio[0] || r > ratio[1]) return false
  const src = numbers(orig)
  for (const n of numbers(out)) if (!src.has(n)) return false
  const low = orig.toLowerCase()
  for (const w of properNouns(out)) if (!low.includes(w)) return false
  // Les noms propres importants de l'original (entreprise, poste…) doivent rester.
  const kept = out.toLowerCase()
  const lost = properNouns(orig).filter((w) => w.length > 3 && !kept.includes(w))
  return allowLoss || lost.length <= 1
}

/** Applique une consigne à chaque paragraphe, en ne gardant que les reformulations fidèles. */
export async function localPolish(
  id: string,
  letter: string,
  instruction: string,
  lang: Lang,
  ratio?: [number, number],
  onChunk?: (text: string) => void,
  /** Raccourcir : retirer des détails est permis (en ajouter reste interdit). */
  allowLoss = false
): Promise<{ text: string; changed: number }> {
  const paras = letter.split(/\n\s*\n/)
  const out: string[] = []
  let changed = 0
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i]
    if (!p.trim() || isFixed(p, i, paras.length)) {
      out.push(p.trim())
      continue
    }
    let rewritten = ''
    try {
      rewritten = clean(await localGenerate(id, lang === 'en' ? SYSTEM_EN : SYSTEM_FR, [{ role: 'user', content: `Consigne : ${instruction}\n\nParagraphe :\n${p.trim()}` }], { maxTokens: 420 }))
    } catch {
      rewritten = ''
    }
    const ok = faithful(p, rewritten, ratio, allowLoss)
    out.push(ok ? rewritten : p.trim())
    if (ok) changed++
    onChunk?.(out.join('\n\n'))
  }
  return { text: out.join('\n\n'), changed }
}

/** Lettre complète avec le modèle local : brouillon guidé puis reformulation fidèle. */
export async function localLetter(id: string, resume: Resume, offer: Offer | undefined, o: LetterOptions): Promise<string> {
  const draft = draftLetter(resume, offer, o)
  const tone = o.tone.split(' (')[0]
  const instruction =
    o.lang === 'en'
      ? `Make this paragraph more natural and fluent, with a ${tone} tone. Same facts, similar length.`
      : `Rends ce paragraphe plus naturel et fluide, avec un ton ${tone}. Mêmes faits, longueur proche.`
  return (await localPolish(id, draft, instruction, o.lang)).text
}

/** Retouche avec le modèle local ; « Raccourcir » exige un paragraphe nettement plus court. */
export async function localRevise(id: string, body: string, instruction: string, lang: Lang): Promise<string> {
  const shorten = /raccourcis|shorten|plus court|maximum \d+ mots/i.test(instruction)
  // Consigne simple et directe : les petits modèles suivent mal « raccourcis d'un tiers ».
  const simple = shorten ? (lang === 'en' ? 'Summarize this paragraph in one or two sentences, keeping the key facts.' : 'Résume ce paragraphe en une ou deux phrases, en gardant les faits importants.') : instruction
  const res = await localPolish(id, body, simple, lang, shorten ? [0.25, 0.9] : [0.6, 1.5], undefined, shorten)
  return res.text
}
