// Modèle de données partagé entre le processus principal et l'interface.

export type Lang = 'fr' | 'en'

export type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'interests'
  | 'gallery'

export interface Basics {
  firstName: string
  lastName: string
  headline: string
  email: string
  phone: string
  location: string
  website: string
  linkedin: string
  github: string
  summary: string
  /** Ce que la personne recherche (stage, alternance, poste, offre visée) : affiché sous le titre. */
  target?: string
  /** Zones où la personne est mobile : affichées avec la candidature, sur tous les modèles. */
  mobility?: string
  // Champs des modèles visuels (facultatifs, ignorés par les modèles ATS).
  photo?: string // image en data URL
  banner?: string // image de bandeau en data URL
  bannerHeight?: number // hauteur du bandeau en px (sinon valeur du modèle)
  ctaLabel?: string
  ctaUrl?: string
}

export interface Experience {
  id: string
  role: string
  company: string
  location: string
  start: string // AAAA-MM
  end: string // AAAA-MM
  current: boolean
  bullets: string[]
}

export interface Education {
  id: string
  degree: string
  school: string
  location: string
  start: string
  end: string
  details: string
  /** Les 3 principaux cours de l'année en cours : rassurent le recruteur sur les compétences à venir. */
  courses?: string[]
}

export interface SkillGroup {
  id: string
  name: string
  items: string[]
  /** Présentation dans les modèles visuels : tuiles d'outils, pastilles ou texte. */
  display?: 'tiles' | 'chips' | 'list'
  /** Icône par élément : image (data URL) ou icône de la banque (« bank:id »). */
  icons?: Record<string, string>
  /** Design des icônes de la banque : app, round, outline, soft, gradient, mono. */
  iconStyle?: string
  /** Icônes de la banque attribuées automatiquement d'après le nom du logiciel (vrai par défaut). */
  autoIcons?: boolean
  /** Icônes de logiciels devant chaque élément, sur tous les modèles (décoratives : le nom reste en texte). */
  showIcons?: boolean
  /** Taille des icônes (1 = taille du modèle ; de 0,6 à 2). */
  iconSize?: number
}

export interface LinkItem {
  id: string
  label: string
  url: string
}

export interface GalleryItem {
  id: string
  image: string // data URL
  caption: string
}

export interface Project {
  id: string
  name: string
  link: string
  description: string
}

export interface Certification {
  id: string
  name: string
  issuer: string
  date: string
}

export interface LanguageItem {
  id: string
  name: string
  level: string
}

export interface Resume {
  id: string
  title: string
  templateId: string
  accent: string
  /** Couleur secondaire (modèles à deux couleurs) ; sinon celle du modèle. */
  accent2?: string
  /** Design du modèle « Sur mesure » ou d'un modèle du studio (recréé depuis une image ou réglé à la main). */
  design?: DesignSpec
  /** Modèle du studio auquel se rapporte `design` (un autre modèle du studio reprend son propre design). */
  designFor?: string
  font: string
  density: 'comfortable' | 'compact'
  lang: Lang
  createdAt: number
  updatedAt: number
  offerId?: string
  basics: Basics
  experiences: Experience[]
  education: Education[]
  skills: SkillGroup[]
  projects: Project[]
  certifications: Certification[]
  languages: LanguageItem[]
  interests: string
  links?: LinkItem[]
  gallery?: GalleryItem[]
  sectionOrder: SectionKey[]
  hidden: SectionKey[]
  /** Intitulés choisis parmi les variantes standards reconnues par les ATS. */
  titles?: Partial<Record<SectionKey, string>>
  /** Réglages typographiques bornés pour rester lisibles par les ATS. */
  style?: { size?: number; leading?: number; margin?: 'narrow' | 'normal' | 'wide' }
}

export interface OfferKeyword {
  term: string
  importance: 1 | 2 | 3
  category: 'hard' | 'soft' | 'tool' | 'domain' | 'certification' | 'language'
}

export interface OfferAnalysis {
  title: string
  company: string
  seniority: string
  location: string
  contract: string
  summary: string
  keywords: OfferKeyword[]
  mustHaves: string[]
  niceToHaves: string[]
  responsibilities: string[]
  source: 'ai' | 'local'
}

export interface Offer {
  id: string
  title: string
  company: string
  text: string
  createdAt: number
  analysis?: OfferAnalysis
  /** Annonce d'origine (import depuis l'extension navigateur). */
  url?: string
  location?: string
  /** Site d'où vient l'offre : 'linkedin', 'web' ou absent (collée à la main). */
  source?: string
}

/** Offre envoyée par l'extension navigateur au pont local de l'app. */
export interface IncomingOffer {
  title: string
  company: string
  location?: string
  url?: string
  text: string
  source?: string
  /** Critères de l'annonce (niveau, contrat…) lus sur la page. */
  criteria?: Record<string, string>
}

export interface BridgeDelivery {
  offers: IncomingOffer[]
  /** « Appliquer » : ouvrir l'offre et adapter le meilleur CV. */
  apply: boolean
}

export interface BridgeStatus {
  running: boolean
  port?: number
  error?: string
  /** Dossier de l'extension à charger dans Chrome ou Edge. */
  extensionDir: string
}

/** Réglages de rédaction d'une lettre (conservés pour la régénérer). */
export interface LetterOptions {
  tone: string
  length: 'courte' | 'standard' | 'detaillee'
  angle: 'poste' | 'entreprise' | 'reconversion' | 'alternance' | 'spontanee'
  lang: Lang
  /** Ce qui attire la personne dans l'entreprise, avec ses mots : seule source de motivation utilisée. */
  motivation: string
  /** Expériences à mettre en avant (identifiants) ; vide = les plus récentes. */
  highlights: string[]
}

export interface CoverLetter {
  id: string
  title: string
  resumeId: string
  offerId?: string
  body: string
  createdAt: number
  updatedAt: number
  /** En-tête : destinataire (plusieurs lignes), lieu, date (AAAA-MM-JJ), objet. */
  recipient?: string
  place?: string
  date?: string
  subject?: string
  options?: LetterOptions
}

/** Type de recherche : chaque type a ses propres champs (durée de stage, TJM de mission…). */
export type AppKind = 'emploi' | 'stage' | 'alternance' | 'mission'
/** Étapes du suivi (colonnes du kanban). */
export type AppStatus = 'todo' | 'applied' | 'followup' | 'interview' | 'offer' | 'rejected'

export interface AppContact {
  id: string
  name: string
  role: string
  email: string
  phone: string
}

export interface AppEvent {
  id: string
  at: number
  kind: 'status' | 'note' | 'followup' | 'interview' | 'create'
  label: string
  status?: AppStatus
}

/** Candidature suivie : une offre, un stage ou une mission, avec ses documents, relances et contacts. */
export interface Application {
  id: string
  kind: AppKind
  status: AppStatus
  title: string
  company: string
  location: string
  /** Contrat précis : CDI, CDD, Stage, Alternance, Freelance, Intérim… */
  contract: string
  source: string
  url: string
  /** Site de l'entreprise : sa favicon sert de logo dans le suivi. */
  website?: string
  /** 1 basse, 2 normale, 3 haute. */
  priority: 1 | 2 | 3
  /** Dates AAAA-MM-JJ ; entretien en AAAA-MM-JJTHH:MM. */
  appliedAt?: string
  followUpAt?: string
  interviewAt?: string
  offerId?: string
  resumeId?: string
  letterId?: string
  /** Champs propres au type (durée, début, gratification, rythme, école, TJM, salaire…). */
  details: Record<string, string>
  contacts: AppContact[]
  notes: string
  /** Pourquoi ce poste, ce stage ou cette mission, avec les mots de la personne (repris dans les relances). */
  motivation?: string
  /** Dernier message de relance rédigé (brouillon conservé). */
  followUpDraft?: string
  events: AppEvent[]
  createdAt: number
  updatedAt: number
}

/** Tableau à exporter en Excel ou CSV (suivi des candidatures). */
export interface TableExport {
  fileName: string
  sheet: string
  headers: string[]
  rows: string[][]
}

/** Message de relance à rédiger (e-mail ou message LinkedIn). */
export interface FollowUpRequest {
  channel: 'email' | 'linkedin'
  /** Première relance (J+6 / J+7), seconde relance, ou remerciement après entretien. */
  step: 'relance' | 'relance2' | 'apres-entretien'
  kind: AppKind
  title: string
  company: string
  contactName: string
  appliedAt?: string
  interviewAt?: string
  motivation: string
  lang: Lang
  offerText?: string
  /** Message écrit par la personne : l'IA le corrige sans le réécrire (mode recommandé). */
  draft?: string
}

export interface AppData {
  version: 1
  resumes: Resume[]
  offers: Offer[]
  letters: CoverLetter[]
  /** Suivi des candidatures. */
  applications?: Application[]
  activity: ActivityItem[]
  /** Profil maître : vos infos saisies une fois, reprises par tous les modèles et presets. */
  profile?: Resume
  /** Afficher les modèles et presets avec le profil (vrai par défaut dès qu'il est rempli). */
  profileMode?: boolean
}

export interface ActivityItem {
  id: string
  at: number
  kind: 'create' | 'export' | 'tailor' | 'analyze' | 'import' | 'letter'
  label: string
}

export type ModelId = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-5-5'

/** Fournisseurs qui ont une clé API. */
export type KeyProvider = 'anthropic' | 'openrouter'
/** « local » : petit modèle exécuté sur l'ordinateur, sans clé ni réseau. */
export type AiProvider = KeyProvider | 'local'

export interface LocalModel {
  id: string
  name: string
  label: string
  desc: string
  file: string
  url: string
  /** Taille du fichier en octets. */
  size: number
}

/** Connexion avec un compte développeur Anthropic (outil ant, profil OAuth « cv-gen »). */
export interface AnthropicLoginState {
  /** Outil de connexion présent (livré par l'app ou installé sur le système). */
  installed: boolean
  loggedIn: boolean
  busy: 'installing' | 'waiting' | null
  /** Organisation, espace de travail… tels qu'affichés par l'outil. */
  details: string[]
}

export interface LocalModelState extends LocalModel {
  installed: boolean
  downloading: boolean
  percent?: number
}

/** Modèle gratuit proposé par OpenRouter. */
export interface FreeModel {
  id: string
  name: string
  context: number
  structured: boolean
}

export interface Settings {
  /** Le fournisseur actif a une clé : l'IA est utilisable. */
  hasApiKey: boolean
  hasClaudeKey: boolean
  hasOpenRouterKey: boolean
  provider: AiProvider
  model: ModelId
  /** Modèle OpenRouter (par défaut le routeur gratuit « openrouter/free »). */
  orModel: string
  /** Claude : clé API ou session du compte développeur Anthropic. */
  claudeAuth: 'key' | 'account'
  hasClaudeLogin: boolean
  /** Modèle local choisi (identifiant du catalogue). */
  localModel: string
  /** Un modèle local est installé (repli automatique possible). */
  hasLocalModel: boolean
  theme: 'light' | 'dark' | 'system'
  userName: string
  encryptionAvailable: boolean
}

// ---- IA ----

export interface TailorResult {
  headline: string
  summary: string
  experiences: { id: string; bullets: string[] }[]
  skills: { name: string; items: string[] }[]
  addedKeywords: string[]
  missingKeywords: string[]
  notes: string[]
}

export interface BulletVariants {
  variants: string[]
  tip: string
}

export type ImportedResume = Omit<
  Resume,
  'id' | 'title' | 'templateId' | 'accent' | 'font' | 'density' | 'createdAt' | 'updatedAt' | 'sectionOrder' | 'hidden'
>

export interface CvImport {
  resume: ImportedResume
  /** « ai » : structuré par l'IA ; « local » : lecture de l'app, sans IA. */
  method: 'ai' | 'local'
  /** Pourquoi l'IA n'a pas été utilisée, le cas échéant. */
  note?: string
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  /** Modèle qui a produit la réponse (affiché sous le message). */
  model?: string
  /** Message d'erreur affiché dans la conversation, jamais renvoyé au modèle. */
  error?: boolean
}

export interface ChatReply {
  text: string
  model?: string
}

export type ExportFormat = 'pdf' | 'docx' | 'txt'

export interface ExportResult {
  ok: boolean
  path?: string
  canceled?: boolean
  error?: string
}

/** Design paramétrable : tout ce qu'il faut pour reproduire la mise en page d'un CV. */
export interface DesignSpec {
  layout: 'single' | 'sidebar-left' | 'sidebar-right'
  /** Largeur de la colonne latérale, en % de la page. */
  sidebarWidth: number
  header: 'band' | 'card' | 'minimal' | 'split'
  headerAlign: 'left' | 'center'
  photo: 'none' | 'circle' | 'rounded' | 'square'
  photoPlace: 'header' | 'sidebar'
  /** Côté de la photo dans l'en-tête. */
  photoSide: 'left' | 'right'
  headings: 'underline' | 'pill' | 'block' | 'caps' | 'highlight' | 'bar' | 'rule' | 'rail'
  bodyFont: 'sans' | 'serif' | 'mono'
  displayFont: 'sans' | 'serif' | 'mono' | 'wide'
  nameCase: 'upper' | 'normal'
  nameSize: 'm' | 'l' | 'xl'
  skills: 'chips' | 'list' | 'columns'
  timeline: boolean
  corners: 'square' | 'rounded'
  density: 'airy' | 'compact'
  colors: {
    primary: string
    secondary: string
    page: string
    text: string
    sidebar: string
    header: string
  }
  /** Sections placées dans la colonne latérale. */
  sidebarSections: SectionKey[]
  // ---- Décors (facultatifs : valeurs par défaut = rendu sobre d'origine) ----
  /** Motif de fond de l'en-tête rempli ou de la colonne latérale. */
  decor?: 'none' | 'dots' | 'grid' | 'lines' | 'waves' | 'circles' | 'blobs' | 'confetti'
  /** Petites icônes devant les coordonnées. */
  icons?: boolean
  /** Bord bas de l'en-tête en bandeau. */
  headerShape?: 'flat' | 'curve' | 'slant' | 'wave'
  /** Style du nom. */
  nameStyle?: 'plain' | 'accent' | 'outline' | 'highlight' | 'gradient'
  /** Puces des listes. */
  bullets?: 'dot' | 'dash' | 'arrow' | 'square' | 'check'
  /** Présentation des expériences et formations. */
  entries?: 'plain' | 'cards' | 'rule'
  /** Liseré de page. */
  frame?: 'none' | 'top' | 'side' | 'border'
}

/** Résultat de l'analyse d'une image de CV. */
export interface CvImageAnalysis {
  design: DesignSpec
  /** Ce que l'IA a remarqué (affiché à l'utilisateur). */
  notes: string[]
  /** Texte du CV lu sur l'image (si demandé). */
  content?: ImportedResume
  /** Cadre de la photo dans l'image, en % (pour la recadrer et la réutiliser). */
  photoBox?: { x: number; y: number; w: number; h: number }
}

/** Ligne de texte extraite d'un PDF (coordonnées en points, origine en haut à gauche). */
export interface PdfLine {
  text: string
  x: number
  y: number
  w: number
  size: number
  bold: boolean
  /** Rang dans le flux du fichier (ordre de lecture brut d'un ATS simple). */
  order: number
}

export interface PdfPage {
  width: number
  height: number
  lines: PdfLine[]
  /** Position x d'une gouttière entre deux colonnes, sinon null. */
  columnAt: number | null
  streamText: string
  unknownGlyphs: number
  glyphs: number
  images: number
}

export interface PdfExtraction {
  pages: PdfPage[]
  encrypted: boolean
  bytes: number
  title: string
  producer: string
  fonts: string[]
  fontsWithoutUnicode: number
}

/** Photo libre de droits (CC0 ou domaine public) trouvée dans la banque en ligne. */
export interface StockImage {
  id: string
  title: string
  creator: string
  license: 'CC0' | 'Domaine public'
  provider: string
  landing: string
  url: string
  thumbUrl: string
  width: number
  height: number
  /** Miniature en data URL (l'interface ne charge aucune image distante). */
  thumb: string
}

export interface StockPage {
  items: StockImage[]
  page: number
  pages: number
  total: number
}

/** État des mises à jour automatiques (releases GitHub). */
export interface UpdateStatus {
  state: 'disabled' | 'idle' | 'checking' | 'none' | 'available' | 'downloading' | 'downloaded' | 'error'
  current: string
  /** Version portable : pas d'installation automatique, seulement un lien de téléchargement. */
  portable: boolean
  version?: string
  percent?: number
  notes?: string
  error?: string
  checkedAt?: number
}

export interface CvGenApi {
  /** Tests automatisés : pas d'animation d'ouverture ni de tutoriel automatique. */
  quiet?: boolean
  loadData(): Promise<AppData>
  saveData(data: AppData): Promise<void>
  saveDataSync(data: AppData): boolean
  logError(message: string): void
  /** Recharge l'interface (sans quitter l'app). */
  reload(): void
  listBackups(): Promise<{ name: string; at: number; resumes: number; offers: number; letters: number }[]>
  readBackup(name: string): Promise<AppData | null>
  /** Texte d'un PDF tel qu'un ATS le lit. */
  extractPdf(bytes: Uint8Array): Promise<PdfExtraction>
  /** Banque de photos libres de droits (Openverse, CC0 et domaine public). */
  stock: {
    search(query: string, page?: number, orientation?: 'wide' | 'any'): Promise<StockPage>
    get(url: string, fallback?: string): Promise<string>
  }
  /** Texte brut d'un DOCX. */
  extractDocx(bytes: Uint8Array): Promise<string>
  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Pick<Settings, 'provider' | 'model' | 'orModel' | 'localModel' | 'claudeAuth' | 'theme' | 'userName'>>): Promise<Settings>
  /** Compte développeur Anthropic : connexion dans le navigateur, état, déconnexion. */
  anthropicLogin: {
    state(): Promise<AnthropicLoginState>
    login(): Promise<AnthropicLoginState>
    cancel(): Promise<void>
    logout(): Promise<AnthropicLoginState>
  }
  setApiKey(key: string, provider?: KeyProvider): Promise<Settings>
  /** IA locale : catalogue, téléchargement du modèle, suppression. */
  local: {
    list(): Promise<LocalModelState[]>
    download(id: string): Promise<LocalModelState[]>
    cancel(id: string): Promise<LocalModelState[]>
    remove(id: string): Promise<LocalModelState[]>
    onState(cb: (s: LocalModelState[]) => void): () => void
  }
  listFreeModels(): Promise<FreeModel[]>
  testApiKey(): Promise<{ ok: boolean; error?: string }>
  setTitleBarTheme(dark: boolean): void
  exportResume(resume: Resume, format: ExportFormat): Promise<ExportResult>
  exportTable(table: TableExport, format: 'xlsx' | 'csv'): Promise<ExportResult>
  exportLetter(letter: CoverLetter, resume: Resume | undefined, format: 'docx' | 'txt' | 'pdf'): Promise<ExportResult>
  getPrintJob(token: string): Promise<{ kind: 'resume'; resume: Resume } | { kind: 'letter'; letter: CoverLetter; resume?: Resume } | null>
  printReady(token: string): void
  openDataFolder(): Promise<void>
  openExternal(url: string): Promise<void>
  /** Import d'un CV existant : lecture locale, structurée par l'IA si une clé est enregistrée. */
  cv: {
    pick(): Promise<{ name: string; bytes: Uint8Array } | null>
    import(name: string, bytes: Uint8Array, mode?: 'auto' | 'local'): Promise<CvImport>
  }
  /** Logos d'entreprise (favicon du site, en cache local). */
  logos: { get(domain: string): Promise<string | null> }
  /** Pont avec l'extension navigateur (offres LinkedIn). */
  bridge: {
    status(): Promise<BridgeStatus>
    /** Offres arrivées avant que l'interface soit prête. */
    pending(): Promise<BridgeDelivery[]>
    onOffers(cb: (d: BridgeDelivery) => void): () => void
    openExtensionFolder(): Promise<void>
  }
  updates: {
    status(): Promise<UpdateStatus>
    check(): Promise<UpdateStatus>
    /** Redémarre et installe (version installée) ou ouvre la page de téléchargement (portable). */
    install(): Promise<boolean>
    onStatus(cb: (s: UpdateStatus) => void): () => void
  }
  ai: {
    analyzeOffer(text: string): Promise<OfferAnalysis>
    tailor(resume: Resume, offer: Offer): Promise<TailorResult>
    improveBullet(bullet: string, context: string, lang: Lang): Promise<BulletVariants>
    writeSummary(resume: Resume, offer?: Offer): Promise<string>
    coverLetter(resume: Resume, offer: Offer | undefined, options: LetterOptions): Promise<string>
    /** Retouche d'une lettre : raccourcir, plus percutant, plus formel, corriger, ou consigne libre. */
    reviseLetter(body: string, instruction: string, resume: Resume, offer?: Offer, lang?: Lang): Promise<string>
    /** Message de relance d'une candidature, fondé sur la motivation de la personne et son CV. */
    followUp(req: FollowUpRequest, resume?: Resume): Promise<string>
    analyzeCvImage(dataUrl: string, withContent: boolean, hint?: DesignSpec): Promise<CvImageAnalysis>
    chat(history: ChatTurn[], resume?: Resume, offer?: Offer): Promise<ChatReply>
    /** Texte partiel pendant qu'un modèle local écrit (affiché en direct dans l'assistant). */
    onPartial(cb: (text: string) => void): () => void
  }
}
