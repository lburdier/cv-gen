// Tutoriels : une visite guidée par page / fonction. Chaque étape vise un élément de la page
// (sélecteur CSS, éventuellement filtré par son texte) ; sans cible, la carte s'affiche au centre.
import type { Route } from '../store'

export type TourId =
  | 'dashboard'
  | 'resumes'
  | 'templates'
  | 'editor'
  | 'canvas'
  | 'colors'
  | 'from-image'
  | 'ats-scan'
  | 'profile'
  | 'offers'
  | 'letters'
  | 'settings'

export interface TourStep {
  sel?: string
  /** Texte que doit contenir l'élément visé (parmi ceux du sélecteur). */
  text?: string
  title: string
  body: string
  /** Étape ignorée si l'élément n'est pas affiché (ex. résultats pas encore calculés). */
  optional?: boolean
  /** Étape affichée seulement si cet élément est absent (ex. explication avant une analyse). */
  unless?: string
}

export interface Tour {
  id: TourId
  name: string
  summary: string
  steps: TourStep[]
}

export const TOURS: Tour[] = [
  {
    id: 'dashboard',
    name: 'Accueil',
    summary: 'Les bases de CV GEN et la navigation',
    steps: [
      {
        title: 'Bienvenue dans CV GEN',
        body: 'Vous allez créer des CV lisibles par les logiciels de recrutement (ATS) et agréables à lire pour un recruteur. Ce tour présente l’essentiel en une minute. Chaque page a le sien, affiché à votre première visite.'
      },
      {
        sel: '.topnav .tabs',
        title: 'La navigation',
        body: 'Vos CV, les modèles, les offres d’emploi, les lettres de motivation et le score ATS d’un PDF. « Assistant » ouvre l’IA dans un panneau latéral (Ctrl J).'
      },
      {
        sel: '.home-hero .row.wrap',
        title: 'Commencer',
        body: 'Partez de l’exemple, importez un CV existant (PDF, Word), recréez un CV depuis une image ou testez un PDF. Quand vous avez un CV, ces boutons deviennent des raccourcis vers l’éditeur et l’analyse d’offre.'
      },
      { sel: '.carousel', title: 'Vos CV récents', body: 'Cliquez sur une carte pour l’ouvrir dans l’éditeur. Le « + » crée un nouveau CV (Ctrl N).', optional: true },
      {
        sel: '.home-split',
        title: 'Score et mots-clés',
        body: 'Le score ATS de votre CV principal et les mots-clés de l’offre visée : en vert ceux que le CV contient, en rouge ceux qui manquent.',
        optional: true
      },
      { sel: '.assistant-bar', title: 'Demandez à l’IA', body: 'Posez une question ou donnez une consigne : réécrire un profil, adapter un CV, préparer un entretien. Les suggestions en dessous servent de point de départ.', optional: true },
      { sel: '.search-trigger', title: 'Tout trouver', body: 'Ctrl K ouvre la palette de commandes : pages, CV, modèles, presets, couleurs et actions en quelques lettres.' },
      { sel: '.topnav .avatar', title: 'Votre profil', body: 'Remplissez vos informations une seule fois : elles s’appliquent à tous les modèles, presets et nouveaux CV.' },
      { sel: '[data-tour="help"]', title: 'Revoir un tutoriel', body: 'Ce bouton relance le tutoriel de la page affichée. La liste complète est dans Paramètres › Tutoriels.' }
    ]
  },
  {
    id: 'resumes',
    name: 'Mes CV',
    summary: 'Classer, trier, importer et ouvrir vos CV',
    steps: [
      { title: 'Tous vos CV', body: 'Chaque CV est enregistré automatiquement et noté en continu : structure, contenu et correspondance avec l’offre visée.' },
      { sel: '.page .chips', title: 'Filtrer', body: 'Affichez les CV par type de modèle ou par état.' },
      { sel: '.page > .row .seg', title: 'Trier', body: 'Les plus récents d’abord, ou les meilleurs scores ATS d’abord.' },
      { sel: '.page > .row .btn', text: 'Importer', title: 'Importer un CV', body: 'Un PDF ou un Word existant est lu et rangé dans les bonnes rubriques. Avec une clé IA, l’import est encore plus précis.' },
      { sel: '.gallery .new-shot', title: 'Nouveau CV', body: 'Crée un CV avec votre profil, ou un exemple si le profil est vide.' },
      { sel: '.gallery .shot:not(.new-shot)', title: 'Un CV', body: 'Le badge indique le score ATS. Survolez la carte pour dupliquer ou supprimer, cliquez pour ouvrir l’éditeur.', optional: true }
    ]
  },
  {
    id: 'templates',
    name: 'Modèles',
    summary: 'Choisir un modèle, un preset métier ou une couleur',
    steps: [
      { title: 'Les modèles', body: 'Des modèles une colonne qui passent tous les filtres ATS, et des modèles visuels pour un portfolio. Chaque modèle visuel s’exporte aussi en version ATS du même contenu.' },
      { sel: '.pf-banner', title: 'Aperçu avec vos infos', body: 'Avec un profil rempli, les vignettes montrent votre propre CV au lieu de l’exemple.' },
      { sel: '.page > .chips', title: 'Filtrer par style', body: 'ATS, visuels, sobres, créatifs : réduisez la liste à ce qui convient à votre candidature.', optional: true },
      { sel: '.gallery.lg .shot', title: 'Choisir un modèle', body: 'Cliquez sur une vignette pour l’aperçu détaillé, puis créez un CV avec votre profil, l’exemple ou un CV existant.' },
      { sel: '.hero .btn', text: 'couleurs', title: 'Explorer par couleurs', body: 'Choisissez une ou deux couleurs et voyez tous les modèles et presets dans ces teintes.' },
      { sel: '.hero .btn', text: 'image', title: 'Recréer depuis une image', body: 'Déposez la capture d’un CV que vous aimez : l’app reproduit sa mise en page avec vos informations.' },
      { sel: '#studio', title: 'Studio de design', body: '200 modèles : 20 structures déclinées en 10 palettes. Filtrez par famille, couleur ou fond ; chaque modèle se retouche entièrement, dans l’onglet Design ou sur la toile.' },
      { sel: '#presets', title: 'Presets par métier', body: 'Des CV complets par métier : modèle, couleurs, intitulés et contenu d’exemple adaptés. Filtrez par secteur.' }
    ]
  },
  {
    id: 'editor',
    name: 'Éditeur (formulaire)',
    summary: 'Remplir un CV, régler son style, l’exporter',
    steps: [
      { sel: '.editor-toolbar', title: 'Le CV ouvert', body: 'Renommez-le ici. Tout est enregistré automatiquement à chaque frappe.' },
      { sel: '.editor-form .section-tabs', title: 'Les rubriques', body: 'Identité, profil, expériences, compétences, formation… Avancez rubrique par rubrique ou sautez directement à celle qui vous intéresse.' },
      { sel: '.editor-form .form-body', title: 'Le formulaire', body: 'Les champs suivent l’ordre lu par un ATS. Les boutons IA (avec une clé) réécrivent un texte ou proposent des puces.' },
      { sel: '.mode-seg', title: 'Formulaire ou toile', body: '« Toile » permet d’éditer directement sur le CV, comme dans Canva, sans casser la compatibilité ATS.' },
      { sel: '.preview-bar', title: 'Modèle, couleurs et style', body: 'Changez de modèle sans perdre le contenu, choisissez la couleur (48 teintes ou l’explorateur), la police, la langue des intitulés et la densité.' },
      { sel: '.preview-scroll', title: 'L’aperçu', body: 'Le rendu exact du PDF, mis à jour en direct. Les filets pointillés indiquent les sauts de page.' },
      { sel: '.preview-bar .btn', text: 'Vue ATS', title: 'Ce que lit un robot', body: 'Affiche le texte brut qu’un ATS extrait de votre PDF. S’il est lisible ici, il l’est pour le recruteur.' },
      { sel: '.preview-bar .btn', text: 'Exporter', title: 'Exporter', body: 'PDF (recommandé), PDF version ATS pour les modèles visuels, Word pour les ATS anciens, ou texte brut.' },
      { sel: '.ats-col', title: 'Le score ATS', body: 'Note en continu avec la liste des points à corriger. Associez une offre pour voir les mots-clés manquants et adapter le CV avec l’IA.', optional: true }
    ]
  },
  {
    id: 'canvas',
    name: 'Éditeur toile',
    summary: 'Éditer directement sur le CV, avec garde-fous ATS',
    steps: [
      { title: 'L’édition sur la toile', body: 'Cliquez sur n’importe quel texte du CV pour le modifier sur place. La structure reste celle d’un CV lisible par les ATS : pas de zone de texte flottante ni de texte dans une image.' },
      { sel: '.ce-tools', title: 'Annuler, rétablir, zoomer', body: 'Ctrl Z et Ctrl Y fonctionnent aussi. Le zoom ne change pas le PDF.' },
      { sel: '.ce-badge', title: 'Garde-fous ATS', body: 'Vert : le CV reste lisible par un ATS. Orange : un réglage pose problème ; l’onglet ATS explique quoi corriger.' },
      { sel: '.ce-panel .ce-tabs', title: 'Les panneaux', body: 'Éléments pour ajouter, réordonner ou masquer des rubriques ; Style pour la police, la taille, l’interligne et les marges dans des limites sûres ; ATS pour le diagnostic.' },
      { sel: '.ce-adders', title: 'Ajouter un élément', body: 'Une expérience, une formation, une compétence… L’élément arrive dans la bonne rubrique, au bon format.', optional: true },
      { sel: '.ce-sections', title: 'Ordre des rubriques', body: 'Glissez pour réordonner, cliquez sur l’œil pour masquer une rubrique sans perdre son contenu.', optional: true },
      { sel: '.ce-stage', title: 'Sélectionner et déplacer', body: 'Survolez une expérience pour faire apparaître la poignée : glissez-la pour changer l’ordre. Une barre d’outils s’ouvre sur l’élément sélectionné (dupliquer, dates, supprimer).' },
      { sel: '.ce-top .btn', text: 'Exporter', title: 'Exporter', body: 'Le PDF exporté est identique à la toile.' },
      { sel: '.ce-top .seg', title: 'Revenir au formulaire', body: 'Les deux modes modifient le même CV : passez de l’un à l’autre à tout moment.' }
    ]
  },
  {
    id: 'colors',
    name: 'Explorateur de couleurs',
    summary: 'Voir chaque modèle dans les couleurs choisies',
    steps: [
      { title: 'L’explorateur de couleurs', body: 'Choisissez une ou deux couleurs : tous les modèles et presets s’affichent dans ces teintes, comme une recherche par couleur.' },
      { sel: '.cx-top .seg', title: 'Trois façons de choisir', body: 'Palette libre, harmonies toutes prêtes, ou couleurs extraites d’une image (logo d’entreprise, photo, charte).' },
      { sel: '.cx-selected', title: 'Les couleurs retenues', body: 'Jusqu’à deux couleurs : la principale et la secondaire. Cliquez sur une pastille pour la retirer.' },
      { sel: '.cx-free, .cx-harmonies, .cx-image', title: 'Choisir', body: 'Cliquez sur une teinte, saisissez un code hexadécimal ou déposez une image.', optional: true },
      { sel: '.cx-bar', title: 'Filtrer et choisir le contenu', body: 'Limitez aux modèles ATS ou visuels, et choisissez le contenu affiché : exemple, profil ou un de vos CV.' },
      { sel: '.page .gallery', title: 'Appliquer', body: 'Cliquez sur une vignette pour créer un CV dans ces couleurs, ou appliquer les couleurs au CV d’où vous venez.' }
    ]
  },
  {
    id: 'from-image',
    name: 'Recréer depuis une image',
    summary: 'Transformer la capture d’un CV en modèle éditable',
    steps: [
      { title: 'Recréer un CV depuis une image', body: 'Déposez la capture ou la photo d’un CV que vous aimez : l’app analyse sa mise en page (colonnes, couleurs, bandeau, photo, typographie) et crée un modèle « Sur mesure » éditable.' },
      { sel: '.fi-options', title: 'Le contenu', body: 'Lire le texte de l’image, reprendre votre profil, un de vos CV, ou l’exemple.' },
      { sel: '.fi-ai', title: 'Analyse IA', body: 'Avec une clé IA, la mise en page et le texte sont lus encore plus fidèlement. Sans clé, l’analyse locale fonctionne quand même.', optional: true },
      { sel: '.fi-drop', title: 'Déposer l’image', body: 'PNG, JPG ou WebP, par glisser-déposer, clic ou Ctrl V depuis le presse-papiers.' },
      { sel: '.fi-how', title: 'Comment ça marche', body: 'Les étapes de l’analyse. Ensuite, tous les réglages du design restent modifiables dans l’onglet Design de l’éditeur.', optional: true }
    ]
  },
  {
    id: 'ats-scan',
    name: 'Score ATS d’un PDF',
    summary: 'Tester n’importe quel CV PDF comme un robot',
    steps: [
      { title: 'Tester un CV PDF', body: 'Déposez n’importe quel CV, même créé ailleurs : l’app le lit comme un logiciel de recrutement et lui donne un score.' },
      { sel: '.fi-drop', title: 'Déposer le CV', body: 'PDF ou Word. Tout reste sur votre ordinateur : rien n’est envoyé en ligne.' },
      {
        unless: '.as-score',
        title: 'Après l’analyse',
        body: 'Le score s’affiche avec le détail par critère, les points à corriger, la comparaison avec une offre et le texte exact lu par le robot. Relancez ce tutoriel avec le bouton ? pour la visite des résultats.'
      },
      { sel: '.as-score', title: 'Le score', body: 'Lecture, structure, contenu et mots-clés, chacun noté.', optional: true },
      { sel: '.as-checks', title: 'Les points à corriger', body: 'Ce qui a bien été lu, et ce qui gêne un ATS : colonnes, rubriques non reconnues, dates, coordonnées.', optional: true },
      { sel: '.as-kw', title: 'Comparer à une offre', body: 'Choisissez une offre enregistrée ou collez un intitulé pour voir les mots-clés présents et manquants.', optional: true },
      { sel: '.as-text', title: 'Ce que lit le robot', body: 'Le texte extrait, ligne par ligne, avec les rubriques détectées. Une rubrique absente ici est invisible pour l’ATS.', optional: true }
    ]
  },
  {
    id: 'profile',
    name: 'Mon profil',
    summary: 'Saisir ses informations une fois pour tous les modèles',
    steps: [
      { title: 'Votre profil', body: 'Saisissez vos informations une seule fois. Elles remplissent tous les modèles, presets, l’explorateur de couleurs et les nouveaux CV.' },
      { sel: '.pf-meter', title: 'Progression', body: 'Ce qu’il reste à compléter pour un profil exploitable par tous les modèles.' },
      { sel: '.pf-switch', title: 'Utiliser mon profil partout', body: 'Activé : les aperçus montrent vos informations au lieu de l’exemple.' },
      { sel: '.pf-actions', title: 'Remplir vite', body: 'Reprenez le contenu d’un CV existant, ou synchronisez le profil vers vos CV.' },
      { sel: '.pf-form', title: 'Le formulaire', body: 'Mêmes rubriques que l’éditeur de CV, enregistrées automatiquement.' },
      { sel: '.pf-preview', title: 'Aperçu', body: 'Votre profil rendu dans le modèle de votre choix.' }
    ]
  },
  {
    id: 'offers',
    name: 'Offres d’emploi',
    summary: 'Analyser une offre et adapter son CV',
    steps: [
      { title: 'Les offres d’emploi', body: 'Collez une annonce : l’app en extrait les mots-clés qu’un ATS cherchera, puis compare vos CV.' },
      { sel: '.page-head .btn', text: 'Nouvelle offre', title: 'Nouvelle offre', body: 'Ouvre le formulaire pour coller une annonce.' },
      { sel: '.offer-list', title: 'Vos offres', body: 'Toutes les annonces enregistrées. Cliquez pour revoir leur analyse.', optional: true },
      { sel: '.panel', text: 'Nouvelle offre', title: 'Ajouter une offre', body: 'Intitulé, entreprise et texte de l’annonce. L’analyse fonctionne sans IA ; avec une clé, elle est plus fine.', optional: true },
      { sel: '.panel', text: 'Mots-clés', title: 'Les mots-clés', body: 'Classés par importance. En vert ceux présents dans votre CV, en rouge ceux qui manquent.', optional: true },
      { sel: '.match-grid', title: 'Correspondance', body: 'Le score de chaque CV face à cette offre, et le bouton pour adapter le meilleur CV avec l’IA.', optional: true }
    ]
  },
  {
    id: 'letters',
    name: 'Lettres de motivation',
    summary: 'Rédiger une lettre à partir d’un CV et d’une offre',
    steps: [
      { title: 'Les lettres de motivation', body: 'Choisissez un CV et une offre : CV GEN prépare une lettre fondée sur votre parcours réel, que vous personnalisez ensuite.' },
      { sel: '.page-head .btn', text: 'Nouvelle lettre', title: 'Nouvelle lettre', body: 'Repart de zéro pour une autre candidature.' },
      { sel: '.offer-list', title: 'Vos lettres', body: 'Toutes vos lettres, rangées par offre.', optional: true },
      { sel: '.letter-opts', title: 'CV, offre, ton et langue', body: 'Le CV source et l’offre visée déterminent le contenu ; le ton et la langue, le style.', optional: true },
      { sel: '.lt-row', title: 'Angle et longueur', body: 'Poste, entreprise, reconversion, stage ou alternance, candidature spontanée ; lettre courte, standard ou détaillée.', optional: true },
      { sel: '.lt-motivation', title: 'Votre motivation', body: 'En une ou deux phrases, avec vos mots. C’est la seule source de motivation utilisée : rien n’est inventé.', optional: true },
      { sel: '.panel .btn-outline', text: 'Brouillon guidé', title: 'Brouillon guidé ou IA', body: 'Le brouillon guidé fonctionne sans IA à partir de vos réalisations et des mots-clés de l’offre. Avec une clé, l’IA rédige une lettre complète.', optional: true },
      { sel: '.letter-paper', title: 'La lettre', body: 'Destinataire, lieu et date, objet et texte se modifient directement, puis s’exportent en PDF, Word ou texte.', optional: true },
      { sel: '.lt-side', title: 'Vérification et retouches', body: 'Longueur, entreprise et mots-clés cités, formules creuses ; puis raccourcir, rendre plus percutant ou corriger en un clic.', optional: true }
    ]
  },
  {
    id: 'settings',
    name: 'Paramètres',
    summary: 'IA, clé API, apparence, sauvegardes',
    steps: [
      { sel: '.settings-grid > div', text: 'Intelligence artificielle', title: 'Le fournisseur d’IA', body: 'Claude (Anthropic) ou OpenRouter, qui propose des modèles gratuits. L’IA est facultative : tout le reste fonctionne sans.' },
      { sel: '.settings-grid > div', text: 'Clé API', title: 'La clé API', body: 'Elle est chiffrée par Windows sur cet ordinateur et n’est jamais affichée ni envoyée ailleurs qu’au fournisseur choisi.' },
      { sel: '.settings-grid > div', text: 'Modèle', title: 'Le modèle', body: 'Plus rapide ou plus précis. Avec OpenRouter, la liste montre les modèles gratuits disponibles.' },
      { sel: '.settings-grid > div', text: 'Apparence', title: 'Apparence', body: 'Thème clair, sombre ou celui de Windows.' },
      { sel: '.settings-grid > div', text: 'Sauvegardes', title: 'Sauvegardes', body: 'Exportez toutes vos données dans un fichier et restaurez-les sur un autre ordinateur.' },
      { sel: '[data-tour="local"]', title: 'IA hors ligne', body: 'Un petit modèle installé sur l’ordinateur : gratuit, sans clé ni limite. Il répond dans l’assistant, et prend le relais si le fournisseur en ligne ne répond pas.', optional: true },
      { sel: '[data-tour="updates"]', title: 'Mises à jour', body: 'L’app installée se met à jour toute seule depuis GitHub. Vous pouvez aussi lancer une vérification ici.' },
      { sel: '[data-tour="tours"]', title: 'Tutoriels', body: 'Relancez n’importe quel tutoriel, ou réactivez-les tous.' }
    ]
  }
]

export const tourById = (id: string): Tour | undefined => TOURS.find((t) => t.id === id)

/** Tutoriel correspondant à la page affichée (l'éditeur dépend du mode formulaire / toile). */
export function tourForRoute(route: Route): TourId | null {
  if (route.name === 'editor') return document.querySelector('.canvas-editor') ? 'canvas' : 'editor'
  return TOURS.some((t) => t.id === route.name) ? (route.name as TourId) : null
}

/** Page à ouvrir pour lancer un tutoriel depuis ailleurs (null : impossible, ex. aucun CV). */
export function routeForTour(id: TourId, firstResumeId?: string): Route | null {
  if (id === 'editor' || id === 'canvas') return firstResumeId ? { name: 'editor', id: firstResumeId } : null
  return { name: id } as Route
}

// Tutoriels déjà vus : préférence locale (une visite par page et par poste).
const SEEN = 'cvgen.tours.seen'
const AUTO = 'cvgen.tours.auto'

export function seenTours(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}
export function markTourSeen(id: string): void {
  try {
    const s = seenTours()
    s.add(id)
    localStorage.setItem(SEEN, JSON.stringify([...s]))
  } catch {
    /* stockage indisponible : le tutoriel pourra réapparaître */
  }
}
export function resetTours(): void {
  try {
    localStorage.removeItem(SEEN)
  } catch {
    /* rien */
  }
}
export function toursAuto(): boolean {
  try {
    return localStorage.getItem(AUTO) !== '0'
  } catch {
    return true
  }
}
export function setToursAuto(on: boolean): void {
  try {
    localStorage.setItem(AUTO, on ? '1' : '0')
  } catch {
    /* rien */
  }
}
