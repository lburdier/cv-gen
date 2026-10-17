import type { AppData, Resume } from '../../../shared/types'
import { useStore } from '../store'
import { getTemplate } from '../templates/registry'
import { isEmptyResume } from './sample'

/**
 * Mode profil : vos informations saisies une seule fois (profil maître) sont reprises
 * par tous les modèles, presets, explorateurs et nouveaux CV.
 */

export function hasProfile(d: AppData): boolean {
  return Boolean(d.profile && !isEmptyResume(d.profile))
}

/** Profil actif pour les aperçus : rempli et mode profil non désactivé. */
export function activeProfile(d: AppData): Resume | null {
  return hasProfile(d) && d.profileMode !== false ? d.profile! : null
}

/** Hook : profil à utiliser pour les aperçus (ou null). */
export function useActiveProfile(): Resume | null {
  return useStore((s) => activeProfile(s.data))
}

/** Le profil mis en forme avec un modèle (et sa couleur, sauf couleurs imposées). */
export function profileAs(profile: Resume, templateId: string, opts: { accent?: string; accent2?: string; title?: string } = {}): Resume {
  const t = getTemplate(templateId)
  return {
    ...profile,
    id: `profile:${t.id}`,
    title: opts.title ?? `CV · ${t.name}`,
    templateId: t.id,
    accent: opts.accent ?? t.accent,
    font: t.font,
    accent2: opts.accent2,
    design: templateId === 'sur-mesure' ? profile.design : undefined
  }
}

/** Champs de contenu repris du profil (tout sauf la mise en forme et l'identifiant). */
const CONTENT_KEYS = ['basics', 'experiences', 'education', 'skills', 'projects', 'certifications', 'languages', 'interests', 'links', 'gallery', 'lang'] as const

export type SyncScope = 'contact' | 'all'

/** Reporte le profil sur un CV : coordonnées et photo seulement, ou tout le contenu. */
export function applyProfileTo(target: Resume, profile: Resume, scope: SyncScope): void {
  const p = structuredClone(profile)
  if (scope === 'all') {
    for (const k of CONTENT_KEYS) (target as unknown as Record<string, unknown>)[k] = p[k]
    return
  }
  const b = p.basics
  Object.assign(target.basics, {
    firstName: b.firstName,
    lastName: b.lastName,
    email: b.email,
    phone: b.phone,
    location: b.location,
    website: b.website,
    linkedin: b.linkedin,
    github: b.github,
    ...(b.mobility ? { mobility: b.mobility } : {}),
    ...(b.photo ? { photo: b.photo } : {})
  })
  if (p.links?.length) target.links = p.links
}

/** Taux de complétion du profil et ce qu'il manque. */
export function profileCompletion(p: Resume | undefined): { percent: number; missing: string[] } {
  if (!p) return { percent: 0, missing: ['Identité', 'Expériences', 'Formation', 'Compétences'] }
  const b = p.basics
  const checks: [boolean, string][] = [
    [Boolean(b.firstName.trim() && b.lastName.trim()), 'Nom et prénom'],
    [Boolean(b.headline.trim()), 'Titre du poste'],
    [Boolean(b.email.trim()), 'E-mail'],
    [Boolean(b.phone.trim()), 'Téléphone'],
    [Boolean(b.location.trim()), 'Ville'],
    [Boolean(b.summary.trim().length > 80), 'Profil (3 à 4 phrases)'],
    [p.experiences.length > 0, 'Expériences'],
    [p.experiences.some((e) => e.bullets.filter((x) => x.trim()).length >= 2), 'Réalisations détaillées'],
    [p.education.length > 0, 'Formation'],
    [p.skills.reduce((n, g) => n + g.items.length, 0) >= 6, 'Compétences (6 ou plus)'],
    [p.languages.length > 0, 'Langues'],
    [Boolean(b.photo), 'Photo (modèles visuels)']
  ]
  const done = checks.filter(([ok]) => ok).length
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, l]) => l) }
}
