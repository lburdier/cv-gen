// Studio de design : 200 modèles = 20 structures (mise en page, en-tête, typographie, décors)
// × 10 palettes. Chaque modèle est un design complet rendu par CvCustom, entièrement réglable
// (onglet Design du formulaire, toile) et exportable aussi en version ATS une colonne.
import { DEFAULT_DESIGN, normalizeDesign } from '../../../shared/design'
import type { DesignSpec, Resume } from '../../../shared/types'

/** « plain » : colonne latérale de la couleur de la page, séparée par un filet. */
type Tone = 'light' | 'tinted' | 'plain' | 'dark-side' | 'dark'
/** Couleur de l'en-tête : couleur principale, teinte claire, très foncée ou fond de page. */
type HeaderFill = 'primary' | 'tint' | 'deep' | 'page'

interface Structure {
  id: string
  name: string
  family: string
  tagline: string
  tone: Tone
  headerFill: HeaderFill
  design: Partial<DesignSpec>
}

interface Palette {
  id: string
  name: string
  primary: string
  secondary: string
  /** Famille de couleur pour le filtre de la galerie. */
  hue: string
}

export const DESIGN_PALETTES: Palette[] = [
  { id: 'corail', name: 'Corail', primary: '#E4572E', secondary: '#FFC857', hue: 'Rouge' },
  { id: 'menthe', name: 'Menthe', primary: '#0F9D8A', secondary: '#9BE8D4', hue: 'Vert' },
  { id: 'indigo', name: 'Indigo', primary: '#3D3BF3', secondary: '#F0A6F7', hue: 'Bleu' },
  { id: 'encre', name: 'Encre', primary: '#111827', secondary: '#C6F432', hue: 'Noir' },
  { id: 'ocre', name: 'Ocre', primary: '#B7791F', secondary: '#F6D365', hue: 'Jaune' },
  { id: 'prune', name: 'Prune', primary: '#7C3AED', secondary: '#FBCFE8', hue: 'Violet' },
  { id: 'ocean', name: 'Océan', primary: '#0369A1', secondary: '#7DD3FC', hue: 'Bleu' },
  { id: 'foret', name: 'Forêt', primary: '#166534', secondary: '#BEF264', hue: 'Vert' },
  { id: 'cerise', name: 'Cerise', primary: '#BE123C', secondary: '#FDA4AF', hue: 'Rose' },
  { id: 'ardoise', name: 'Ardoise', primary: '#334155', secondary: '#94A3B8', hue: 'Gris' }
]

// Structures inspirées des CV de référence (agences de design, cabinets, éditeurs de modèles primés) :
// hiérarchie typographique nette, beaucoup d'air, une couleur d'accent, séparateurs fins, décors rares.
const STRUCTURES: Structure[] = [
  {
    id: 'atlas',
    name: 'Atlas',
    family: 'Colonne',
    tagline: 'Le grand classique moderne : colonne latérale teintée avec photo et coordonnées, titres à filet, parcours en frise.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'sidebar-left', sidebarWidth: 31, header: 'minimal', photo: 'circle', photoPlace: 'sidebar', headings: 'rule', decor: 'none', icons: true, skills: 'chips', timeline: true }
  },
  {
    id: 'horizon',
    name: 'Horizon',
    family: 'Bandeau',
    tagline: 'Bandeau de couleur au bord légèrement arrondi, photo et nom centrés, titres à filet.',
    tone: 'light',
    headerFill: 'primary',
    design: { layout: 'single', header: 'band', headerShape: 'curve', headerAlign: 'center', photo: 'circle', photoPlace: 'header', headings: 'rule', displayFont: 'sans', decor: 'none', icons: true, skills: 'chips' }
  },
  {
    id: 'editorial',
    name: 'Éditorial',
    family: 'Éditorial',
    tagline: 'Mise en page de magazine : grand nom en serif, intitulés dans la marge de gauche, filets fins.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'minimal', photo: 'none', headings: 'rail', bodyFont: 'serif', displayFont: 'serif', nameSize: 'xl', nameStyle: 'plain', skills: 'list', timeline: false, bullets: 'dash' }
  },
  {
    id: 'studio',
    name: 'Studio',
    family: 'Bandeau',
    tagline: 'En-tête très sombre pleine largeur avec photo, colonne de droite séparée par un filet.',
    tone: 'plain',
    headerFill: 'deep',
    design: { layout: 'sidebar-right', sidebarWidth: 30, header: 'band', headerShape: 'flat', photo: 'rounded', photoPlace: 'header', photoSide: 'right', headings: 'rule', displayFont: 'wide', decor: 'none', nameCase: 'upper', icons: true }
  },
  {
    id: 'mono',
    name: 'Mono',
    family: 'Tech',
    tagline: 'Esprit développeur : titres à chasse fixe, liseré d’accent en haut, compétences en colonnes.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'split', photo: 'none', headings: 'rule', bodyFont: 'sans', displayFont: 'mono', skills: 'columns', corners: 'square', decor: 'none', bullets: 'square', frame: 'top' }
  },
  {
    id: 'galet',
    name: 'Galet',
    family: 'Doux',
    tagline: 'Tons doux et coins arrondis : en-tête en carte, expériences en cartes, une forme discrète.',
    tone: 'tinted',
    headerFill: 'tint',
    design: { layout: 'sidebar-left', sidebarWidth: 32, header: 'card', photo: 'circle', photoPlace: 'sidebar', headings: 'highlight', decor: 'blobs', entries: 'cards', skills: 'chips', icons: true }
  },
  {
    id: 'signal',
    name: 'Signal',
    family: 'Audacieux',
    tagline: 'Bandeau plein et nom en capitales géantes, corps sobre à une colonne, puces carrées.',
    tone: 'light',
    headerFill: 'primary',
    design: { layout: 'single', header: 'band', headerShape: 'flat', photo: 'none', headings: 'rule', displayFont: 'wide', nameCase: 'upper', nameSize: 'xl', decor: 'none', bullets: 'square', corners: 'square' }
  },
  {
    id: 'prisme',
    name: 'Prisme',
    family: 'Colonne',
    tagline: 'Colonne sombre en texte clair avec photo, cercles fins en tête de colonne, corps très lisible.',
    tone: 'dark-side',
    headerFill: 'page',
    design: { layout: 'sidebar-left', sidebarWidth: 31, header: 'minimal', photo: 'circle', photoPlace: 'sidebar', headings: 'rule', decor: 'circles', nameStyle: 'accent', skills: 'chips', icons: true }
  },
  {
    id: 'ligne',
    name: 'Ligne',
    family: 'Minimal',
    tagline: 'Le CV « à l’anglo-saxonne » : une colonne, filets fins, tirets, aucune fioriture.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'minimal', photo: 'none', headings: 'underline', displayFont: 'serif', timeline: false, entries: 'rule', bullets: 'dash', skills: 'list', nameStyle: 'plain' }
  },
  {
    id: 'canopee',
    name: 'Canopée',
    family: 'Colonne',
    tagline: 'Colonne de droite teintée, nom en serif, titres en capitales espacées, photo ronde.',
    tone: 'tinted',
    headerFill: 'page',
    design: { layout: 'sidebar-right', sidebarWidth: 33, header: 'minimal', photo: 'circle', photoPlace: 'sidebar', headings: 'caps', displayFont: 'serif', decor: 'none', skills: 'chips', icons: true }
  },
  {
    id: 'neon',
    name: 'Néon',
    family: 'Tech',
    tagline: 'En-tête nuit avec trame de points, accent vif, titres à barre : pour les profils tech et créatifs.',
    tone: 'light',
    headerFill: 'deep',
    design: { layout: 'single', header: 'band', headerShape: 'flat', photo: 'none', headings: 'bar', displayFont: 'mono', bodyFont: 'sans', decor: 'dots', nameStyle: 'accent', nameSize: 'xl', bullets: 'arrow', icons: true }
  },
  {
    id: 'origami',
    name: 'Origami',
    family: 'Bandeau',
    tagline: 'Bandeau coloré, photo carrée, colonne latérale séparée par un filet, expériences en cartes.',
    tone: 'plain',
    headerFill: 'primary',
    design: { layout: 'sidebar-left', sidebarWidth: 30, header: 'band', headerShape: 'flat', photo: 'square', photoPlace: 'header', headings: 'rule', decor: 'none', entries: 'cards', corners: 'square', icons: true }
  },
  {
    id: 'boreal',
    name: 'Boréal',
    family: 'Doux',
    tagline: 'Carte d’en-tête centrée avec photo, titres en pastilles, puces fléchées.',
    tone: 'tinted',
    headerFill: 'tint',
    design: { layout: 'single', header: 'card', headerAlign: 'center', photo: 'circle', photoPlace: 'header', headings: 'pill', decor: 'none', bullets: 'arrow', skills: 'chips', icons: true }
  },
  {
    id: 'archive',
    name: 'Archive',
    family: 'Éditorial',
    tagline: 'Élégance de cabinet : serif, cadre fin, intitulés dans la marge, coordonnées à droite.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'split', photo: 'none', headings: 'rail', bodyFont: 'serif', displayFont: 'serif', decor: 'none', nameStyle: 'plain', skills: 'list', corners: 'square', frame: 'border' }
  },
  {
    id: 'vague',
    name: 'Vague',
    family: 'Bandeau',
    tagline: 'Grand bandeau à bord arrondi sur toute la largeur, colonne latérale, titres surlignés.',
    tone: 'light',
    headerFill: 'primary',
    design: { layout: 'sidebar-left', sidebarWidth: 32, header: 'band', headerShape: 'curve', photo: 'circle', photoPlace: 'header', headings: 'highlight', decor: 'none', skills: 'chips', icons: true }
  },
  {
    id: 'pixel',
    name: 'Pixel',
    family: 'Tech',
    tagline: 'Colonne de droite à filet, titres à chasse fixe, compétences en colonnes, coins nets.',
    tone: 'plain',
    headerFill: 'page',
    design: { layout: 'sidebar-right', sidebarWidth: 29, header: 'minimal', photo: 'square', photoPlace: 'sidebar', headings: 'bar', displayFont: 'mono', decor: 'none', bullets: 'square', corners: 'square', skills: 'columns' }
  },
  {
    id: 'satin',
    name: 'Satin',
    family: 'Minimal',
    tagline: 'Élégance centrée : grand nom en serif, liseré fin en haut, aucune fioriture.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'minimal', headerAlign: 'center', photo: 'none', headings: 'rule', displayFont: 'serif', nameSize: 'xl', nameStyle: 'plain', timeline: false, skills: 'list', frame: 'top' }
  },
  {
    id: 'kinetique',
    name: 'Kinétique',
    family: 'Audacieux',
    tagline: 'En-tête très sombre, nom en capitales, liseré de couleur sur le côté, puces fléchées.',
    tone: 'light',
    headerFill: 'deep',
    design: { layout: 'single', header: 'band', headerShape: 'flat', photo: 'circle', photoPlace: 'header', photoSide: 'right', headings: 'rule', displayFont: 'wide', nameCase: 'upper', decor: 'none', bullets: 'arrow', frame: 'side', icons: true }
  },
  {
    id: 'jardin',
    name: 'Jardin',
    family: 'Doux',
    tagline: 'Colonne large aux formes douces, en-tête en carte, pastilles et puces cochées.',
    tone: 'tinted',
    headerFill: 'tint',
    design: { layout: 'sidebar-left', sidebarWidth: 34, header: 'card', photo: 'circle', photoPlace: 'sidebar', headings: 'pill', decor: 'blobs', bullets: 'check', skills: 'chips', icons: true }
  },
  {
    id: 'contraste',
    name: 'Contraste',
    family: 'Audacieux',
    tagline: 'Colonne de droite très sombre, bandeau plein, nom surligné : fort contraste, lecture immédiate.',
    tone: 'dark-side',
    headerFill: 'primary',
    design: { layout: 'sidebar-right', sidebarWidth: 31, header: 'band', headerShape: 'flat', photo: 'rounded', photoPlace: 'sidebar', headings: 'bar', decor: 'none', nameStyle: 'highlight', corners: 'square', icons: true }
  }
]

// ---------- Couleurs ----------

const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
/** Mélange de deux couleurs (t = part de b). */
function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return '#' + pa.map((v, i) => hex(v + (pb[i] - v) * t)).join('').toUpperCase()
}

function colorsFor(s: Structure, p: Palette): DesignSpec['colors'] {
  const tint = mixHex(p.primary, '#FFFFFF', 0.9)
  const deep = mixHex(p.primary, '#0B0B10', 0.78)
  const page = s.tone === 'tinted' ? mixHex(p.secondary, '#FFFFFF', 0.86) : s.tone === 'dark' ? '#0F1115' : '#FFFFFF'
  const text = s.tone === 'dark' ? '#F4F4F2' : '#16181D'
  const sidebar = s.tone === 'dark-side' ? deep : s.tone === 'tinted' ? mixHex(p.primary, '#FFFFFF', 0.86) : s.tone === 'plain' ? page : tint
  const header = s.headerFill === 'primary' ? p.primary : s.headerFill === 'deep' ? deep : s.headerFill === 'tint' ? tint : page
  return { primary: p.primary, secondary: p.secondary, page, text, sidebar, header }
}

// ---------- Catalogue ----------

export interface DesignTemplate {
  id: string
  name: string
  tagline: string
  family: string
  palette: string
  hue: string
  dark: boolean
  design: DesignSpec
}

export const DESIGN_FAMILIES = [...new Set(STRUCTURES.map((s) => s.family))]
export const DESIGN_STRUCTURES = STRUCTURES.map((s) => ({ id: s.id, name: s.name, family: s.family }))

export const DESIGN_TEMPLATES: DesignTemplate[] = STRUCTURES.flatMap((s) =>
  DESIGN_PALETTES.map((p) => ({
    id: `d-${s.id}-${p.id}`,
    name: `${s.name} ${p.name}`,
    tagline: s.tagline,
    family: s.family,
    palette: p.name,
    hue: p.hue,
    dark: s.tone === 'dark-side' || s.headerFill === 'deep',
    design: normalizeDesign({ ...DEFAULT_DESIGN, ...s.design, colors: colorsFor(s, p) })
  }))
)

const BY_ID = new Map(DESIGN_TEMPLATES.map((t) => [t.id, t]))

export const isDesignTemplate = (id: string) => BY_ID.has(id)
export const designTemplate = (id: string) => BY_ID.get(id)

/** Modèles rendus par le moteur de design (studio + « Sur mesure »), donc éditables en toile et dans l'onglet Design. */
export const usesDesignEngine = (id: string) => id === 'sur-mesure' || BY_ID.has(id)

/**
 * Design effectif d'un CV : celui retouché par la personne pour ce modèle, sinon celui du modèle.
 * « Sur mesure » garde son design propre (recréé depuis une image).
 */
export function designOf(r: Pick<Resume, 'templateId' | 'design' | 'designFor'>): DesignSpec {
  const t = BY_ID.get(r.templateId)
  if (t) return r.design && r.designFor === r.templateId ? normalizeDesign(r.design, t.design) : t.design
  return normalizeDesign(r.design)
}
