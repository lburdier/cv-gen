import { DESIGN_TEMPLATES } from './designCatalog'
export interface TemplateDef {
  id: string
  name: string
  tagline: string
  accent: string
  font: string
  tags: string[]
  isNew?: boolean
  /** Mise en page visuelle (bandeau, colonnes, images) : exporter aussi la version ATS. */
  visual?: boolean
  /** Le modèle utilise une couleur secondaire (accent2). */
  secondary?: boolean
  /** Studio de design : famille (structure), palette, couleur dominante, en-tête ou colonne foncés. */
  studio?: { family: string; structure: string; palette: string; hue: string; dark: boolean }
  /** Couleur secondaire d'origine du modèle (collection « Reproductions »). */
  accent2?: string
  /** Profil d'exemple affiché par défaut : preset métier et genre de la personne. */
  sample?: { preset: string; gender: 'f' | 'm' }
}

/** Modèles d'origine (ATS une colonne et visuels faits main). */
export const CORE_TEMPLATES: TemplateDef[] = [
  {
    id: 'vitrine',
    name: 'Vitrine',
    tagline: 'Bandeau image, grand nom, photo, cartes et galerie de rendus : le CV portfolio.',
    accent: '#2FBF71',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    visual: true
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'La version nuit : fond noir, accent néon, tuiles d’outils. Pour les profils 3D, jeu vidéo, motion.',
    accent: '#7C83FF',
    font: 'inter',
    tags: ['Créatif', 'Tech'],
    visual: true
  },
  {
    id: 'folio',
    name: 'Folio',
    tagline: 'Clair et éditorial : en-tête lumineux, photo, colonnes de cartes et pastilles.',
    accent: '#111111',
    font: 'inter',
    tags: ['Créatif', 'Moderne'],
    visual: true
  },
  {
    id: 'colonne',
    name: 'Colonne',
    tagline: 'Barre latérale teintée avec photo, contacts et outils ; parcours aéré à droite.',
    accent: '#1F2937',
    font: 'inter',
    tags: ['Créatif', 'Moderne'],
    visual: true
  },
  {
    id: 'sur-mesure',
    name: 'Sur mesure',
    tagline: 'Recréé depuis l’image d’un CV : mise en page, couleurs, titres et polices entièrement réglables.',
    accent: '#2323E6',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    secondary: true,
    isNew: true,
    visual: true
  },
  {
    id: 'pop',
    name: 'Pop',
    tagline: 'Bleu électrique et rose : en-tête en trame de points, photo ronde, pastilles étoilées et frise à points.',
    accent: '#2323E6',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    secondary: true,
    isNew: true,
    visual: true
  },
  {
    id: 'calque',
    name: 'Calque',
    tagline: 'Look d’outil de design : photo dans un cadre de sélection, titres surlignés, frise en pointillés et anneaux de niveau.',
    accent: '#C6F432',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    secondary: true,
    isNew: true,
    visual: true
  },
  {
    id: 'manifeste',
    name: 'Manifeste',
    tagline: 'Votre nom et votre métier en une phrase géante, pastilles et tableau à filets : sobre et très design.',
    accent: '#111111',
    font: 'inter',
    tags: ['Créatif', 'Minimal'],
    secondary: true,
    isNew: true,
    visual: true
  },
  {
    id: 'affiche',
    name: 'Affiche',
    tagline: 'Grand aplat de couleur, nom monumental et image en duotone : un CV qui se voit de loin.',
    accent: '#0F6E5C',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    secondary: true,
    isNew: true,
    visual: true
  },
  {
    id: 'magazine',
    name: 'Magazine',
    tagline: 'Une de magazine : nom en serif italique, lettrine, photo noir et blanc, colonnes et mosaïque.',
    accent: '#B91C1C',
    font: 'inter',
    tags: ['Créatif', 'Classique'],
    secondary: true,
    isNew: true,
    visual: true
  },
  {
    id: 'brutal',
    name: 'Brutal',
    tagline: 'Néo-brutalisme : bordures épaisses, ombres décalées, étiquettes autocollantes et aplat fluo.',
    accent: '#C6F432',
    font: 'inter',
    tags: ['Créatif', 'Tech'],
    secondary: true,
    isNew: true,
    visual: true
  },
  {
    id: 'horizon',
    name: 'Horizon',
    tagline: 'Nom fin et gras sur deux tons, coordonnées alignées à droite, filets d’accent : moderne et aéré.',
    accent: '#BE185D',
    font: 'inter',
    tags: ['Moderne', 'Design'],
    secondary: true,
    isNew: true
  },
  {
    id: 'signal',
    name: 'Signal',
    tagline: 'Nom massif surligné, titres en chasse fixe, compétences en blocs : pour les profils tech.',
    accent: '#111111',
    font: 'inter',
    tags: ['Tech', 'Moderne'],
    secondary: true,
    isNew: true
  },
  {
    id: 'chrono',
    name: 'Chrono',
    tagline: 'Parcours en frise chronologique avec points et dates en évidence : lisible en un coup d’œil.',
    accent: '#0F6E5C',
    font: 'inter',
    tags: ['Moderne', 'Minimal'],
    isNew: true
  },
  {
    id: 'ligne',
    name: 'Ligne',
    tagline: 'Style suisse : nom sur deux lignes très serré, grand filet d’accent, titres en minuscules.',
    accent: '#B91C1C',
    font: 'inter',
    tags: ['Minimal', 'Design'],
    secondary: true,
    isNew: true
  },
  {
    id: 'prestige',
    name: 'Prestige',
    tagline: 'Capitales espacées, filets doubles et titres centrés : finance, audit, luxe.',
    accent: '#1E2A4A',
    font: 'serif',
    tags: ['Classique', 'Design'],
    isNew: true
  },
  {
    id: 'campus',
    name: 'Campus',
    tagline: 'En-tête teinté et titres en pastilles : idéal pour un premier CV, un stage ou une alternance.',
    accent: '#7C3AED',
    font: 'inter',
    tags: ['Moderne', 'Minimal'],
    secondary: true,
    isNew: true
  },
  {
    id: 'essentiel',
    name: 'Essentiel',
    tagline: 'Grand nom en Inter fin, nom de famille en serif italique, filets fins : calme et lisible.',
    accent: '#111111',
    font: 'inter',
    tags: ['Minimal', 'Moderne'],
    secondary: true,
  },
  {
    id: 'editorial',
    name: 'Éditorial',
    tagline: 'Nom en serif italique géant, intitulés en capitales espacées : allure de magazine.',
    accent: '#111111',
    font: 'inter',
    tags: ['Design', 'Classique'],
  },
  {
    id: 'rail',
    name: 'Rail',
    tagline: 'Intitulés de sections dans une marge à gauche, contenu aligné à droite : très structuré.',
    accent: '#111111',
    font: 'inter',
    tags: ['Moderne', 'Dense'],
  },
  {
    id: 'mono',
    name: 'Mono',
    tagline: 'Titres en chasse fixe et barre d’accent : pour les profils tech et dev.',
    accent: '#111111',
    font: 'inter',
    tags: ['Tech', 'Minimal'],
  },
  {
    id: 'atelier',
    name: 'Atelier',
    tagline: 'Nom bicolore, titres en mono et filets fins : net et technique.',
    accent: '#111111',
    font: 'inter',
    tags: ['Moderne', 'Tech']
  },
  {
    id: 'galerie',
    name: 'Galerie',
    tagline: 'Monochrome, typographie massive et pastilles de compétences.',
    accent: '#111111',
    font: 'inter',
    tags: ['Minimal', 'Design']
  },
  {
    id: 'direction',
    name: 'Direction',
    tagline: 'Nom en serif, barre d’accent : posé, pour les profils seniors.',
    accent: '#0F6E5C',
    font: 'inter',
    tags: ['Moderne', 'Classique']
  },
  {
    id: 'classique',
    name: 'Classique',
    tagline: 'Serif centré, petites capitales : finance, droit, conseil.',
    accent: '#1E2A4A',
    font: 'serif',
    tags: ['Classique']
  },
  {
    id: 'compact',
    name: 'Compact',
    tagline: 'Dense et structuré pour tout faire tenir sur une page.',
    accent: '#111111',
    font: 'inter',
    tags: ['Dense', 'Tech']
  },
  {
    id: 'brut',
    name: 'Brut ATS',
    tagline: 'Arial, noir et blanc, zéro décoration : le plus sûr pour les vieux ATS.',
    accent: '#000000',
    font: 'arial',
    tags: ['Minimal', 'Classique']
  },
  // ---------- Collection « Inspirations » : seize modèles visuels à forte personnalité ----------
  {
    id: 'arche',
    name: 'Arche',
    tagline: 'Colonne en arche et portrait arrondi, nom en serif italique, frise ponctuée de losanges et étiquettes.',
    accent: '#1B1B1B',
    accent2: '#E8DFD1',
    font: 'inter',
    tags: ['Créatif', 'Minimal'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'communication', gender: 'f' }
  },
  {
    id: 'chevron',
    name: 'Onglet',
    tagline: 'En-tête ardoise et portrait arrondi, colonne crème à languette, titres à barre courte.',
    accent: '#383A40',
    accent2: '#ECE8E2',
    font: 'inter',
    tags: ['Moderne', 'Classique'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'ux-designer', gender: 'm' }
  },
  {
    id: 'petale',
    name: 'Pétale',
    tagline: 'Grands cercles roses et colonne en gélule, portrait rond, nom en serif, puces carrées.',
    accent: '#C9939A',
    accent2: '#EED6DA',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'ux-designer', gender: 'f' }
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    tagline: 'Cadre sombre, nom condensé géant et nom de famille détouré, filets fins et pastilles.',
    accent: '#2B2B2B',
    accent2: '#9E9E9E',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'recrutement-rh', gender: 'f' }
  },
  {
    id: 'grille',
    name: 'Grille',
    tagline: 'Fond noir et tableau à filets, nom massif, portrait noir et blanc à droite.',
    accent: '#FFFFFF',
    font: 'inter',
    tags: ['Créatif', 'Tech'],
    isNew: true,
    visual: true,
    sample: { preset: 'artiste-3d', gender: 'm' }
  },
  {
    id: 'degrade',
    name: 'Dégradé',
    tagline: 'Colonne anthracite, portrait arrondi en duotone, étiquettes en gélule et jauges en dégradé.',
    accent: '#7C3AED',
    accent2: '#06B6D4',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'marketing-digital', gender: 'm' }
  },
  {
    id: 'medaillon',
    name: 'Médaillon',
    tagline: 'En-tête ardoise, portrait arrondi à droite, titres à icônes, frises et barres de niveau.',
    accent: '#3D4C5C',
    font: 'inter',
    tags: ['Moderne', 'Classique'],
    isNew: true,
    visual: true,
    sample: { preset: 'devops', gender: 'm' }
  },
  {
    id: 'dune',
    name: 'Dune',
    tagline: 'Tons sauge, arche ouverte et grand portrait, nom fin, titres soulignés et frise verticale.',
    accent: '#3F5E4A',
    accent2: '#A9BFA3',
    font: 'inter',
    tags: ['Créatif', 'Minimal'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'architecte-interieur', gender: 'f' }
  },
  {
    id: 'angles',
    name: 'Aplats',
    tagline: 'Bandeau clair, colonne grise et liserés, portrait rond, capitales espacées et barres de niveau.',
    accent: '#6D4A36',
    accent2: '#E8D9CB',
    font: 'inter',
    tags: ['Créatif', 'Moderne'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'product-owner', gender: 'f' }
  },
  {
    id: 'nocturne',
    name: 'Nocturne',
    tagline: 'Colonne noire avec nom et portrait rond, monogrammes en pastilles et niveaux en points.',
    accent: '#2F7FD8',
    font: 'inter',
    tags: ['Moderne', 'Tech'],
    isNew: true,
    visual: true,
    sample: { preset: 'controleur-gestion', gender: 'm' }
  },
  {
    id: 'pastel',
    name: 'Pastel',
    tagline: 'Halo pastel en angle, portrait en carré arrondi, titres en serif italique, rangées datées.',
    accent: '#B57EDC',
    accent2: '#F7C6D9',
    font: 'inter',
    tags: ['Créatif', 'Minimal'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'infirmiere', gender: 'f' }
  },
  {
    id: 'cartel',
    name: 'Cartel',
    tagline: 'Grand nom en serif, bandes grises à étiquettes filetées, années d’expérience et notes à points.',
    accent: '#111111',
    font: 'inter',
    tags: ['Minimal', 'Classique'],
    isNew: true,
    visual: true,
    sample: { preset: 'data-analyst', gender: 'm' }
  },
  {
    id: 'collage',
    name: 'Collage',
    tagline: 'Fond nuit, carte d’identité inclinée, fiches de formation, papier quadrillé et notes au feutre.',
    accent: '#2AA7B5',
    accent2: '#8E7CF0',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'artiste-3d', gender: 'f' }
  },
  {
    id: 'sachet',
    name: 'Dossier',
    tagline: 'Chemise kraft à onglet, carte d’identité, tampon « Approuvé », note adhésive et étiquettes.',
    accent: '#1D4ED8',
    accent2: '#FFE873',
    font: 'inter',
    tags: ['Créatif', 'Design'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'artiste-3d', gender: 'f' }
  },
  {
    id: 'ecran',
    name: 'Écran',
    tagline: 'Fond noir, nom massif souligné, portrait en duotone cadré, cartes filaires et tuiles d’outils.',
    accent: '#F97316',
    font: 'inter',
    tags: ['Créatif', 'Tech'],
    isNew: true,
    visual: true,
    sample: { preset: 'dev-fullstack', gender: 'm' }
  },
  {
    id: 'tribune',
    name: 'Tribune',
    tagline: 'Blocs noirs à liseré, serif Garamond, portrait noir et blanc, colonne claire.',
    accent: '#0F766E',
    accent2: '#EEE9DF',
    font: 'inter',
    tags: ['Classique', 'Design'],
    secondary: true,
    isNew: true,
    visual: true,
    sample: { preset: 'business-developer', gender: 'm' }
  }
]

/** Studio de design : 500 modèles générés (50 structures × 10 palettes), rendus par le moteur de design. */
export const STUDIO_TEMPLATES: TemplateDef[] = DESIGN_TEMPLATES.map((d) => ({
  id: d.id,
  name: d.name,
  tagline: d.tagline,
  accent: d.design.colors.primary,
  font: 'inter',
  tags: ['Studio', 'Créatif', 'Design'],
  visual: true,
  secondary: true,
  studio: { family: d.family, structure: d.name.split(' ')[0], palette: d.palette, hue: d.hue, dark: d.dark }
}))

export const TEMPLATES: TemplateDef[] = [...CORE_TEMPLATES, ...STUDIO_TEMPLATES]

export const TEMPLATE_TAGS = ['Tous', 'Créatif', 'Moderne', 'Minimal', 'Classique', 'Tech', 'Design', 'Dense']

export const FONTS: { id: string; label: string; stack: string }[] = [
  { id: 'inter', label: 'Inter', stack: "'Inter Variable', Inter, Arial, sans-serif" },
  { id: 'serif', label: 'Source Serif', stack: "'Source Serif 4 Variable', Georgia, serif" },
  { id: 'arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'calibri', label: 'Calibri', stack: 'Calibri, Carlito, Arial, sans-serif' },
  { id: 'georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif" }
]

export const ACCENTS = ['#111111', '#C6F432', '#2323E6', '#2FBF71', '#0F6E5C', '#1E2A4A', '#7C3AED', '#BE185D', '#0369A1', '#B91C1C']

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === 'atelier')!
}

export function isVisual(id: string): boolean {
  return Boolean(getTemplate(id).visual)
}

// Images d'aperçu pré-rendues (scripts/gen-previews.cjs) : bien plus légères qu'un rendu live.
const PREVIEWS = import.meta.glob('../assets/previews/*.jpg', { eager: true, import: 'default' }) as Record<string, string>

export function previewOf(id: string): string | undefined {
  return PREVIEWS[`../assets/previews/${id}.jpg`]
}
