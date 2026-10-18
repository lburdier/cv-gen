// Studio de design : 500 modèles = 50 structures (mise en page, en-tête, typographie, décors)
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
  },

  // ---------- Collection 2 : trente structures de plus (300 modèles), même moteur, mêmes fonctions ----------
  {
    id: 'meridien',
    name: 'Méridien',
    family: 'Corporate',
    tagline: 'Pour le conseil et la finance : nom en serif, coordonnées à droite, colonne fine, parcours sur filets.',
    tone: 'plain',
    headerFill: 'page',
    design: { layout: 'sidebar-right', sidebarWidth: 28, header: 'split', photo: 'none', headings: 'rule', displayFont: 'serif', nameStyle: 'plain', skills: 'list', timeline: false, entries: 'rule', bullets: 'dash', icons: true }
  },
  {
    id: 'lumen',
    name: 'Lumen',
    family: 'Minimal',
    tagline: 'Tout est centré et respire : photo ronde, grand nom, titres en capitales espacées.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'minimal', headerAlign: 'center', photo: 'circle', photoPlace: 'header', headings: 'caps', nameSize: 'xl', nameStyle: 'plain', skills: 'chips', timeline: false, bullets: 'dot', icons: true }
  },
  {
    id: 'cadence',
    name: 'Cadence',
    family: 'Compact',
    tagline: 'Dense mais lisible : beaucoup de contenu sur une page, titres à barre, compétences en colonnes.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'split', photo: 'none', headings: 'bar', density: 'compact', skills: 'columns', bullets: 'square', corners: 'square', nameSize: 'm' }
  },
  {
    id: 'oree',
    name: 'Orée',
    family: 'Doux',
    tagline: 'Carte d’en-tête aux vagues légères, colonne teintée avec photo, parcours en cartes.',
    tone: 'tinted',
    headerFill: 'tint',
    design: { layout: 'sidebar-left', sidebarWidth: 34, header: 'card', photo: 'rounded', photoPlace: 'sidebar', headings: 'pill', decor: 'waves', entries: 'cards', bullets: 'check', skills: 'chips', icons: true }
  },
  {
    id: 'sillage',
    name: 'Sillage',
    family: 'Bandeau',
    tagline: 'Bandeau sombre au bord ondulé, nom en serif, photo à droite, une colonne aérée.',
    tone: 'light',
    headerFill: 'deep',
    design: { layout: 'single', header: 'band', headerShape: 'wave', photo: 'circle', photoPlace: 'header', photoSide: 'right', headings: 'rule', displayFont: 'serif', nameStyle: 'plain', decor: 'none', icons: true }
  },
  {
    id: 'nova',
    name: 'Nova',
    family: 'Audacieux',
    tagline: 'Bandeau plein, nom en capitales géantes, photo carrée, titres en blocs de couleur.',
    tone: 'light',
    headerFill: 'primary',
    design: { layout: 'sidebar-left', sidebarWidth: 30, header: 'band', headerShape: 'flat', photo: 'square', photoPlace: 'header', headings: 'block', displayFont: 'wide', nameCase: 'upper', nameSize: 'xl', corners: 'square', decor: 'none' }
  },
  {
    id: 'vertex',
    name: 'Vertex',
    family: 'Tech',
    tagline: 'Liseré latéral, titres à chasse fixe, colonne de droite à filet et puces fléchées.',
    tone: 'plain',
    headerFill: 'page',
    design: { layout: 'sidebar-right', sidebarWidth: 28, header: 'minimal', photo: 'none', headings: 'bar', displayFont: 'mono', skills: 'columns', bullets: 'arrow', frame: 'side', corners: 'square' }
  },
  {
    id: 'quartz',
    name: 'Quartz',
    family: 'Élégant',
    tagline: 'Cadre fin, serif partout, nom en capitales centré : la sobriété d’un faire-part.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'minimal', headerAlign: 'center', photo: 'none', headings: 'underline', bodyFont: 'serif', displayFont: 'serif', nameCase: 'upper', nameStyle: 'plain', frame: 'border', entries: 'rule', timeline: false, skills: 'list' }
  },
  {
    id: 'alpin',
    name: 'Alpin',
    family: 'Colonne',
    tagline: 'Colonne fine teintée avec photo, nom en dégradé, titres surlignés et frise.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'sidebar-left', sidebarWidth: 28, header: 'minimal', photo: 'circle', photoPlace: 'sidebar', headings: 'highlight', nameStyle: 'gradient', skills: 'chips', timeline: true, icons: true }
  },
  {
    id: 'delta',
    name: 'Delta',
    family: 'Corporate',
    tagline: 'Bandeau pâle, photo à droite, une colonne très lisible : le CV d’entreprise par excellence.',
    tone: 'light',
    headerFill: 'tint',
    design: { layout: 'single', header: 'band', headerShape: 'flat', photo: 'rounded', photoPlace: 'header', photoSide: 'right', headings: 'underline', nameStyle: 'plain', skills: 'list', bullets: 'dot', icons: true }
  },
  {
    id: 'echo',
    name: 'Écho',
    family: 'Éditorial',
    tagline: 'Intitulés dans la marge, grand nom en serif, liseré d’accent en haut de page.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'minimal', photo: 'none', headings: 'rail', displayFont: 'serif', nameSize: 'xl', nameStyle: 'accent', skills: 'list', bullets: 'dash', frame: 'top', timeline: false }
  },
  {
    id: 'fjord',
    name: 'Fjord',
    family: 'Colonne',
    tagline: 'Colonne de droite sombre avec photo, nom en serif, titres en capitales espacées.',
    tone: 'dark-side',
    headerFill: 'page',
    design: { layout: 'sidebar-right', sidebarWidth: 32, header: 'minimal', photo: 'circle', photoPlace: 'sidebar', headings: 'caps', displayFont: 'serif', nameStyle: 'plain', skills: 'chips', icons: true }
  },
  {
    id: 'halo',
    name: 'Halo',
    family: 'Doux',
    tagline: 'Carte d’en-tête centrée à fine trame de points, photo ronde, titres surlignés.',
    tone: 'tinted',
    headerFill: 'tint',
    design: { layout: 'single', header: 'card', headerAlign: 'center', photo: 'circle', photoPlace: 'header', headings: 'highlight', decor: 'dots', entries: 'cards', skills: 'chips', icons: true }
  },
  {
    id: 'kairos',
    name: 'Kairos',
    family: 'Créatif',
    tagline: 'Bandeau arrondi à cercles fins, nom surligné, large colonne et pastilles.',
    tone: 'light',
    headerFill: 'primary',
    design: { layout: 'sidebar-left', sidebarWidth: 35, header: 'band', headerShape: 'curve', photo: 'circle', photoPlace: 'header', headings: 'pill', displayFont: 'wide', nameStyle: 'highlight', decor: 'circles', skills: 'chips', icons: true }
  },
  {
    id: 'lotus',
    name: 'Lotus',
    family: 'Élégant',
    tagline: 'Fond teinté, serif, colonne avec photo et titres en capitales : élégant et chaleureux.',
    tone: 'tinted',
    headerFill: 'page',
    design: { layout: 'sidebar-left', sidebarWidth: 30, header: 'minimal', photo: 'circle', photoPlace: 'sidebar', headings: 'caps', bodyFont: 'serif', displayFont: 'serif', nameStyle: 'plain', skills: 'list', timeline: false, icons: true }
  },
  {
    id: 'mistral',
    name: 'Mistral',
    family: 'Bandeau',
    tagline: 'Bandeau nuit centré à grille discrète, nom en capitales, colonne de droite à filet.',
    tone: 'plain',
    headerFill: 'deep',
    design: { layout: 'sidebar-right', sidebarWidth: 30, header: 'band', headerShape: 'flat', headerAlign: 'center', photo: 'circle', photoPlace: 'header', headings: 'underline', nameCase: 'upper', nameStyle: 'plain', decor: 'grid', icons: true }
  },
  {
    id: 'nord',
    name: 'Nord',
    family: 'Minimal',
    tagline: 'Colonne étroite sans couleur, grand nom, filets et tirets : le minimalisme scandinave.',
    tone: 'plain',
    headerFill: 'page',
    design: { layout: 'sidebar-left', sidebarWidth: 26, header: 'minimal', photo: 'none', headings: 'rule', nameSize: 'xl', nameStyle: 'plain', skills: 'list', timeline: false, bullets: 'dash' }
  },
  {
    id: 'opale',
    name: 'Opale',
    family: 'Doux',
    tagline: 'Bandeau pâle arrondi et centré, photo ronde, titres en pastilles, puces cochées.',
    tone: 'tinted',
    headerFill: 'tint',
    design: { layout: 'single', header: 'band', headerShape: 'curve', headerAlign: 'center', photo: 'circle', photoPlace: 'header', headings: 'pill', decor: 'none', bullets: 'check', entries: 'cards', skills: 'chips', icons: true }
  },
  {
    id: 'pivot',
    name: 'Pivot',
    family: 'Tech',
    tagline: 'En-tête en deux parties, titres en blocs à chasse fixe, liseré en haut, puces fléchées.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'split', photo: 'none', headings: 'block', displayFont: 'mono', skills: 'columns', bullets: 'arrow', corners: 'square', frame: 'top' }
  },
  {
    id: 'rivage',
    name: 'Rivage',
    family: 'Colonne',
    tagline: 'Carte d’en-tête pâle, colonne teintée avec photo, parcours séparés par des filets.',
    tone: 'light',
    headerFill: 'tint',
    design: { layout: 'sidebar-left', sidebarWidth: 33, header: 'card', photo: 'rounded', photoPlace: 'sidebar', headings: 'underline', entries: 'rule', skills: 'chips', icons: true }
  },
  {
    id: 'ulysse',
    name: 'Ulysse',
    family: 'Créatif',
    tagline: 'Bandeau nuit à points, nom en dégradé, colonne de droite teintée avec photo.',
    tone: 'tinted',
    headerFill: 'deep',
    design: { layout: 'sidebar-right', sidebarWidth: 32, header: 'band', headerShape: 'flat', photo: 'circle', photoPlace: 'sidebar', headings: 'highlight', displayFont: 'wide', nameCase: 'upper', nameStyle: 'gradient', decor: 'dots', skills: 'chips', icons: true }
  },
  {
    id: 'velin',
    name: 'Vélin',
    family: 'Élégant',
    tagline: 'Le classique à la française : serif, colonne étroite avec formation et compétences.',
    tone: 'plain',
    headerFill: 'page',
    design: { layout: 'sidebar-left', sidebarWidth: 27, header: 'minimal', photo: 'none', headings: 'caps', bodyFont: 'serif', displayFont: 'serif', nameStyle: 'plain', skills: 'list', timeline: false, sidebarSections: ['education', 'skills', 'languages', 'interests'] }
  },
  {
    id: 'zenith',
    name: 'Zénith',
    family: 'Audacieux',
    tagline: 'Bandeau nuit centré, nom en capitales géantes et contour, titres à barre.',
    tone: 'light',
    headerFill: 'deep',
    design: { layout: 'single', header: 'band', headerShape: 'flat', headerAlign: 'center', photo: 'none', headings: 'bar', displayFont: 'wide', nameCase: 'upper', nameSize: 'xl', nameStyle: 'outline', decor: 'none' }
  },
  {
    id: 'albatre',
    name: 'Albâtre',
    family: 'Minimal',
    tagline: 'Une colonne claire, photo ronde à droite du nom, compétences en pastilles et frise.',
    tone: 'light',
    headerFill: 'page',
    design: { layout: 'single', header: 'minimal', photo: 'circle', photoPlace: 'header', photoSide: 'right', headings: 'underline', nameStyle: 'accent', skills: 'chips', timeline: true, bullets: 'dot', icons: true }
  },
  {
    id: 'boussole',
    name: 'Boussole',
    family: 'Corporate',
    tagline: 'Bandeau plein, colonne pâle avec photo et certifications, titres à filet.',
    tone: 'light',
    headerFill: 'primary',
    design: { layout: 'sidebar-left', sidebarWidth: 30, header: 'band', headerShape: 'flat', photo: 'circle', photoPlace: 'sidebar', headings: 'rule', nameStyle: 'plain', decor: 'none', icons: true, sidebarSections: ['skills', 'certifications', 'languages', 'interests'] }
  },
  {
    id: 'carnet',
    name: 'Carnet',
    family: 'Compact',
    tagline: 'Compact et net : colonne de droite à filet, photo carrée, parcours sur filets.',
    tone: 'plain',
    headerFill: 'page',
    design: { layout: 'sidebar-right', sidebarWidth: 28, header: 'minimal', photo: 'square', photoPlace: 'sidebar', headings: 'caps', density: 'compact', skills: 'list', entries: 'rule', bullets: 'dash', corners: 'square', nameSize: 'm' }
  },
  {
    id: 'domaine',
    name: 'Domaine',
    family: 'Éditorial',
    tagline: 'Fond teinté, serif, liseré latéral et compétences en colonnes : un CV de revue.',
    tone: 'tinted',
    headerFill: 'page',
    design: { layout: 'single', header: 'split', photo: 'none', headings: 'underline', bodyFont: 'serif', displayFont: 'serif', nameSize: 'xl', nameStyle: 'plain', skills: 'columns', entries: 'rule', frame: 'side', timeline: false }
  },
  {
    id: 'escale',
    name: 'Escale',
    family: 'Bandeau',
    tagline: 'Bandeau coloré au bord ondulé, photo ronde, colonne latérale et pastilles.',
    tone: 'light',
    headerFill: 'primary',
    design: { layout: 'sidebar-left', sidebarWidth: 32, header: 'band', headerShape: 'wave', photo: 'circle', photoPlace: 'header', headings: 'pill', decor: 'none', skills: 'chips', icons: true }
  },
  {
    id: 'faubourg',
    name: 'Faubourg',
    family: 'Compact',
    tagline: 'Carte d’en-tête avec photo, titres en blocs, tout tient sur une page.',
    tone: 'light',
    headerFill: 'tint',
    design: { layout: 'single', header: 'card', photo: 'rounded', photoPlace: 'header', headings: 'block', density: 'compact', skills: 'chips', bullets: 'square', corners: 'square', icons: true }
  },
  {
    id: 'comete',
    name: 'Comète',
    family: 'Créatif',
    tagline: 'Colonne sombre semée de points, nom surligné, titres à barre et photo ronde.',
    tone: 'dark-side',
    headerFill: 'page',
    design: { layout: 'sidebar-left', sidebarWidth: 31, header: 'minimal', photo: 'circle', photoPlace: 'sidebar', headings: 'bar', displayFont: 'wide', nameStyle: 'highlight', decor: 'dots', skills: 'chips', icons: true }
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

const structureOf = (id: string) => STRUCTURES.find((s) => s.id === id.slice(2, id.lastIndexOf('-')))

/** Palette du catalogue la plus proche d'une couleur (pour nommer le modèle recoloré). */
export function nearestPalette(hex: string): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [r, g, b] = rgb(hex)
  const dist = (p: Palette) => rgb(p.primary).reduce((n, v, i) => n + (v - [r, g, b][i]) ** 2, 0)
  return DESIGN_PALETTES.reduce((best, p) => (dist(p) < dist(best) ? p : best)).id
}

/**
 * Modèle du studio recoloré avec une ou deux couleurs choisies (explorateur de couleurs) :
 * même structure, fonds, bandeau et teintes recalculés. L'identifiant suit la palette la plus proche.
 */
export function recolorStudio(templateId: string, primary: string, secondary?: string): { id: string; design: DesignSpec } | null {
  const s = structureOf(templateId)
  const t = BY_ID.get(templateId)
  if (!s || !t) return null
  const p: Palette = { id: 'custom', name: '', hue: '', primary, secondary: secondary ?? mixHex(primary, '#FFFFFF', 0.6) }
  return { id: `d-${s.id}-${nearestPalette(primary)}`, design: { ...t.design, colors: colorsFor(s, p) } }
}

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
