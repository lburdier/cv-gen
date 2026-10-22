import type { Resume, SkillGroup } from '../../../shared/types'
import { resolveIcon, type IconDesign } from '../lib/iconBank'

/**
 * Icônes de logiciels devant les compétences, sur tous les modèles (ATS, studio, visuels, Inspirations).
 * Activées par groupe (SkillGroup.showIcons). L'icône est décorative (alt vide) : le nom reste en texte,
 * donc lisible par les ATS. La « PDF version ATS » les retire (voir actions.exportResume).
 */

/** Nom sans niveau ni pourcentage (« Blender - expert », « Figma 80 % » → « Blender », « Figma »). */
function bare(item: string) {
  return item
    .replace(/\s*[(:\-–]?\s*\d{1,3}\s*%\s*\)?\s*$/, '')
    .replace(/\s*[-–:(]\s*(expert|avancé|confirmé|intermédiaire|débutant|notions|advanced|intermediate|beginner)\s*\)?\s*$/i, '')
    .trim()
    .toLowerCase()
}

/** Icônes actives : case cochée, ou présentation « Tuiles d'outils » sur un modèle visuel. */
export function iconsOn(g: SkillGroup, visual = false) {
  return Boolean(g.showIcons) || (visual && g.display === 'tiles')
}

/** Icône d'un élément d'un groupe dont les icônes sont activées. */
export function groupIcon(g: SkillGroup, item: string, visual = false): string | undefined {
  if (!iconsOn(g, visual) || !item.trim()) return undefined
  const design = (g.iconStyle as IconDesign) ?? 'app'
  const auto = g.autoIcons !== false
  const custom = g.icons?.[item]
  // Sans icône choisie, on reconnaît aussi « Blender - expert » comme Blender.
  return resolveIcon(item, custom, design, auto) ?? (custom ? undefined : resolveIcon(bare(item), undefined, design, auto))
}

/** Recherche par nom, pour les modèles qui mélangent les groupes (Inspirations). */
export function iconLookup(r: Resume, visual = false): (name: string) => string | undefined {
  const map = new Map<string, string>()
  for (const g of r.skills) {
    if (!iconsOn(g, visual)) continue
    for (const item of g.items) {
      const icon = groupIcon(g, item, visual)
      if (!icon) continue
      for (const k of [item.toLowerCase(), bare(item)]) if (!map.has(k)) map.set(k, icon)
    }
  }
  return (name) => (map.size ? map.get(name.toLowerCase()) ?? map.get(bare(name)) : undefined)
}

export function SkillIcon({ src }: { src?: string }) {
  return src ? <img className="sk-ico" src={src} alt="" aria-hidden="true" /> : null
}
