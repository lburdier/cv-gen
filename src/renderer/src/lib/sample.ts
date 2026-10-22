import { DEFAULT_ORDER, noDash, noDashDeep } from '../../../shared/format'
import type { Resume } from '../../../shared/types'
import { getTemplate, isVisual } from '../templates/registry'
import { PRESETS, getPreset, presetForTemplate } from './presets'
// Photos d'exemple Unsplash (licence Unsplash, voir assets/samples/CREDITS.md).
import samplePhoto from '../assets/samples/photo.jpg'
import sampleBanner from '../assets/samples/banner.jpg'
import render1 from '../assets/samples/render1.jpg'
import render2 from '../assets/samples/render2.jpg'
import render3 from '../assets/samples/render3.jpg'

// Portraits des personnes fictives (Unsplash, voir assets/samples/CREDITS.md) : une photo du bon genre par prénom.
const PEOPLE = import.meta.glob('../assets/samples/people/*.jpg', { eager: true, import: 'default' }) as Record<string, string>
const PHOTO_OF: Record<string, string> = {
  Camille: 'f02', Sarah: 'f05', Léa: 'f04', Sophie: 'f03', Manon: 'f06', Chloé: 'f08', Élise: 'f01', Clara: 'f11',
  Nadia: 'f12', Yasmine: 'f09', Margaux: 'f10', Laura: 'f07', Karima: 'f09', Julie: 'f03', Alexandra: 'f01', Emma: 'f11',
  Lucas: 'm06', Yanis: 'm03', Maxime: 'm01', Thomas: 'm07', Karim: 'm10', Julien: 'm09', Alexandre: 'm04', Hugo: 'm08',
  Antoine: 'm02', Samuel: 'm05', Léo: 'm11', Simon: 'm12', Mathis: 'm02', Clément: 'm03', Étienne: 'm07', Cyril: 'm01', Nabil: 'm10'
}
/** Photo d'exemple associée à un prénom fictif (aucune pour un prénom inconnu). */
export const photoFor = (firstName: string): string | undefined => PEOPLE[`../assets/samples/people/${PHOTO_OF[firstName]}.jpg`]

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3)

export function blankResume(templateId = 'atelier'): Resume {
  const t = getTemplate(templateId)
  const now = Date.now()
  return {
    id: uid(),
    title: 'Nouveau CV',
    templateId: t.id,
    accent: t.accent,
    font: t.font,
    density: 'comfortable',
    lang: 'fr',
    createdAt: now,
    updatedAt: now,
    basics: { firstName: '', lastName: '', headline: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', summary: '' },
    experiences: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    interests: '',
    links: [],
    gallery: [],
    sectionOrder: [...DEFAULT_ORDER],
    hidden: []
  }
}

/** Complète un CV enregistré avant l'ajout de nouveaux champs ou sections. */
export function normalizeResume(r: Resume): Resume {
  const order = [...r.sectionOrder, ...DEFAULT_ORDER.filter((k) => !r.sectionOrder.includes(k))]
  // Contenus créés par les anciennes versions, séparés par un tiret cadratin (« CV - Data Analyst ») :
  // plus aucun tiret cadratin, dans le titre (« · ») comme dans le contenu (« , »).
  return noDashDeep({ ...r, title: noDash(r.title, ' · '), links: r.links ?? [], gallery: r.gallery ?? [], sectionOrder: order })
}

/** Profil créatif pour les aperçus des modèles visuels (photo, bandeau et rendus Unsplash). */
export function creativeSample(templateId = 'vitrine'): Resume {
  const r = blankResume(templateId)
  return {
    ...r,
    title: 'CV · Artiste 3D',
    basics: {
      firstName: 'Inès',
      lastName: 'Moreau',
      headline: 'Artiste 3D & développeuse · Modeling · Lookdev · Rendu cinématique',
      email: 'ines.moreau@email.fr',
      phone: '06 12 34 56 78',
      location: 'Valence (26)',
      target: 'Stage de 6 mois dès février 2027',
      mobility: 'Lyon, Valence, télétravail',
      website: 'inesmoreau.fr',
      linkedin: 'linkedin.com/in/inesmoreau',
      github: '',
      ctaLabel: 'Réserver un échange',
      ctaUrl: 'inesmoreau.fr/contact',
      photo: samplePhoto,
      banner: sampleBanner,
      summary:
        'Passionnée par la 3D et la création numérique, je conçois des univers visuels et des objets photoréalistes, du modeling au rendu cinématique. Objectif : devenir artiste 3D et concevoir des cinématiques en réunissant design, animation et narration visuelle.'
    },
    links: [
      { id: uid(), label: 'ArtStation', url: 'artstation.com/inesmoreau' },
      { id: uid(), label: 'Instagram', url: 'instagram.com/ines.3d' }
    ],
    experiences: [
      {
        id: uid(),
        role: 'Stage en milieu professionnel',
        company: 'Atelier Nébuleuse',
        location: 'Montélier',
        start: '2024-01',
        end: '2025-06',
        current: false,
        bullets: ['Gestion de projet et web design', 'Réalisation de sites web, SEO et branding', 'Montage vidéo et création de logos']
      },
      {
        id: uid(),
        role: 'Artiste 3D, Court-métrage « Perspective »',
        company: 'Court-métrage indépendant',
        location: 'Bénévolat',
        start: '2023-03',
        end: '2023-09',
        current: false,
        bullets: ['Modeling, rigging et lighting', 'Texturing et dépliage UV', '3D tracking pour intégration VFX']
      },
      {
        id: uid(),
        role: 'Projets 3D personnels',
        company: 'Portfolio inesmoreau.fr',
        location: '',
        start: '2024-01',
        end: '',
        current: true,
        bullets: ['Hard surface : véhicules et accessoires (modeling, lookdev, rendu)', 'Développement front-end du portfolio en 6 langues']
      }
    ],
    education: [
      { id: uid(), degree: 'Bachelor Animation 3D & Jeux vidéo', school: 'Campus Créa', location: 'Lyon', start: '2025-09', end: '', details: 'En cours' },
      { id: uid(), degree: 'BTS SIO, option SLAM', school: 'Lycée Les Catalins', location: 'Valence', start: '2023-09', end: '2025-06', details: '' }
    ],
    skills: [
      { id: uid(), name: 'Logiciels', items: ['Blender', 'Substance Painter', 'Unreal Engine', 'DaVinci Resolve', 'Photoshop', 'Plasticity'], display: 'tiles' },
      { id: uid(), name: 'Hard skills', items: ['Modeling', 'UV', 'Sculpting', 'Baking', 'Texturing PBR', 'Lighting', 'Lookdev', 'Rendu Cycles', 'Étalonnage', 'HTML / CSS / JS'], display: 'list' },
      { id: uid(), name: 'Soft skills', items: ['Curiosité', 'Autonomie', 'Rigueur', 'Esprit d’équipe'], display: 'chips' }
    ],
    gallery: [
      { id: uid(), image: render1, caption: 'Pendule de Newton, lookdev' },
      { id: uid(), image: render2, caption: 'Fluide chromé, simulation' },
      { id: uid(), image: render3, caption: 'Molécules, shading' }
    ],
    languages: [
      { id: uid(), name: 'Anglais', level: 'B1' }
    ],
    interests: 'Dev perso, Cinéma, Jeux vidéo, Musculation'
  }
}

/** CV complet d'un preset métier (contenu réaliste, modèle et couleur associés). */
export function presetResume(presetId: string): Resume {
  const p = getPreset(presetId)
  if (!p?.build) return { ...creativeSample(p?.templateId ?? 'studio'), title: 'CV · Artiste 3D' }
  const r = blankResume(p.templateId)
  const c = p.build()
  return {
    ...r,
    ...c,
    basics: { ...c.basics, photo: c.basics.photo ?? photoFor(c.basics.firstName) },
    projects: c.projects ?? [],
    certifications: c.certifications ?? [],
    languages: c.languages ?? [],
    interests: c.interests ?? ''
  }
}

/** Habille un CV d'exemple aux couleurs et à la police d'un modèle. */
function withTemplate(r: Resume, templateId: string): Resume {
  const t = getTemplate(templateId)
  return { ...r, templateId: t.id, accent: t.accent, ...(t.accent2 ? { accent2: t.accent2 } : {}), font: t.font }
}

/** Exemple affiché pour un modèle : le preset métier qui lui est associé. */
export function sampleResume(templateId = 'atelier'): Resume {
  const tpl = getTemplate(templateId)
  // Collection « Inspirations » : un métier et une personne d'exemple propres au modèle.
  if (tpl.sample) return withTemplate(presetAs(tpl.sample.preset, tpl.sample.gender), templateId)
  if (isVisual(templateId)) return creativeSample(templateId)
  const p = presetForTemplate(templateId) ?? getPreset('dev-fullstack')!
  const t = getTemplate(templateId)
  return { ...presetResume(p.id), templateId: t.id, accent: t.accent, font: t.font }
}

export const SAMPLE_OFFER = `Développeur·se Full-Stack React / Node.js (H/F), CDI, Lyon (hybride)

Rejoignez notre équipe produit de 25 personnes pour construire la nouvelle génération de notre plateforme SaaS B2B.

Vos missions :
- Développer de nouvelles fonctionnalités front-end en React et TypeScript
- Concevoir des API REST et GraphQL performantes en Node.js
- Participer à l'architecture cloud sur AWS (Lambda, ECS, RDS PostgreSQL)
- Garantir la qualité : tests unitaires et end-to-end, revues de code, CI/CD
- Collaborer avec les Product Designers (Figma) et le Product Owner en méthode Agile Scrum

Profil recherché :
- 4 ans d'expérience minimum en développement web full-stack
- Maîtrise de React, TypeScript et Node.js
- Expérience avec PostgreSQL, Docker et un cloud provider (AWS idéalement)
- Connaissance de GraphQL appréciée
- Sensibilité à l'accessibilité et à la performance web
- Anglais professionnel
- Autonomie, esprit d'équipe et sens du produit`

/** Vrai si l'utilisateur n'a encore rien saisi dans ce CV. */
export function isEmptyResume(r: Resume): boolean {
  const b = r.basics
  const text = [b.firstName, b.lastName, b.headline, b.email, b.phone, b.location, b.summary, b.target ?? '', b.mobility ?? '', r.interests]
  return (
    text.every((v) => !v.trim()) &&
    !b.photo &&
    !b.banner &&
    r.experiences.length === 0 &&
    r.education.length === 0 &&
    r.skills.every((g) => g.items.length === 0) &&
    r.projects.length === 0 &&
    r.certifications.length === 0 &&
    r.languages.length === 0 &&
    !(r.gallery ?? []).length &&
    !(r.links ?? []).length
  )
}

// ---------- Aperçus « Fille / Garçon » ----------
// Les modèles conviennent à tout le monde : seul le profil d'exemple affiché change.

export type PreviewGender = 'all' | 'f' | 'm'

const FEMALE_NAMES = new Set(['Inès', 'Camille', 'Sarah', 'Léa', 'Sophie', 'Manon', 'Chloé', 'Élise', 'Clara', 'Nadia', 'Yasmine', 'Margaux', 'Laura', 'Karima', 'Julie', 'Alexandra', 'Emma'])
export const genderOf = (r: Resume): 'f' | 'm' => (FEMALE_NAMES.has(r.basics.firstName) ? 'f' : 'm')

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Version masculine du profil créatif (même parcours, sans photo). */
function creativeMale(base: Resume): Resume {
  const { photo: _photo, banner, ...basics } = base.basics
  const gallery = base.gallery
  const text = JSON.stringify({ ...base, basics, gallery: [] })
    .replace(/Inès/g, 'Lucas')
    .replace(/MOREAU|Moreau/g, (m) => (m === 'MOREAU' ? 'MARTIN' : 'Martin'))
    .replace(/inesmoreau/gi, 'lucasmartin')
    .replace(/ines\.moreau/gi, 'lucas.martin')
    .replace(/ines\./gi, 'lucas.')
    .replace(/développeuse/g, 'développeur')
    .replace(/Passionnée/g, 'Passionné')
  const r = JSON.parse(text) as Resume
  return { ...r, basics: { ...r.basics, banner, photo: photoFor('Lucas') }, gallery }
}

// Chaque personne fictive a son équivalent de l'autre genre (prénom proche), pour proposer
// tous les métiers en version « Fille » comme en version « Garçon ».
const NAME_SWAP: Record<string, string> = {
  Camille: 'Antoine',
  Sarah: 'Samuel',
  Léa: 'Léo',
  Sophie: 'Simon',
  Manon: 'Mathis',
  Chloé: 'Clément',
  Élise: 'Étienne',
  Clara: 'Cyril',
  Nadia: 'Nabil',
  Yanis: 'Yasmine',
  Maxime: 'Margaux',
  Thomas: 'Laura',
  Karim: 'Karima',
  Julien: 'Julie',
  Alexandre: 'Alexandra',
  Hugo: 'Emma'
}

// Accords [féminin, masculin] : expressions d'abord, puis mots seuls (titres, résumés, postes).
const AGREEMENTS: [string, string][] = [
  ['Assistante administrative et commerciale', 'Assistant administratif et commercial'],
  ['Assistante administrative', 'Assistant administratif'],
  ['assistante commerciale', 'assistant commercial'],
  ['Contrôleuse de gestion industrielle', 'Contrôleur de gestion industriel'],
  ['Développeuse', 'Développeur'],
  ['développeuse', 'développeur'],
  ['Cheffe', 'Chef'],
  ['cheffe', 'chef'],
  ['Chargée', 'Chargé'],
  ['chargée', 'chargé'],
  ['Assistante', 'Assistant'],
  ['assistante', 'assistant'],
  ['Infirmière', 'Infirmier'],
  ['Ingénieure', 'Ingénieur'],
  ['Contrôleuse', 'Contrôleur'],
  ['Étudiante', 'Étudiant'],
  ['diplômée', 'diplômé'],
  ['Spécialisée', 'Spécialisé'],
  ['Habituée', 'Habitué'],
  ['Attachée', 'Attaché'],
  ['attachée', 'attaché'],
  ['polyvalente', 'polyvalent'],
  ['Organisée', 'Organisé'],
  ['organisée', 'organisé'],
  ['Motivée', 'Motivé'],
  ['Passionnée', 'Passionné'],
  ['passionnée', 'passionné'],
  ['Créative', 'Créatif'],
  ['Réactive', 'Réactif'],
  ['Rigoureuse', 'Rigoureux'],
  ['rigoureuse', 'rigoureux']
]

const plain = (w: string) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const word = (w: string) => new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, 'gu')

/** Accorde un texte au genre voulu (titres de métiers, adjectifs du résumé). */
export function agree(text: string, to: 'f' | 'm'): string {
  return AGREEMENTS.reduce((t, [fem, masc]) => t.replace(word(to === 'm' ? fem : masc), to === 'm' ? masc : fem), text)
}

/** CV d'un preset métier avec une personne du genre voulu (même parcours, accords revus). */
export function presetAs(presetId: string, gender: PreviewGender): Resume {
  const r = presetResume(presetId)
  if (gender === 'all' || genderOf(r) === gender) return r
  if (r.basics.firstName === 'Inès') return creativeMale(r)
  const from = r.basics.firstName
  const to = NAME_SWAP[from]
  if (!to) return r
  const { photo, banner, ...basics } = r.basics
  const json = JSON.stringify({ ...r, basics, gallery: [] })
    .replace(word(from), to)
    .replace(new RegExp(`(?<![a-z])${plain(from)}(?=[.-])`, 'g'), plain(to))
  const out = JSON.parse(agree(json, gender)) as Resume
  return { ...out, basics: { ...out.basics, photo: photoFor(to) ?? photo, banner }, gallery: r.gallery }
}

/** Nom du métier affiché sur la carte d'un preset, accordé au choix « Fille / Garçon ». */
export function presetName(presetId: string, name: string, gender: PreviewGender): string {
  return gender === 'all' ? name : agree(name, gender)
}

/** Profil d'exemple d'un modèle selon le choix « Fille / Garçon » (« all » : profil habituel). */
export function sampleFor(templateId: string, gender: PreviewGender): Resume {
  const base = sampleResume(templateId)
  const t = getTemplate(templateId)
  // Modèles du studio : un métier différent selon le modèle (du genre choisi, ou mixte).
  if (t.studio) {
    const pool = PRESETS.filter((p) => p.build).map((p) => presetAs(p.id, gender))
    const creative = gender === 'm' ? creativeMale(base) : base
    const all = [creative, ...pool]
    const pick = all[hash(templateId) % all.length]
    return { ...pick, templateId: t.id, accent: t.accent, font: t.font }
  }
  if (gender === 'all' || genderOf(base) === gender) return base
  if (t.sample) return withTemplate(presetAs(t.sample.preset, gender), templateId)
  if (isVisual(templateId)) return creativeMale(base)
  const p = presetForTemplate(templateId) ?? getPreset('dev-fullstack')!
  return { ...presetAs(p.id, gender), templateId: t.id, accent: t.accent, font: t.font }
}
