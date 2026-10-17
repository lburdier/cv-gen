// Import d'un CV existant (PDF, Word, texte). Lecture locale d'abord (sans IA, sans réseau) ;
// avec une clé IA, l'IA structure le CV et la lecture locale complète ce qu'elle a laissé vide.
// Si l'IA échoue (quota, réseau, réponse illisible), l'import local est conservé.
import { extname } from 'path'
import { parseResume, pdfLines, textLines, type ParseLine } from '../shared/cvParse'
import { noDashDeep } from '../shared/format'
import type { CvImport, ImportedResume } from '../shared/types'
import { importResumeAi } from './ai'
import { extractPdf } from './pdfText'
import { getSettings } from './storage'

export class ImportError extends Error {}

async function readLines(name: string, buf: Buffer): Promise<{ lines: ParseLine[]; pdf?: Buffer }> {
  const ext = extname(name).toLowerCase()
  if (ext === '.pdf' || buf.subarray(0, 5).toString('latin1') === '%PDF-') {
    let ex
    try {
      ex = extractPdf(buf)
    } catch {
      throw new ImportError('Ce PDF est illisible ou endommagé. Réenregistrez-le depuis votre traitement de texte, puis réessayez.')
    }
    if (ex.encrypted) throw new ImportError('Ce PDF est protégé par un mot de passe. Enregistrez une copie sans protection, puis réessayez.')
    return { lines: pdfLines(ex), pdf: buf }
  }
  if (ext === '.docx') {
    const mammoth = await import('mammoth')
    return { lines: textLines((await mammoth.extractRawText({ buffer: buf })).value) }
  }
  if (ext === '.doc') throw new ImportError('Les anciens fichiers .doc ne sont pas pris en charge : enregistrez le CV en PDF ou en .docx.')
  return { lines: textLines(buf.toString('utf8')) }
}

/** Complète les champs vides du résultat de l'IA avec ceux de la lecture locale (coordonnées surtout). */
function complete(ai: ImportedResume, local: ImportedResume): ImportedResume {
  const basics = { ...ai.basics }
  for (const k of Object.keys(local.basics) as (keyof typeof basics)[]) if (!basics[k] && local.basics[k]) (basics as Record<string, unknown>)[k] = local.basics[k]
  const pick = <T>(a: T[], b: T[]) => (a.length ? a : b)
  return {
    ...ai,
    basics,
    experiences: pick(ai.experiences, local.experiences),
    education: pick(ai.education, local.education),
    skills: pick(ai.skills, local.skills),
    projects: pick(ai.projects, local.projects),
    certifications: pick(ai.certifications, local.certifications),
    languages: pick(ai.languages, local.languages),
    interests: ai.interests || local.interests
  }
}

export async function importCv(name: string, bytes: Uint8Array, mode: 'auto' | 'local' = 'auto'): Promise<CvImport> {
  const buf = Buffer.from(bytes)
  const { lines, pdf } = await readLines(name, buf)
  const text = lines.map((l) => l.text).join('\n')
  if (text.replace(/\s/g, '').length < 60) {
    throw new ImportError(
      pdf
        ? 'Ce PDF ne contient pas de texte lisible : c’est sans doute un scan ou une image. Utilisez « Recréer depuis une image » pour le reconstruire.'
        : 'Ce fichier ne contient presque pas de texte.'
    )
  }
  const local = noDashDeep(parseResume(lines))
  const s = getSettings()
  if (mode === 'local' || !s.hasApiKey) return { resume: local, method: 'local' }
  try {
    const ai = await importResumeAi({ pdf, text })
    return { resume: complete(ai, local), method: 'ai' }
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    return { resume: local, method: 'local', note: `L’IA n’a pas pu structurer le CV (${why.replace(/\.$/, '')}). La lecture locale a été utilisée.` }
  }
}
