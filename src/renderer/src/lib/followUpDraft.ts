import type { FollowUpRequest, Resume } from '../../../shared/types'
import { shortDate } from './tracker'

const KIND_WORD: Record<FollowUpRequest['kind'], string> = { emploi: 'poste', stage: 'stage', alternance: 'alternance', mission: 'mission' }

/** Phrase de motivation reprise telle quelle (première lettre en minuscule pour s'insérer dans la phrase). */
function motive(m: string) {
  const t = m.trim().replace(/\s+/g, ' ').replace(/[.!]+$/, '')
  if (!t) return ''
  return t[0].toLowerCase() + t.slice(1)
}

/**
 * Trame de relance sans IA : structure éprouvée (rappel, motivation avec les mots de la personne,
 * atouts, proposition d'échange). Les crochets signalent ce qu'il reste à écrire soi-même.
 */
export function guidedFollowUp(req: FollowUpRequest, resume?: Resume, assets: string[] = []): string {
  const who = resume ? `${resume.basics.firstName} ${resume.basics.lastName}`.trim() : ''
  const first = resume?.basics.firstName || ''
  const word = KIND_WORD[req.kind]
  // Intitulé entre guillemets : « le stage de Stage Artiste 3D » sonnerait faux.
  const thing = req.title ? `« ${req.title} »` : `ce ${word}`
  const at = req.company ? ` chez ${req.company}` : ''
  const hello = req.contactName ? `Bonjour ${req.contactName.split(' ')[0]},` : 'Bonjour,'
  const why = motive(req.motivation)
  const strengths = assets.slice(0, 3).join(', ')
  const mail = req.channel === 'email'

  /** Termine une phrase sans doubler le point d'une abréviation (« 14 oct. »). */
  const end = (t: string) => (t.endsWith('.') ? t : t + '.')
  let body: string[]
  if (req.step === 'apres-entretien') {
    body = [
      end(`Merci pour notre échange${req.interviewAt ? ` du ${shortDate(req.interviewAt.slice(0, 10))}` : ''} au sujet de ${thing}${at}`),
      why ? `Il a confirmé mon envie de rejoindre l’équipe : ${why}.` : '[Un point précis de l’entretien qui renforce votre envie : l’équipe, un projet, une méthode.]',
      strengths ? `J’ai la conviction de pouvoir contribuer rapidement, notamment grâce à ${strengths}.` : '[Ce que vous apporterez concrètement, en une phrase.]',
      'Je reste disponible pour toute information complémentaire.'
    ]
  } else if (req.step === 'relance2') {
    body = [
      end(`Je me tourne de nouveau vers vous au sujet de ma candidature ${thing}${at}${req.appliedAt ? `, envoyée le ${shortDate(req.appliedAt)}` : ''}`),
      why ? `Ce ${word} m’intéresse toujours autant : ${why}.` : `Ce ${word} m’intéresse toujours autant. [Pourquoi, en une phrase.]`,
      'Si le recrutement est clos, un simple retour me serait précieux. Sinon, je reste disponible pour un échange quand cela vous conviendra.'
    ]
  } else {
    body = [
      end(`Je reviens vers vous au sujet de ma candidature ${thing}${at}${req.appliedAt ? `, envoyée le ${shortDate(req.appliedAt)}` : ''}`),
      why ? `Ce ${word} me motive particulièrement : ${why}.` : `[Pourquoi ce ${word} vous motive, avec vos mots : l’entreprise, les missions, ce que vous voulez apprendre ou apporter.]`,
      strengths ? `Mon parcours m’a permis de développer ${strengths}, que j’aimerais mettre au service de votre équipe.` : '[Un ou deux atouts concrets de votre CV liés à l’offre.]',
      'Seriez-vous disponible pour un court échange dans les prochains jours ?'
    ]
  }

  if (!mail) return [hello, '', body.join(' '), '', first || who].join('\n').trim()
  const subject = `Objet : ${req.step === 'apres-entretien' ? 'Merci pour notre échange' : 'Suivi de ma candidature'}${req.title ? `, ${req.title}` : ''}`
  return [subject, '', hello, '', ...body.flatMap((p) => [p, '']), 'Bien cordialement,', who || '[Prénom Nom]'].join('\n').trim()
}

/** Objet et corps d'un e-mail (première ligne « Objet : … »). */
export function splitSubject(text: string): { subject: string; body: string } {
  const m = /^\s*(?:Objet|Subject)\s*:\s*(.+)\n+/i.exec(text)
  return m ? { subject: m[1].trim(), body: text.slice(m[0].length).trim() } : { subject: '', body: text.trim() }
}
