import { DEFAULT_ORDER } from '../../../shared/format'
import type { Resume } from '../../../shared/types'
import { getTemplate, isVisual } from '../templates/registry'
import { getPreset, presetForTemplate } from './presets'
// Photos d'exemple Unsplash (licence Unsplash, voir assets/samples/CREDITS.md).
import samplePhoto from '../assets/samples/photo.jpg'
import sampleBanner from '../assets/samples/banner.jpg'
import render1 from '../assets/samples/render1.jpg'
import render2 from '../assets/samples/render2.jpg'
import render3 from '../assets/samples/render3.jpg'

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
  return { ...r, links: r.links ?? [], gallery: r.gallery ?? [], sectionOrder: order }
}

/** Profil créatif pour les aperçus des modèles visuels (photo, bandeau et rendus Unsplash). */
export function creativeSample(templateId = 'vitrine'): Resume {
  const r = blankResume(templateId)
  return {
    ...r,
    title: 'CV — Artiste 3D',
    basics: {
      firstName: 'Inès',
      lastName: 'Moreau',
      headline: 'Artiste 3D & développeuse · Modeling · Lookdev · Rendu cinématique',
      email: 'ines.moreau@email.fr',
      phone: '06 12 34 56 78',
      location: 'Valence (26)',
      mobility: 'Lyon, Valence, remote',
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
        role: 'Artiste 3D — Court-métrage « Perspective »',
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
      { id: uid(), degree: 'BTS SIO — option SLAM', school: 'Lycée Les Catalins', location: 'Valence', start: '2023-09', end: '2025-06', details: '' }
    ],
    skills: [
      { id: uid(), name: 'Logiciels', items: ['Blender', 'Substance Painter', 'Unreal Engine', 'DaVinci Resolve', 'Photoshop', 'Plasticity'], display: 'tiles' },
      { id: uid(), name: 'Hard skills', items: ['Modeling', 'UV', 'Sculpting', 'Baking', 'Texturing PBR', 'Lighting', 'Lookdev', 'Rendu Cycles', 'Étalonnage', 'HTML / CSS / JS'], display: 'list' },
      { id: uid(), name: 'Soft skills', items: ['Curiosité', 'Autonomie', 'Rigueur', 'Esprit d’équipe'], display: 'chips' }
    ],
    gallery: [
      { id: uid(), image: render1, caption: 'Pendule de Newton — lookdev' },
      { id: uid(), image: render2, caption: 'Fluide chromé — simulation' },
      { id: uid(), image: render3, caption: 'Molécules — shading' }
    ],
    languages: [
      { id: uid(), name: 'Français', level: 'natif' },
      { id: uid(), name: 'Anglais', level: 'intermédiaire' }
    ],
    interests: 'Dev perso, Cinéma, Jeux vidéo, Musculation'
  }
}

/** CV complet d'un preset métier (contenu réaliste, modèle et couleur associés). */
export function presetResume(presetId: string): Resume {
  const p = getPreset(presetId)
  if (!p?.build) return { ...creativeSample(p?.templateId ?? 'studio'), title: 'CV — Artiste 3D' }
  const r = blankResume(p.templateId)
  const c = p.build()
  return {
    ...r,
    ...c,
    projects: c.projects ?? [],
    certifications: c.certifications ?? [],
    languages: c.languages ?? [],
    interests: c.interests ?? ''
  }
}

/** Exemple affiché pour un modèle : le preset métier qui lui est associé. */
export function sampleResume(templateId = 'atelier'): Resume {
  if (isVisual(templateId)) return creativeSample(templateId)
  const p = presetForTemplate(templateId) ?? getPreset('dev-fullstack')!
  const t = getTemplate(templateId)
  return { ...presetResume(p.id), templateId: t.id, accent: t.accent, font: t.font }
}

export const SAMPLE_OFFER = `Développeur·se Full-Stack React / Node.js (H/F) — CDI — Lyon (hybride)

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
  const text = [b.firstName, b.lastName, b.headline, b.email, b.phone, b.location, b.summary, b.mobility ?? '', r.interests]
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
