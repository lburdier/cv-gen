// Presets complets : un CV d'exemple réaliste par métier, chacun associé à un modèle.
// Les personnes, entreprises et chiffres sont fictifs.
import type { Basics, Certification, Education, Experience, LanguageItem, Project, SkillGroup } from '../../../shared/types'

const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3)

const exp = (role: string, company: string, location: string, start: string, end: string, bullets: string[]): Experience => ({
  id: id(),
  role,
  company,
  location,
  start,
  end: end === 'now' ? '' : end,
  current: end === 'now',
  bullets
})
const edu = (degree: string, school: string, location: string, start: string, end: string, details = ''): Education => ({
  id: id(),
  degree,
  school,
  location,
  start,
  end,
  details
})
const sk = (name: string, items: string[]): SkillGroup => ({ id: id(), name, items })
const lang = (name: string, level: string): LanguageItem => ({ id: id(), name, level })
const cert = (name: string, issuer: string, date: string): Certification => ({ id: id(), name, issuer, date })
const proj = (name: string, link: string, description: string): Project => ({ id: id(), name, link, description })

export interface PresetContent {
  title: string
  basics: Basics
  experiences: Experience[]
  education: Education[]
  skills: SkillGroup[]
  projects?: Project[]
  certifications?: Certification[]
  languages?: LanguageItem[]
  interests?: string
}

export interface PresetDef {
  id: string
  /** Métier affiché sur la carte. */
  name: string
  sector: string
  /** Modèle utilisé (chaque modèle ATS a son preset : c'est aussi son aperçu). */
  templateId: string
  tagline: string
  /** Contenu du preset (absent pour le profil créatif, construit avec ses images dans sample.ts). */
  build?: () => PresetContent
}

export const PRESET_SECTORS = ['Tous', 'Tech', 'Business', 'Création', 'Santé & social', 'Droit & finance', 'Étudiant']

const basics = (b: Partial<Basics> & Pick<Basics, 'firstName' | 'lastName' | 'headline' | 'summary'>): Basics => ({
  email: `${b.firstName}.${b.lastName}@email.fr`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''),
  phone: '06 12 34 56 78',
  location: '',
  website: '',
  linkedin: '',
  github: '',
  ...b
})

export const PRESETS: PresetDef[] = [
  {
    id: 'artiste-3d',
    name: 'Artiste 3D',
    sector: 'Création',
    templateId: 'studio',
    tagline: 'CV portfolio : photo, bandeau, rendus et tuiles d’outils, avec sa version ATS.'
  },
  {
    id: 'dev-fullstack',
    name: 'Développeuse full-stack',
    sector: 'Tech',
    templateId: 'signal',
    tagline: 'React, Node.js et cloud AWS : 5 ans d’expérience SaaS, résultats chiffrés.',
    build: () => ({
      title: 'CV · Développeuse Full-Stack',
      basics: basics({
        firstName: 'Camille',
        lastName: 'Laurent',
        headline: 'Développeuse Full-Stack React / Node.js',
        location: 'Lyon, France',
        linkedin: 'linkedin.com/in/camille-laurent',
        github: 'github.com/camillelaurent',
        summary:
          "Développeuse full-stack avec 5 ans d'expérience sur des applications web SaaS à fort trafic. Spécialisée en React, TypeScript et Node.js, avec une solide pratique des architectures cloud AWS et de l'intégration continue. Habituée aux équipes agiles Scrum, attachée à la qualité du code, à l'accessibilité et à la performance."
      }),
      experiences: [
        exp('Développeuse Full-Stack Senior', 'Nexa Cloud', 'Lyon', '2022-03', 'now', [
          'Conçu et livré un tableau de bord analytique en React et TypeScript utilisé par 12 000 clients, réduisant de 35 % les tickets de support.',
          'Migré une API monolithique Node.js vers des microservices sur AWS (Lambda, DynamoDB), divisant par 3 les temps de réponse.',
          'Mis en place une chaîne CI/CD GitHub Actions avec tests automatisés (Jest, Playwright), portant la couverture de 48 % à 82 %.',
          'Encadré 3 développeurs juniors via revues de code et sessions de pair programming hebdomadaires.'
        ]),
        exp('Développeuse Front-End', 'Studio Hexagone', 'Paris', '2019-09', '2022-02', [
          "Développé une bibliothèque de composants React accessibles (RGAA AA) réutilisée sur 8 produits de l'agence.",
          'Optimisé les Core Web Vitals d’un site e-commerce : LCP de 4,1 s à 1,6 s, +18 % de conversion.',
          'Industrialisé le design system avec l’équipe design (Figma, Storybook).'
        ])
      ],
      education: [edu('Master Informatique, Ingénierie du logiciel', 'Université Lyon 1', 'Lyon', '2017-09', '2019-06', 'Mention Bien.')],
      skills: [
        sk('Langages', ['TypeScript', 'JavaScript', 'Python', 'SQL']),
        sk('Front-end', ['React', 'Next.js', 'Redux', 'Tailwind CSS', 'Storybook']),
        sk('Back-end & Cloud', ['Node.js', 'Express', 'PostgreSQL', 'AWS', 'Docker', 'GitHub Actions']),
        sk('Méthodes', ['Scrum', 'TDD', 'Code review', 'Accessibilité RGAA'])
      ],
      projects: [proj('OpenBudget', 'github.com/camillelaurent/openbudget', 'Application open source de suivi budgétaire (React, Supabase), 1 200 étoiles GitHub.')],
      certifications: [cert('AWS Certified Developer – Associate', 'Amazon Web Services', '2023-05')],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'C1, TOEIC 945')]
    })
  },
  {
    id: 'data-analyst',
    name: 'Data analyst',
    sector: 'Tech',
    templateId: 'mono',
    tagline: 'SQL, Python et Power BI : tableaux de bord et analyses qui orientent les décisions.',
    build: () => ({
      title: 'CV · Data Analyst',
      basics: basics({
        firstName: 'Yanis',
        lastName: 'Benali',
        headline: 'Data Analyst · SQL · Python · Power BI',
        location: 'Nantes, France',
        linkedin: 'linkedin.com/in/yanis-benali',
        github: 'github.com/ybenali',
        summary:
          'Data analyst avec 4 ans d’expérience en retail et e-commerce. Transforme des données brutes en tableaux de bord clairs et en recommandations concrètes pour les équipes marketing, finance et supply chain. À l’aise de la collecte (SQL, API) à la restitution auprès des directions.'
      }),
      experiences: [
        exp('Data Analyst', 'Maison Lumen', 'Nantes', '2023-01', 'now', [
          'Construit 14 tableaux de bord Power BI suivis chaque semaine par le comité de direction (ventes, marge, stocks).',
          'Modélisé la prévision de la demande en Python (Prophet), réduisant les ruptures de stock de 22 %.',
          'Automatisé le reporting financier mensuel (dbt, BigQuery), soit 3 jours de travail manuel économisés par mois.',
          'Animé des ateliers de formation SQL pour 25 collaborateurs métiers.'
        ]),
        exp('Analyste BI', 'Colibri Market', 'Rennes', '2021-02', '2022-12', [
          'Analysé le parcours client du site (GA4, BigQuery) et identifié 5 points de friction, +9 % de taux de conversion.',
          'Mis en place des tests A/B sur les pages produit et la page panier avec l’équipe marketing.',
          'Fiabilisé les données clients en dédoublonnant 180 000 fiches CRM.'
        ])
      ],
      education: [
        edu('Master Statistique et science des données', 'Université de Rennes', 'Rennes', '2019-09', '2021-06'),
        edu('Licence Mathématiques appliquées', 'Nantes Université', 'Nantes', '2016-09', '2019-06')
      ],
      skills: [
        sk('Données', ['SQL', 'Python (pandas, scikit-learn)', 'dbt', 'BigQuery', 'PostgreSQL']),
        sk('Visualisation', ['Power BI', 'Looker Studio', 'Tableau', 'Excel avancé']),
        sk('Analyse', ['Statistiques', 'Tests A/B', 'Prévision', 'Segmentation client']),
        sk('Savoir-être', ['Pédagogie', 'Esprit de synthèse', 'Curiosité'])
      ],
      certifications: [cert('Microsoft Certified : Power BI Data Analyst Associate', 'Microsoft', '2024-02')],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'B2'), lang('Arabe', 'courant')],
      interests: 'Course à pied (semi-marathon), datavisualisation open data, échecs.'
    })
  },
  {
    id: 'devops',
    name: 'Ingénieur DevOps',
    sector: 'Tech',
    templateId: 'atelier',
    tagline: 'Kubernetes, Terraform et CI/CD : fiabilité, automatisation et coûts cloud maîtrisés.',
    build: () => ({
      title: 'CV · Ingénieur DevOps',
      basics: basics({
        firstName: 'Maxime',
        lastName: 'Roux',
        headline: 'Ingénieur DevOps / SRE, Kubernetes · Terraform · AWS',
        location: 'Toulouse, France',
        linkedin: 'linkedin.com/in/maxime-roux',
        github: 'github.com/maximeroux',
        summary:
          'Ingénieur DevOps avec 6 ans d’expérience sur des plateformes cloud critiques. Automatise l’infrastructure (Terraform, Ansible), industrialise les déploiements et améliore la fiabilité des services avec une approche SRE : SLO, observabilité et post-mortems sans reproche.'
      }),
      experiences: [
        exp('Ingénieur DevOps Senior', 'Aéropulse', 'Toulouse', '2022-04', 'now', [
          'Migré 40 microservices vers Kubernetes (EKS) avec Helm et Argo CD, déploiements passés de 2 par semaine à 15 par jour.',
          'Codé toute l’infrastructure AWS en Terraform (120 modules), environnements reproductibles en moins de 30 minutes.',
          'Déployé l’observabilité Prometheus, Grafana et Loki : temps moyen de résolution des incidents réduit de 55 %.',
          'Réduit la facture cloud de 28 % (instances Spot, autoscaling, rightsizing).'
        ]),
        exp('Administrateur systèmes Linux', 'Hébergeur Occitan', 'Montpellier', '2019-09', '2022-03', [
          'Administré 300 serveurs Linux (Debian, RHEL) et automatisé leur configuration avec Ansible.',
          'Mis en place la CI/CD GitLab pour 25 projets clients.',
          'Assuré les astreintes de niveau 2 avec un taux de disponibilité de 99,95 %.'
        ])
      ],
      education: [edu('Diplôme d’ingénieur, Réseaux et télécommunications', 'INSA Toulouse', 'Toulouse', '2014-09', '2019-06')],
      skills: [
        sk('Cloud & conteneurs', ['AWS', 'Kubernetes', 'Docker', 'Helm', 'Argo CD']),
        sk('Infrastructure as Code', ['Terraform', 'Ansible', 'Packer']),
        sk('CI/CD & observabilité', ['GitLab CI', 'GitHub Actions', 'Prometheus', 'Grafana', 'Loki']),
        sk('Langages', ['Bash', 'Python', 'Go'])
      ],
      certifications: [
        cert('Certified Kubernetes Administrator (CKA)', 'CNCF', '2023-09'),
        cert('AWS Certified Solutions Architect – Associate', 'Amazon Web Services', '2022-11')
      ],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'C1')]
    })
  },
  {
    id: 'product-owner',
    name: 'Product owner',
    sector: 'Tech',
    templateId: 'rail',
    tagline: 'Discovery, roadmap et delivery agile : produit B2B piloté par la valeur.',
    build: () => ({
      title: 'CV · Product Owner',
      basics: basics({
        firstName: 'Sarah',
        lastName: 'Kowalski',
        headline: 'Product Owner, SaaS B2B',
        location: 'Paris, France',
        linkedin: 'linkedin.com/in/sarah-kowalski',
        summary:
          'Product owner avec 5 ans d’expérience sur des produits SaaS B2B. Relie besoins clients, enjeux business et contraintes techniques pour livrer des fonctionnalités utiles, mesurées et adoptées. Pratique de Scrum, de la discovery produit et du pilotage par les indicateurs.'
      }),
      experiences: [
        exp('Product Owner', 'Factoria', 'Paris', '2022-01', 'now', [
          'Piloté la roadmap du module de facturation (4 équipes, 30 personnes), +31 % de revenus récurrents en 18 mois.',
          'Mené 60 entretiens clients et 3 tests d’utilisabilité par trimestre pour prioriser le backlog.',
          'Réduit le délai de mise en production de 6 à 2 semaines en découpant les fonctionnalités en incréments testables.',
          'Défini et suivi les indicateurs produit (activation, rétention, NPS) dans Amplitude.'
        ]),
        exp('Cheffe de projet digital', 'Agence Pixelia', 'Paris', '2019-09', '2021-12', [
          'Géré 12 projets web et mobiles par an (budget jusqu’à 400 k€) pour des clients grands comptes.',
          'Rédigé spécifications fonctionnelles et user stories avec critères d’acceptation.',
          'Coordonné designers, développeurs et clients en méthode agile.'
        ])
      ],
      education: [edu('Master Management de l’innovation', 'IAE Paris-Sorbonne', 'Paris', '2017-09', '2019-06')],
      skills: [
        sk('Produit', ['Discovery', 'Roadmap', 'User stories', 'Priorisation (RICE)', 'OKR']),
        sk('Agilité', ['Scrum', 'Kanban', 'SAFe']),
        sk('Outils', ['Jira', 'Confluence', 'Figma', 'Amplitude', 'Notion', 'SQL (bases)'])
      ],
      certifications: [cert('Professional Scrum Product Owner I (PSPO I)', 'Scrum.org', '2022-03')],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'C1'), lang('Polonais', 'courant')],
      interests: 'Escalade, podcasts produit, bénévolat en association d’aide au numérique.'
    })
  },
  {
    id: 'marketing-digital',
    name: 'Cheffe de projet marketing digital',
    sector: 'Business',
    templateId: 'horizon',
    tagline: 'Acquisition, contenus et CRM : campagnes multicanales et ROI mesuré.',
    build: () => ({
      title: 'CV · Marketing digital',
      basics: basics({
        firstName: 'Léa',
        lastName: 'Fontaine',
        headline: 'Cheffe de projet marketing digital',
        location: 'Bordeaux, France',
        linkedin: 'linkedin.com/in/lea-fontaine',
        website: 'leafontaine.fr',
        summary:
          'Cheffe de projet marketing digital avec 5 ans d’expérience en e-commerce et en B2C. Conçoit et pilote des campagnes d’acquisition et de fidélisation multicanales (SEA, social ads, e-mailing, SEO) avec un suivi rigoureux du ROI et une forte culture du test.'
      }),
      experiences: [
        exp('Cheffe de projet marketing digital', 'Vélo Doré', 'Bordeaux', '2022-05', 'now', [
          'Piloté un budget média de 600 k€ par an (Google Ads, Meta, TikTok), ROAS passé de 3,1 à 4,6.',
          'Refondu le programme d’e-mailing et d’automatisation CRM (Brevo) : +38 % de chiffre d’affaires généré par l’e-mail.',
          'Lancé la stratégie de contenus SEO (80 articles), trafic organique multiplié par 2,4 en un an.',
          'Coordonné 2 agences et 1 alternant, reporting mensuel à la direction.'
        ]),
        exp('Chargée de marketing digital', 'Maison Arcane', 'Bordeaux', '2020-09', '2022-04', [
          'Animé les réseaux sociaux de la marque (Instagram, LinkedIn), communauté passée de 8 000 à 31 000 abonnés.',
          'Organisé 4 campagnes de lancement produit avec des créateurs de contenu.',
          'Suivi des performances avec GA4 et Looker Studio.'
        ])
      ],
      education: [edu('Master Marketing digital et e-commerce', 'Kedge Business School', 'Bordeaux', '2018-09', '2020-06')],
      skills: [
        sk('Acquisition', ['Google Ads', 'Meta Ads', 'TikTok Ads', 'SEO', 'Affiliation']),
        sk('CRM & data', ['Brevo', 'HubSpot', 'GA4', 'Looker Studio', 'Tests A/B']),
        sk('Contenus', ['Stratégie éditoriale', 'Canva', 'Figma', 'Brief créatif'])
      ],
      certifications: [cert('Google Ads, Search Certification', 'Google', '2024-04')],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'C1'), lang('Espagnol', 'B1')],
      interests: 'Photographie argentique, vélo de randonnée, ateliers d’écriture.'
    })
  },
  {
    id: 'business-developer',
    name: 'Business developer B2B',
    sector: 'Business',
    templateId: 'direction',
    tagline: 'Prospection, négociation et grands comptes : objectifs dépassés, chiffres à l’appui.',
    build: () => ({
      title: 'CV · Business Developer',
      basics: basics({
        firstName: 'Thomas',
        lastName: 'Girard',
        headline: 'Business Developer B2B, Solutions logicielles',
        location: 'Lille, France',
        linkedin: 'linkedin.com/in/thomas-girard',
        summary:
          'Business developer avec 7 ans d’expérience dans la vente de solutions SaaS aux PME et ETI. Maîtrise du cycle de vente complet, de la prospection à la signature, avec une approche conseil centrée sur le retour sur investissement client. Dépasse ses objectifs depuis 5 années consécutives.'
      }),
      experiences: [
        exp('Business Developer Senior', 'Logistiq', 'Lille', '2021-06', 'now', [
          'Signé 1,4 M€ de nouveau chiffre d’affaires annuel récurrent en 2025, soit 128 % de l’objectif.',
          'Ouvert le marché Benelux : 22 nouveaux clients en 18 mois.',
          'Négocié des contrats pluriannuels avec 6 grands comptes (cycle de vente de 6 à 9 mois).',
          'Formé et accompagné 4 commerciaux juniors (méthode MEDDIC).'
        ]),
        exp('Ingénieur commercial', 'Bureautik Nord', 'Lille', '2018-01', '2021-05', [
          'Développé un portefeuille de 90 PME clientes, chiffre d’affaires du secteur en hausse de 45 %.',
          'Réalisé 15 rendez-vous de prospection par semaine (téléphone, LinkedIn, salons).',
          'Classé meilleur commercial de la région en 2020.'
        ])
      ],
      education: [edu('Master Management des affaires', 'IAE Lille', 'Lille', '2016-09', '2018-06', 'Alternance en tant que chargé d’affaires.')],
      skills: [
        sk('Vente', ['Prospection', 'Négociation', 'Grands comptes', 'MEDDIC', 'Closing']),
        sk('Outils', ['Salesforce', 'HubSpot', 'LinkedIn Sales Navigator', 'Excel']),
        sk('Savoir-être', ['Écoute active', 'Persévérance', 'Sens du résultat'])
      ],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'C1'), lang('Néerlandais', 'B1')],
      interests: 'Rugby (club amateur), voyages, mentorat de jeunes entrepreneurs.'
    })
  },
  {
    id: 'logistique',
    name: 'Responsable logistique',
    sector: 'Business',
    templateId: 'compact',
    tagline: 'Entrepôt, transport et équipes : coûts réduits, délais tenus, sécurité au premier plan.',
    build: () => ({
      title: 'CV · Responsable logistique',
      basics: basics({
        firstName: 'Karim',
        lastName: 'Mansouri',
        headline: 'Responsable logistique et supply chain',
        location: 'Lyon, France',
        linkedin: 'linkedin.com/in/karim-mansouri',
        summary:
          'Responsable logistique avec 9 ans d’expérience en entrepôt et en transport, dont 5 en management d’équipe. Pilote les flux, la performance et la sécurité de sites jusqu’à 25 000 m², avec une approche d’amélioration continue (Lean, 5S) et une forte implication terrain.'
      }),
      experiences: [
        exp('Responsable d’entrepôt', 'Distrilog', 'Saint-Priest', '2021-03', 'now', [
          'Managé 45 collaborateurs (chefs d’équipe, préparateurs, caristes) sur un site de 25 000 m².',
          'Augmenté la productivité de préparation de 18 % grâce à la refonte des zones de picking.',
          'Réduit les erreurs de commande de 1,2 % à 0,3 % avec le contrôle par scan.',
          'Divisé par 2 le nombre d’accidents du travail grâce à un plan sécurité et des formations.'
        ]),
        exp('Chef d’équipe logistique', 'TransAlp', 'Grenoble', '2017-09', '2021-02', [
          'Encadré une équipe de 15 personnes en 2 × 8 sur la réception et l’expédition.',
          'Optimisé les tournées de livraison régionales : −12 % de coûts de transport.',
          'Participé au déploiement du WMS Reflex.'
        ]),
        exp('Agent logistique', 'Plateforme Rhône', 'Vénissieux', '2015-06', '2017-08', [
          'Réception, contrôle et mise en stock des marchandises ; inventaires tournants.'
        ])
      ],
      education: [
        edu('Licence professionnelle Logistique et pilotage des flux', 'IUT Lumière Lyon 2', 'Lyon', '2016-09', '2017-06', 'En alternance.'),
        edu('BTS Gestion des transports et logistique associée', 'Lycée La Martinière', 'Lyon', '2013-09', '2015-06')
      ],
      skills: [
        sk('Logistique', ['Gestion des stocks', 'WMS Reflex', 'SAP', 'Transport', 'Inventaires']),
        sk('Management', ['Animation d’équipe', 'Planification', 'Recrutement', 'Entretiens annuels']),
        sk('Amélioration continue', ['Lean', '5S', 'Indicateurs de performance', 'Sécurité (CACES)'])
      ],
      certifications: [cert('CACES R489 catégories 1, 3 et 5', 'AFTRAL', '2022-06')],
      languages: [lang('Français', 'langue maternelle'), lang('Arabe', 'courant'), lang('Anglais', 'B1')]
    })
  },
  {
    id: 'assistante-administrative',
    name: 'Assistante administrative',
    sector: 'Business',
    templateId: 'brut',
    tagline: 'Organisation, accueil et gestion administrative : le CV le plus sûr pour tous les ATS.',
    build: () => ({
      title: 'CV · Assistante administrative',
      basics: basics({
        firstName: 'Sophie',
        lastName: 'Morel',
        headline: 'Assistante administrative et commerciale',
        location: 'Dijon, France',
        linkedin: 'linkedin.com/in/sophie-morel',
        summary:
          'Assistante administrative avec 8 ans d’expérience en PME. Organisée et polyvalente, gère l’accueil, la facturation, les plannings et le suivi des dossiers clients avec rigueur. Maîtrise des outils bureautiques et des logiciels de gestion, sens du service et discrétion.'
      }),
      experiences: [
        exp('Assistante administrative et commerciale', 'Menuiseries Bourguignonnes', 'Dijon', '2019-02', 'now', [
          'Gestion des devis, commandes et factures (300 par mois) sur Sage 100.',
          'Suivi des règlements clients et relances : délai moyen de paiement réduit de 12 jours.',
          'Organisation des plannings de 12 poseurs et des déplacements.',
          'Accueil physique et téléphonique, gestion du courrier et de l’archivage.'
        ]),
        exp('Secrétaire', 'Cabinet Rivière Immobilier', 'Beaune', '2016-09', '2019-01', [
          'Préparation des baux, états des lieux et courriers aux locataires.',
          'Tenue des agendas de 3 négociateurs et prise de rendez-vous.',
          'Mise en place d’un classement numérique des dossiers.'
        ])
      ],
      education: [edu('BTS Support à l’action managériale', 'Lycée Le Castel', 'Dijon', '2014-09', '2016-06')],
      skills: [
        sk('Gestion', ['Facturation', 'Devis', 'Relances clients', 'Classement', 'Plannings']),
        sk('Logiciels', ['Word', 'Excel (tableaux croisés)', 'Outlook', 'Sage 100', 'Teams']),
        sk('Savoir-être', ['Organisation', 'Discrétion', 'Sens du service', 'Polyvalence'])
      ],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'B1')],
      interests: 'Chorale, randonnée, bénévolat à la bibliothèque municipale.'
    })
  },
  {
    id: 'ux-designer',
    name: 'Designer UX/UI',
    sector: 'Création',
    templateId: 'essentiel',
    tagline: 'Recherche utilisateur, prototypes et design system : un CV calme et typographique.',
    build: () => ({
      title: 'CV · Designer UX/UI',
      basics: basics({
        firstName: 'Manon',
        lastName: 'Rousseau',
        headline: 'Product Designer UX/UI',
        location: 'Paris, France',
        website: 'manonrousseau.design',
        linkedin: 'linkedin.com/in/manon-rousseau',
        summary:
          'Product designer avec 6 ans d’expérience sur des applications web et mobiles. Conduit des projets de la recherche utilisateur au design system, en lien étroit avec le produit et les développeurs. Attachée à l’accessibilité, à la simplicité et à la mesure de l’impact du design.'
      }),
      experiences: [
        exp('Product Designer Senior', 'Mobilio', 'Paris', '2022-02', 'now', [
          'Repensé le parcours de réservation de l’application mobile : +24 % de conversion, −40 % d’appels au support.',
          'Créé et maintenu le design system (Figma, 180 composants) partagé par 5 équipes produit.',
          'Mené 40 entretiens utilisateurs et 12 tests d’utilisabilité par an.',
          'Rendu l’application conforme RGAA AA avec les développeurs.'
        ]),
        exp('Designer UX/UI', 'Agence Atelier Nord', 'Lille', '2019-09', '2022-01', [
          'Conçu les interfaces de 15 sites et applications pour des clients culture et tourisme.',
          'Animé des ateliers de co-conception avec les clients et les utilisateurs.',
          'Produit maquettes, prototypes interactifs et spécifications pour les développeurs.'
        ])
      ],
      education: [edu('Master Design d’interaction', 'Strate École de Design', 'Sèvres', '2017-09', '2019-06')],
      skills: [
        sk('Design', ['Recherche utilisateur', 'Architecture de l’information', 'Prototypage', 'Design system', 'UI design']),
        sk('Outils', ['Figma', 'FigJam', 'Maze', 'Adobe Illustrator', 'Protopie']),
        sk('Accessibilité', ['RGAA', 'WCAG 2.2', 'Tests avec lecteurs d’écran'])
      ],
      projects: [proj('Portfolio', 'manonrousseau.design', 'Études de cas détaillées : mobilité, santé, culture.')],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'C1')],
      interests: 'Céramique, typographie, festivals de design.'
    })
  },
  {
    id: 'communication',
    name: 'Chargée de communication',
    sector: 'Création',
    templateId: 'editorial',
    tagline: 'Relations presse, réseaux sociaux et événements : un ton éditorial affirmé.',
    build: () => ({
      title: 'CV · Chargée de communication',
      basics: basics({
        firstName: 'Chloé',
        lastName: 'Bernard',
        headline: 'Chargée de communication et relations presse',
        location: 'Marseille, France',
        linkedin: 'linkedin.com/in/chloe-bernard',
        summary:
          'Chargée de communication avec 5 ans d’expérience dans la culture et les collectivités. Conçoit des plans de communication complets, rédige pour tous les supports et entretient un réseau solide de journalistes. Créative, rigoureuse et à l’aise dans l’organisation d’événements.'
      }),
      experiences: [
        exp('Chargée de communication', 'Théâtre du Vieux-Port', 'Marseille', '2022-09', 'now', [
          'Élaboré le plan de communication annuel (budget 150 k€) pour 60 spectacles par saison.',
          'Obtenu 120 retombées presse par saison, dont 15 dans des médias nationaux.',
          'Fait passer la communauté Instagram de 9 000 à 26 000 abonnés.',
          'Organisé la soirée de présentation de saison (800 invités).'
        ]),
        exp('Chargée de communication', 'Ville d’Aubagne', 'Aubagne', '2020-01', '2022-08', [
          'Rédigé le magazine municipal mensuel (40 000 exemplaires).',
          'Coordonné les campagnes d’affichage et la signalétique des événements.',
          'Géré les relations avec les prestataires graphiques et les imprimeurs.'
        ])
      ],
      education: [edu('Master Information et communication', 'Aix-Marseille Université', 'Aix-en-Provence', '2018-09', '2020-06')],
      skills: [
        sk('Communication', ['Plan de communication', 'Relations presse', 'Rédaction', 'Événementiel', 'Réseaux sociaux']),
        sk('Outils', ['Suite Adobe (InDesign, Photoshop)', 'Canva', 'Meta Business Suite', 'WordPress']),
        sk('Savoir-être', ['Aisance relationnelle', 'Créativité', 'Gestion des priorités'])
      ],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'B2'), lang('Italien', 'B1')],
      interests: 'Théâtre amateur, photographie, podcasts culturels.'
    })
  },
  {
    id: 'architecte-interieur',
    name: 'Architecte d’intérieur',
    sector: 'Création',
    templateId: 'galerie',
    tagline: 'Conception d’espaces, suivi de chantier et clients exigeants : un CV au graphisme net.',
    build: () => ({
      title: 'CV · Architecte d’intérieur',
      basics: basics({
        firstName: 'Élise',
        lastName: 'Garnier',
        headline: 'Architecte d’intérieur, Résidentiel et hôtellerie',
        location: 'Nice, France',
        website: 'elisegarnier.studio',
        linkedin: 'linkedin.com/in/elise-garnier',
        summary:
          'Architecte d’intérieur avec 7 ans d’expérience en résidentiel haut de gamme et en hôtellerie. Accompagne les projets de l’esquisse à la livraison : conception, plans techniques, choix des matériaux, consultation des entreprises et suivi de chantier, dans le respect des budgets et des délais.'
      }),
      experiences: [
        exp('Architecte d’intérieur', 'Studio Lumière Azur', 'Nice', '2021-03', 'now', [
          'Conçu et livré 18 appartements et villas (budgets de 80 k€ à 900 k€).',
          'Rénové 2 hôtels 4 étoiles (95 chambres) en site occupé, livrés dans les délais.',
          'Piloté jusqu’à 12 entreprises par chantier et tenu les budgets à ± 3 %.',
          'Développé une matériauthèque de 400 références durables.'
        ]),
        exp('Architecte d’intérieur junior', 'Agence Méridienne', 'Monaco', '2018-09', '2021-02', [
          'Réalisé plans, élévations et perspectives 3D pour des projets résidentiels.',
          'Préparé les dossiers de consultation des entreprises et les métrés.',
          'Participé aux rendez-vous clients et aux réunions de chantier.'
        ])
      ],
      education: [edu('Diplôme d’architecte d’intérieur (titre RNCP niveau 7)', 'École Camondo', 'Paris', '2013-09', '2018-06')],
      skills: [
        sk('Conception', ['Space planning', 'Plans techniques', 'Matériaux', 'Éclairage', 'Mobilier sur mesure']),
        sk('Logiciels', ['AutoCAD', 'SketchUp', 'Revit', 'Enscape', 'Photoshop']),
        sk('Chantier', ['Consultation des entreprises', 'Suivi de chantier', 'Budget', 'Planning'])
      ],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'C1'), lang('Italien', 'B2')],
      interests: 'Design scandinave, céramique, voile.'
    })
  },
  {
    id: 'infirmiere',
    name: 'Infirmière',
    sector: 'Santé & social',
    templateId: 'ligne',
    tagline: 'Soins, urgences et coordination : un CV clair, lisible en quelques secondes.',
    build: () => ({
      title: 'CV · Infirmière',
      basics: basics({
        firstName: 'Clara',
        lastName: 'Petit',
        headline: 'Infirmière diplômée d’État, Urgences et soins continus',
        location: 'Strasbourg, France',
        summary:
          'Infirmière diplômée d’État avec 6 ans d’expérience en services d’urgences et de soins continus. Réactive et rigoureuse, assure la prise en charge globale des patients, la coordination avec les équipes médicales et l’encadrement des étudiants infirmiers.'
      }),
      experiences: [
        exp('Infirmière aux urgences adultes', 'Hôpitaux Universitaires de Strasbourg', 'Strasbourg', '2021-04', 'now', [
          'Accueil et tri de 60 à 90 patients par garde (échelle FRENCH), surveillance et soins d’urgence.',
          'Prise en charge des urgences vitales en salle de déchocage avec l’équipe médicale.',
          'Tutrice de 8 étudiants infirmiers par an.',
          'Référente hygiène du service : audits et formations à la prévention des infections.'
        ]),
        exp('Infirmière en unité de soins continus', 'Clinique Sainte-Odile', 'Haguenau', '2019-09', '2021-03', [
          'Surveillance de patients post-opératoires (scope, drainages, douleur).',
          'Préparation et administration des traitements, transmissions ciblées.',
          'Éducation thérapeutique des patients et des familles.'
        ])
      ],
      education: [
        edu('Diplôme d’État d’infirmier', 'IFSI de Strasbourg', 'Strasbourg', '2016-09', '2019-07'),
        edu('Diplôme universitaire Soins d’urgence', 'Université de Strasbourg', 'Strasbourg', '2022-09', '2023-06')
      ],
      skills: [
        sk('Soins', ['Soins d’urgence', 'Tri (FRENCH)', 'Surveillance post-opératoire', 'Gestion de la douleur', 'Hygiène']),
        sk('Outils', ['DxCare', 'Dossier patient informatisé', 'Pompes et seringues électriques']),
        sk('Savoir-être', ['Sang-froid', 'Empathie', 'Travail en équipe', 'Rigueur'])
      ],
      certifications: [cert('AFGSU niveau 2', 'CESU 67', '2024-03')],
      languages: [lang('Français', 'langue maternelle'), lang('Allemand', 'B2'), lang('Anglais', 'B1')],
      interests: 'Course en montagne, secourisme bénévole, lecture.'
    })
  },
  {
    id: 'recrutement-rh',
    name: 'Chargée de recrutement',
    sector: 'Santé & social',
    templateId: 'chrono',
    tagline: 'Sourcing, entretiens et marque employeur : un parcours lisible comme une frise.',
    build: () => ({
      title: 'CV · Chargée de recrutement',
      basics: basics({
        firstName: 'Nadia',
        lastName: 'Haddad',
        headline: 'Chargée de recrutement et marque employeur',
        location: 'Lille, France',
        linkedin: 'linkedin.com/in/nadia-haddad',
        summary:
          'Chargée de recrutement avec 5 ans d’expérience en cabinet puis en entreprise. Gère l’ensemble du processus, de la définition du besoin à l’intégration, sur des profils variés (tech, commerce, fonctions support). Attachée à l’expérience candidat et à l’égalité des chances.'
      }),
      experiences: [
        exp('Chargée de recrutement', 'Groupe Hexa Retail', 'Lille', '2022-06', 'now', [
          'Recruté 85 collaborateurs par an (CDI, CDD, alternance), délai moyen de recrutement réduit de 42 à 29 jours.',
          'Déployé l’ATS Teamtailor et des process structurés d’entretien pour 30 managers.',
          'Lancé le programme de cooptation : 20 % des embauches en 2025.',
          'Animé la présence sur les salons écoles et forums emploi (12 par an).'
        ]),
        exp('Consultante en recrutement', 'Cabinet Talentys', 'Lille', '2020-02', '2022-05', [
          'Mené 25 missions de recrutement par an pour des PME (commerce, industrie).',
          'Sourcé les candidats sur LinkedIn Recruiter et par approche directe.',
          'Présenté des shortlists de 3 candidats en moins de 3 semaines.'
        ])
      ],
      education: [edu('Master Gestion des ressources humaines', 'IAE Lille', 'Lille', '2018-09', '2020-06', 'Mémoire : réduire les biais en entretien de recrutement.')],
      skills: [
        sk('Recrutement', ['Sourcing', 'Approche directe', 'Entretiens structurés', 'Onboarding', 'Marque employeur']),
        sk('Outils', ['Teamtailor', 'LinkedIn Recruiter', 'Welcome to the Jungle', 'Excel']),
        sk('Savoir-être', ['Écoute', 'Discernement', 'Organisation'])
      ],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'C1'), lang('Arabe', 'courant')],
      interests: 'Danse contemporaine, mentorat d’étudiants, cuisine du monde.'
    })
  },
  {
    id: 'controleur-gestion',
    name: 'Contrôleur de gestion',
    sector: 'Droit & finance',
    templateId: 'prestige',
    tagline: 'Budgets, reporting et pilotage de la performance : sobriété et précision.',
    build: () => ({
      title: 'CV · Contrôleur de gestion',
      basics: basics({
        firstName: 'Julien',
        lastName: 'Marchand',
        headline: 'Contrôleur de gestion, Industrie',
        location: 'Clermont-Ferrand, France',
        linkedin: 'linkedin.com/in/julien-marchand',
        summary:
          'Contrôleur de gestion avec 7 ans d’expérience en milieu industriel et en audit. Construit budgets, prévisions et reportings fiables, analyse les écarts et accompagne les opérationnels dans le pilotage de la performance. Esprit d’analyse, pédagogie et goût de l’automatisation.'
      }),
      experiences: [
        exp('Contrôleur de gestion industriel', 'Auvergne Composites', 'Clermont-Ferrand', '2021-01', 'now', [
          'Piloté le budget annuel et 3 reprévisions pour 2 usines (chiffre d’affaires de 140 M€).',
          'Mis en place le calcul des coûts de revient par produit : 4 gammes non rentables identifiées et repositionnées.',
          'Automatisé le reporting mensuel (Power Query, Power BI), clôture avancée de J+8 à J+4.',
          'Accompagné les responsables de production dans l’analyse des écarts.'
        ]),
        exp('Auditeur financier', 'Cabinet Mazière & Associés', 'Lyon', '2018-09', '2020-12', [
          'Audité les comptes de 20 PME et ETI (industrie, distribution).',
          'Revu les procédures de contrôle interne et formulé des recommandations.',
          'Encadré 2 auditeurs juniors sur les missions de terrain.'
        ])
      ],
      education: [edu('Master Contrôle de gestion et audit organisationnel', 'IAE Clermont Auvergne', 'Clermont-Ferrand', '2016-09', '2018-06')],
      skills: [
        sk('Finance', ['Budget', 'Prévisions', 'Coûts de revient', 'Analyse des écarts', 'Clôtures']),
        sk('Outils', ['SAP FI/CO', 'Excel avancé (VBA)', 'Power BI', 'Power Query']),
        sk('Savoir-être', ['Rigueur', 'Pédagogie', 'Esprit d’analyse'])
      ],
      certifications: [cert('Diplôme supérieur de comptabilité et de gestion (DSCG), UE 3', 'Ministère de l’Enseignement supérieur', '2019-11')],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'B2')],
      interests: 'Trail, histoire économique, trésorier d’un club de basket.'
    })
  },
  {
    id: 'juriste',
    name: 'Juriste droit des affaires',
    sector: 'Droit & finance',
    templateId: 'classique',
    tagline: 'Contrats, conformité et contentieux : la tradition du CV juridique.',
    build: () => ({
      title: 'CV · Juriste droit des affaires',
      basics: basics({
        firstName: 'Alexandre',
        lastName: 'Dupuis',
        headline: 'Juriste en droit des affaires',
        location: 'Paris, France',
        linkedin: 'linkedin.com/in/alexandre-dupuis',
        summary:
          'Juriste en droit des affaires avec 6 ans d’expérience en entreprise et en cabinet. Rédige et négocie les contrats commerciaux, sécurise la conformité (RGPD, Sapin II) et accompagne les directions opérationnelles au quotidien. Esprit pratique et sens de la négociation.'
      }),
      experiences: [
        exp('Juriste corporate et contrats', 'Groupe Solvéo', 'Paris', '2021-09', 'now', [
          'Rédigé et négocié 150 contrats par an (distribution, prestations de services, partenariats, NDA).',
          'Piloté le programme de conformité anticorruption Sapin II (cartographie des risques, formations de 200 salariés).',
          'Assuré le secrétariat juridique de 12 filiales (assemblées, conseils, registres).',
          'Réduit de 30 % le délai de validation des contrats grâce à une bibliothèque de clauses types.'
        ]),
        exp('Juriste', 'Cabinet Lemaire Avocats', 'Paris', '2019-01', '2021-08', [
          'Rédigé des actes de cessions de parts et des pactes d’associés.',
          'Préparé des notes de recherche et des consultations en droit commercial.',
          'Participé à des audits juridiques d’acquisition.'
        ])
      ],
      education: [
        edu('Master 2 Droit des affaires', 'Université Paris 1 Panthéon-Sorbonne', 'Paris', '2017-09', '2018-09', 'Mention Bien.'),
        edu('Master 1 Droit privé', 'Université Paris 1 Panthéon-Sorbonne', 'Paris', '2016-09', '2017-06')
      ],
      skills: [
        sk('Droit', ['Droit des contrats', 'Droit des sociétés', 'Conformité Sapin II', 'RGPD', 'Droit de la concurrence']),
        sk('Outils', ['Lexis 360', 'Dalloz', 'Doctrine', 'Gestion de contrats (CLM)']),
        sk('Savoir-être', ['Négociation', 'Rigueur rédactionnelle', 'Sens du conseil'])
      ],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'C1, juridique'), lang('Allemand', 'B1')],
      interests: 'Piano, histoire de l’art, course d’orientation.'
    })
  },
  {
    id: 'alternance',
    name: 'Étudiant en alternance',
    sector: 'Étudiant',
    templateId: 'campus',
    tagline: 'Premier CV : formation, stages et projets mis en avant, rythme d’alternance indiqué.',
    build: () => ({
      title: 'CV · Recherche d’alternance',
      basics: basics({
        firstName: 'Hugo',
        lastName: 'Lefèvre',
        headline: 'Recherche alternance, Assistant chef de projet commercial (24 mois)',
        location: 'Rennes, France',
        linkedin: 'linkedin.com/in/hugo-lefevre',
        summary:
          'Étudiant en BUT Techniques de commercialisation, je recherche une alternance de 24 mois à partir de septembre 2026, rythme 3 semaines en entreprise / 1 semaine en formation. Motivé, organisé et à l’aise à l’oral, avec une première expérience en vente et en organisation d’événements.'
      }),
      experiences: [
        exp('Stagiaire assistant commercial', 'Breizh Outdoor', 'Rennes', '2026-04', '2026-06', [
          'Prospecté 120 magasins de sport par téléphone et e-mail, 14 nouveaux revendeurs signés.',
          'Mis à jour le fichier clients dans le CRM HubSpot.',
          'Préparé les supports de présentation pour un salon professionnel.'
        ]),
        exp('Vendeur (job étudiant)', 'Décathlon', 'Cesson-Sévigné', '2024-07', 'now', [
          'Conseil client au rayon randonnée, week-ends et vacances scolaires.',
          'Meilleur taux de vente de services du rayon à l’été 2025.'
        ])
      ],
      education: [
        edu('BUT Techniques de commercialisation', 'IUT de Rennes', 'Rennes', '2024-09', '2027-06', 'Parcours business développement et management de la relation client. Diplôme attendu en juin 2027.'),
        edu('Baccalauréat général, Mathématiques et SES', 'Lycée Chateaubriand', 'Rennes', '2021-09', '2024-07', 'Mention Assez bien.')
      ],
      skills: [
        sk('Commerce', ['Prospection', 'Vente conseil', 'Relation client', 'Négociation (bases)']),
        sk('Outils', ['Excel', 'PowerPoint', 'HubSpot', 'Canva']),
        sk('Savoir-être', ['Motivation', 'Aisance à l’oral', 'Travail en équipe', 'Ponctualité'])
      ],
      projects: [
        proj('Organisation d’un tournoi de futsal caritatif', '', 'Projet tutoré à 5 : 200 participants, 3 200 € reversés à une association locale ; responsable des partenariats.')
      ],
      certifications: [cert('Projet Voltaire, niveau Affaires', 'Woonoz', '2025-05')],
      languages: [lang('Français', 'langue maternelle'), lang('Anglais', 'B2'), lang('Espagnol', 'A2')],
      interests: 'Futsal en club, randonnée, montage vidéo.'
    })
  }
]

export function getPreset(id: string): PresetDef | undefined {
  return PRESETS.find((p) => p.id === id)
}

/** Preset associé à un modèle (son contenu sert d'exemple et d'aperçu). */
export function presetForTemplate(templateId: string): PresetDef | undefined {
  return PRESETS.find((p) => p.templateId === templateId)
}
