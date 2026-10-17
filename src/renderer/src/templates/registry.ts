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
}

export const TEMPLATES: TemplateDef[] = [
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
  }
]

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
