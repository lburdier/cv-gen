// Design paramétrable du modèle « Sur mesure » : valeurs par défaut et normalisation
// (les réponses de l'IA et les anciennes données sont ramenées à des valeurs valides).
import type { DesignSpec, SectionKey } from './types'

export const DEFAULT_DESIGN: DesignSpec = {
  layout: 'sidebar-left',
  sidebarWidth: 32,
  header: 'minimal',
  headerAlign: 'left',
  photo: 'circle',
  photoPlace: 'sidebar',
  photoSide: 'left',
  headings: 'underline',
  bodyFont: 'sans',
  displayFont: 'sans',
  nameCase: 'normal',
  nameSize: 'l',
  skills: 'chips',
  timeline: true,
  corners: 'rounded',
  density: 'airy',
  colors: {
    primary: '#2323E6',
    secondary: '#F0A6F7',
    page: '#FFFFFF',
    text: '#141414',
    sidebar: '#F1F1FB',
    header: '#FFFFFF'
  },
  sidebarSections: ['skills', 'languages', 'interests', 'certifications'],
  decor: 'none',
  headerShape: 'flat',
  nameStyle: 'accent',
  bullets: 'dot',
  entries: 'plain',
  frame: 'none'
}

const SECTIONS: SectionKey[] = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'interests', 'gallery']

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = String(v ?? '').toLowerCase().trim()
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback
}

export function normalizeHexColor(v: unknown, fallback: string): string {
  const m = /^#?([\da-f]{6}|[\da-f]{3})$/i.exec(String(v ?? '').trim())
  if (!m) return fallback
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return '#' + h.toUpperCase()
}

/** Ramène n'importe quel objet (réponse d'IA, données anciennes) à un design complet et valide. */
export function normalizeDesign(input: unknown, base: DesignSpec = DEFAULT_DESIGN): DesignSpec {
  const d = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const c = (d.colors && typeof d.colors === 'object' ? d.colors : {}) as Record<string, unknown>
  const width = Number(d.sidebarWidth)
  const side = Array.isArray(d.sidebarSections) ? (d.sidebarSections as unknown[]).map((x) => String(x).toLowerCase()).filter((x): x is SectionKey => SECTIONS.includes(x as SectionKey)) : base.sidebarSections
  return {
    layout: pick(d.layout, ['single', 'sidebar-left', 'sidebar-right'] as const, base.layout),
    sidebarWidth: Number.isFinite(width) ? Math.min(42, Math.max(24, Math.round(width))) : base.sidebarWidth,
    header: pick(d.header, ['band', 'card', 'minimal', 'split'] as const, base.header),
    headerAlign: pick(d.headerAlign, ['left', 'center'] as const, base.headerAlign),
    photo: pick(d.photo, ['none', 'circle', 'rounded', 'square'] as const, base.photo),
    photoPlace: pick(d.photoPlace, ['header', 'sidebar'] as const, base.photoPlace),
    photoSide: pick(d.photoSide, ['left', 'right'] as const, base.photoSide ?? 'left'),
    headings: pick(d.headings, ['underline', 'pill', 'block', 'caps', 'highlight', 'bar'] as const, base.headings),
    bodyFont: pick(d.bodyFont, ['sans', 'serif', 'mono'] as const, base.bodyFont),
    displayFont: pick(d.displayFont, ['sans', 'serif', 'mono', 'wide'] as const, base.displayFont),
    nameCase: pick(d.nameCase, ['upper', 'normal'] as const, base.nameCase),
    nameSize: pick(d.nameSize, ['m', 'l', 'xl'] as const, base.nameSize),
    skills: pick(d.skills, ['chips', 'list', 'columns'] as const, base.skills),
    timeline: typeof d.timeline === 'boolean' ? d.timeline : d.timeline === 'true' ? true : d.timeline === 'false' ? false : base.timeline,
    corners: pick(d.corners, ['square', 'rounded'] as const, base.corners),
    density: pick(d.density, ['airy', 'compact'] as const, base.density),
    colors: {
      primary: normalizeHexColor(c.primary, base.colors.primary),
      secondary: normalizeHexColor(c.secondary, base.colors.secondary),
      page: normalizeHexColor(c.page, base.colors.page),
      text: normalizeHexColor(c.text, base.colors.text),
      sidebar: normalizeHexColor(c.sidebar, base.colors.sidebar),
      header: normalizeHexColor(c.header, base.colors.header)
    },
    sidebarSections: side.length || Array.isArray(d.sidebarSections) ? side : base.sidebarSections,
    decor: pick(d.decor, ['none', 'dots', 'grid', 'lines', 'diagonal', 'waves', 'circles', 'blobs', 'confetti'] as const, base.decor ?? 'none'),
    headerShape: pick(d.headerShape, ['flat', 'curve', 'slant', 'wave'] as const, base.headerShape ?? 'flat'),
    nameStyle: pick(d.nameStyle, ['plain', 'accent', 'outline', 'highlight', 'gradient'] as const, base.nameStyle ?? 'accent'),
    bullets: pick(d.bullets, ['dot', 'dash', 'arrow', 'square', 'check'] as const, base.bullets ?? 'dot'),
    entries: pick(d.entries, ['plain', 'cards', 'rule'] as const, base.entries ?? 'plain'),
    frame: pick(d.frame, ['none', 'top', 'side', 'border'] as const, base.frame ?? 'none')
  }
}
