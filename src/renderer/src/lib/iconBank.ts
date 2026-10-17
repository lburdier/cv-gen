/**
 * Banque d'icônes de logiciels : ~120 outils connus, chacun avec ses couleurs de marque
 * et ses abréviations, rendus en SVG dans 6 designs. Les icônes sont générées par l'app
 * (aucun fichier téléchargé) et restent vectorielles à l'export PDF.
 */

import LOGOS_RAW from '../assets/software/logos.json'

/** Vrais logos (Simple Icons CC0, Devicon MIT), nettoyés et intégrés : voir assets/software/CREDITS.md. */
type Logo = { k: 'm'; d: string } | { k: 'c'; vb: string; b: string }
const LOGOS = LOGOS_RAW as Record<string, Logo>

export type IconDesign ='app' | 'round' | 'outline' | 'soft' | 'gradient' | 'mono'

export const ICON_DESIGNS: { id: IconDesign; label: string }[] = [
  { id: 'app', label: 'App' },
  { id: 'round', label: 'Rond' },
  { id: 'outline', label: 'Contour' },
  { id: 'soft', label: 'Doux' },
  { id: 'gradient', label: 'Dégradé' },
  { id: 'mono', label: 'Monochrome' }
]

export interface SoftwareIcon {
  id: string
  name: string
  code: string
  /** Couleur de fond (marque). */
  bg: string
  /** Couleur des lettres sur le fond (sinon calculée). */
  fg?: string
  category: string
  aliases: string[]
}

export const ICON_CATEGORIES = ['Tous', 'Design', '3D & CAO', 'Vidéo & audio', 'Développement', 'Cloud & DevOps', 'Data & bureautique', 'Gestion & collaboration', 'Marketing & web', 'IA']

// [nom, code, fond, lettres, catégorie, alias…]
type Row = [string, string, string, string | null, string, ...string[]]
const ROWS: Row[] = [
  // Design (style Adobe : fond sombre, lettres de couleur)
  ['Photoshop', 'Ps', '#001E36', '#31A8FF', 'Design', 'adobe photoshop', 'ps'],
  ['Illustrator', 'Ai', '#330000', '#FF9A00', 'Design', 'adobe illustrator', 'ai'],
  ['InDesign', 'Id', '#49021F', '#FF3366', 'Design', 'adobe indesign', 'id'],
  ['After Effects', 'Ae', '#00005B', '#9999FF', 'Vidéo & audio', 'adobe after effects', 'after effect', 'ae'],
  ['Premiere Pro', 'Pr', '#00005B', '#9999FF', 'Vidéo & audio', 'adobe premiere', 'premiere', 'pr'],
  ['Lightroom', 'Lr', '#001E36', '#31A8FF', 'Design', 'adobe lightroom'],
  ['Adobe XD', 'Xd', '#470137', '#FF61F6', 'Design', 'xd'],
  ['Audition', 'Au', '#00005B', '#9999FF', 'Vidéo & audio', 'adobe audition'],
  ['Animate', 'An', '#330000', '#FF9A00', 'Design', 'adobe animate'],
  ['Substance Painter', 'Pt', '#1C2120', '#FE5B26', '3D & CAO', 'substance 3d painter', 'adobe substance painter', 'substance'],
  ['Substance Designer', 'Ds', '#1C2120', '#FE5B26', '3D & CAO', 'substance 3d designer'],
  ['Acrobat', 'Ac', '#470000', '#FF0000', 'Data & bureautique', 'adobe acrobat', 'acrobat pro'],
  ['Figma', 'Fi', '#1E1E1E', '#F24E1E', 'Design', 'figjam'],
  ['Sketch', 'Sk', '#F7B500', '#1E1E1E', 'Design'],
  ['Canva', 'Ca', '#00C4CC', null, 'Design'],
  ['Affinity Designer', 'Ad', '#134881', null, 'Design'],
  ['Affinity Photo', 'Ap', '#7E4DD2', null, 'Design'],
  ['Procreate', 'Pc', '#111111', null, 'Design'],
  ['GIMP', 'Gi', '#5C5543', null, 'Design'],
  ['Inkscape', 'In', '#111111', null, 'Design'],
  ['Framer', 'Fr', '#0055FF', null, 'Design'],
  ['Spline', 'Sp', '#111111', null, 'Design', 'spline 3d'],
  ['Protopie', 'Pp', '#FF4F75', null, 'Design'],
  ['Maze', 'Mz', '#0A2540', null, 'Design'],
  // 3D & CAO
  ['Blender', 'Bl', '#E87D0D', null, '3D & CAO'],
  ['Maya', 'My', '#37A5CC', null, '3D & CAO', 'autodesk maya'],
  ['3ds Max', '3d', '#0696D7', null, '3D & CAO', 'autodesk 3ds max', '3dsmax'],
  ['Cinema 4D', 'C4', '#011A6A', null, '3D & CAO', 'c4d', 'maxon cinema 4d'],
  ['Houdini', 'Ho', '#FF4713', null, '3D & CAO', 'sidefx houdini'],
  ['ZBrush', 'Zb', '#1A1A1A', '#E7A33E', '3D & CAO'],
  ['Unreal Engine', 'UE', '#0E1128', null, '3D & CAO', 'unreal', 'ue5', 'ue4'],
  ['Unity', 'Un', '#222C37', null, '3D & CAO', 'unity 3d'],
  ['Godot', 'Go', '#478CBF', null, '3D & CAO', 'godot engine'],
  ['Plasticity', 'Pl', '#5B3FD9', null, '3D & CAO'],
  ['Marvelous Designer', 'Md', '#1C1C1C', '#F2B33D', '3D & CAO'],
  ['KeyShot', 'Ks', '#111111', '#3FA9F5', '3D & CAO'],
  ['SketchUp', 'Su', '#005F9E', null, '3D & CAO'],
  ['Rhino', 'Rh', '#801010', null, '3D & CAO', 'rhinoceros', 'rhino 3d'],
  ['AutoCAD', 'Ac', '#E51050', null, '3D & CAO', 'autodesk autocad'],
  ['Revit', 'Rv', '#186BFF', null, '3D & CAO', 'autodesk revit'],
  ['SolidWorks', 'Sw', '#DA291C', null, '3D & CAO', 'solid works'],
  ['Fusion 360', 'F3', '#F37F0B', null, '3D & CAO', 'autodesk fusion'],
  ['Twinmotion', 'Tm', '#111111', '#00C2FF', '3D & CAO'],
  ['Lumion', 'Lu', '#0B6E99', null, '3D & CAO'],
  ['V-Ray', 'VR', '#1A1A1A', '#FFFFFF', '3D & CAO', 'vray'],
  ['Enscape', 'En', '#121212', '#FFB000', '3D & CAO'],
  ['Archicad', 'Ar', '#1D9BD7', null, '3D & CAO'],
  // Vidéo & audio
  ['DaVinci Resolve', 'Dr', '#233A51', '#FFB000', 'Vidéo & audio', 'davinci', 'resolve'],
  ['Final Cut Pro', 'Fc', '#1C1C1E', '#FF2D55', 'Vidéo & audio', 'final cut'],
  ['CapCut', 'Cc', '#111111', null, 'Vidéo & audio'],
  ['Ableton Live', 'Ab', '#111111', null, 'Vidéo & audio', 'ableton'],
  ['FL Studio', 'FL', '#1E1E1E', '#FF7F00', 'Vidéo & audio'],
  ['Logic Pro', 'Lo', '#1C1C1E', '#9B9BA0', 'Vidéo & audio'],
  ['Pro Tools', 'PT', '#7ACB10', '#111111', 'Vidéo & audio'],
  ['OBS Studio', 'Ob', '#302E31', null, 'Vidéo & audio', 'obs'],
  ['Audacity', 'Ad', '#0000CC', null, 'Vidéo & audio'],
  ['Nuke', 'Nk', '#111111', '#F6C21C', 'Vidéo & audio', 'foundry nuke'],
  // Développement
  ['VS Code', 'VS', '#007ACC', null, 'Développement', 'visual studio code', 'vscode'],
  ['Visual Studio', 'VS', '#5C2D91', null, 'Développement'],
  ['IntelliJ IDEA', 'IJ', '#111111', '#FE315D', 'Développement', 'intellij'],
  ['PyCharm', 'PC', '#111111', '#21D789', 'Développement'],
  ['Git', 'Gt', '#F05032', null, 'Développement'],
  ['GitHub', 'GH', '#181717', null, 'Développement', 'github actions'],
  ['GitLab', 'GL', '#FC6D26', null, 'Développement', 'gitlab ci'],
  ['React', 'Re', '#20232A', '#61DAFB', 'Développement', 'react.js', 'reactjs', 'react native'],
  ['Vue.js', 'Vu', '#35495E', '#4FC08D', 'Développement', 'vue', 'vuejs', 'nuxt'],
  ['Angular', 'Ng', '#DD0031', null, 'Développement'],
  ['Next.js', 'Nx', '#111111', null, 'Développement', 'nextjs', 'next'],
  ['Node.js', 'No', '#339933', null, 'Développement', 'node', 'nodejs', 'express'],
  ['TypeScript', 'TS', '#3178C6', null, 'Développement', 'ts'],
  ['JavaScript', 'JS', '#F7DF1E', '#111111', 'Développement', 'js', 'javascript es6'],
  ['Python', 'Py', '#3776AB', '#FFD43B', 'Développement'],
  ['Java', 'Ja', '#ED8B00', null, 'Développement'],
  ['C#', 'C#', '#512BD4', null, 'Développement', 'csharp', '.net', 'dotnet'],
  ['C++', 'C+', '#00599C', null, 'Développement', 'cpp'],
  ['PHP', 'Ph', '#777BB4', null, 'Développement', 'laravel', 'symfony'],
  ['Go', 'Go', '#00ADD8', null, 'Développement', 'golang'],
  ['Rust', 'Rs', '#111111', '#DEA584', 'Développement'],
  ['Swift', 'Sw', '#F05138', null, 'Développement', 'swiftui'],
  ['Kotlin', 'Kt', '#7F52FF', null, 'Développement'],
  ['HTML', 'H5', '#E34F26', null, 'Développement', 'html5', 'html / css / js', 'html/css'],
  ['CSS', 'C3', '#1572B6', null, 'Développement', 'css3', 'sass', 'scss'],
  ['Tailwind CSS', 'Tw', '#0F172A', '#38BDF8', 'Développement', 'tailwind'],
  ['Flutter', 'Fl', '#02569B', null, 'Développement', 'dart'],
  ['Postman', 'Pm', '#FF6C37', null, 'Développement'],
  ['WordPress', 'WP', '#21759B', null, 'Marketing & web'],
  ['Webflow', 'Wf', '#4353FF', null, 'Marketing & web'],
  ['Shopify', 'Sh', '#7AB55C', null, 'Marketing & web'],
  // Cloud & DevOps
  ['AWS', 'AWS', '#232F3E', '#FF9900', 'Cloud & DevOps', 'amazon web services', 'lambda', 'ec2', 's3'],
  ['Azure', 'Az', '#0078D4', null, 'Cloud & DevOps', 'microsoft azure'],
  ['Google Cloud', 'GC', '#4285F4', null, 'Cloud & DevOps', 'gcp'],
  ['Docker', 'Dk', '#2496ED', null, 'Cloud & DevOps'],
  ['Kubernetes', 'K8', '#326CE5', null, 'Cloud & DevOps', 'k8s', 'eks', 'gke'],
  ['Terraform', 'Tf', '#7B42BC', null, 'Cloud & DevOps'],
  ['Ansible', 'An', '#EE0000', null, 'Cloud & DevOps'],
  ['Linux', 'Lx', '#111111', '#FCC624', 'Cloud & DevOps', 'debian', 'ubuntu', 'rhel'],
  ['Grafana', 'Gr', '#F46800', null, 'Cloud & DevOps'],
  ['Prometheus', 'Pr', '#E6522C', null, 'Cloud & DevOps'],
  // Data & bureautique
  ['Excel', 'X', '#217346', null, 'Data & bureautique', 'microsoft excel', 'excel avancé', 'tableaux croisés'],
  ['Word', 'W', '#2B579A', null, 'Data & bureautique', 'microsoft word'],
  ['PowerPoint', 'P', '#B7472A', null, 'Data & bureautique', 'microsoft powerpoint', 'power point'],
  ['Outlook', 'O', '#0078D4', null, 'Data & bureautique', 'microsoft outlook'],
  ['Teams', 'T', '#6264A7', null, 'Gestion & collaboration', 'microsoft teams'],
  ['Power BI', 'BI', '#F2C811', '#111111', 'Data & bureautique', 'powerbi', 'power query'],
  ['Tableau', 'Tb', '#E97627', null, 'Data & bureautique'],
  ['Looker Studio', 'Ls', '#4285F4', null, 'Data & bureautique', 'data studio', 'looker'],
  ['Google Sheets', 'GS', '#34A853', null, 'Data & bureautique', 'sheets'],
  ['SQL', 'SQL', '#CC2927', null, 'Data & bureautique', 'sql server'],
  ['PostgreSQL', 'Pg', '#4169E1', null, 'Data & bureautique', 'postgres'],
  ['MySQL', 'My', '#4479A1', null, 'Data & bureautique'],
  ['MongoDB', 'Mg', '#47A248', null, 'Data & bureautique', 'mongo'],
  ['BigQuery', 'BQ', '#669DF6', null, 'Data & bureautique'],
  ['Jupyter', 'Ju', '#F37626', null, 'Data & bureautique', 'jupyter notebook'],
  ['R', 'R', '#276DC3', null, 'Data & bureautique', 'rstudio'],
  ['pandas', 'pd', '#150458', null, 'Data & bureautique'],
  ['dbt', 'dbt', '#FF694B', null, 'Data & bureautique'],
  ['SAP', 'SAP', '#0FAAFF', null, 'Data & bureautique', 'sap fi/co', 'sap fico'],
  ['Sage', 'Sg', '#00D639', '#111111', 'Data & bureautique', 'sage 100'],
  ['Salesforce', 'SF', '#00A1E0', null, 'Marketing & web'],
  ['HubSpot', 'Hs', '#FF7A59', null, 'Marketing & web'],
  // Gestion & collaboration
  ['Notion', 'N', '#111111', null, 'Gestion & collaboration'],
  ['Slack', 'Sl', '#4A154B', null, 'Gestion & collaboration'],
  ['Jira', 'Ji', '#0052CC', null, 'Gestion & collaboration'],
  ['Confluence', 'Cf', '#172B4D', null, 'Gestion & collaboration'],
  ['Trello', 'Tr', '#0052CC', null, 'Gestion & collaboration'],
  ['Asana', 'As', '#F06A6A', null, 'Gestion & collaboration'],
  ['Miro', 'Mi', '#FFD02F', '#050038', 'Gestion & collaboration'],
  ['ClickUp', 'Cu', '#7B68EE', null, 'Gestion & collaboration'],
  ['Linear', 'Li', '#5E6AD2', null, 'Gestion & collaboration'],
  ['Monday', 'Mo', '#FF3D57', null, 'Gestion & collaboration', 'monday.com'],
  ['Google Workspace', 'GW', '#4285F4', null, 'Gestion & collaboration', 'g suite', 'google docs'],
  // Marketing & web
  ['Google Ads', 'GA', '#4285F4', null, 'Marketing & web', 'adwords'],
  ['Google Analytics', 'An', '#E37400', null, 'Marketing & web', 'ga4', 'analytics'],
  ['Meta Ads', 'Me', '#0866FF', null, 'Marketing & web', 'facebook ads', 'meta business suite', 'meta'],
  ['TikTok Ads', 'Tk', '#111111', '#25F4EE', 'Marketing & web', 'tiktok'],
  ['Mailchimp', 'Mc', '#FFE01B', '#241C15', 'Marketing & web'],
  ['Brevo', 'Bv', '#0B996E', null, 'Marketing & web', 'sendinblue'],
  ['Semrush', 'Se', '#FF642D', null, 'Marketing & web'],
  ['LinkedIn', 'in', '#0A66C2', null, 'Marketing & web', 'linkedin sales navigator', 'linkedin recruiter'],
  // IA
  ['ChatGPT', 'GPT', '#10A37F', null, 'IA', 'openai'],
  ['Claude', 'Cl', '#D97757', null, 'IA', 'anthropic'],
  ['Midjourney', 'Mj', '#111111', null, 'IA'],
  ['Copilot', 'Co', '#111111', '#8D6BFF', 'IA', 'github copilot'],
  ['Stable Diffusion', 'SD', '#3B1F6E', null, 'IA'],
  ['Runway', 'Rw', '#111111', null, 'IA', 'runway ml']
]

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim()

export const SOFTWARE: SoftwareIcon[] = ROWS.map(([name, code, bg, fg, category, ...aliases], i) => ({
  id: slug(name).replace(/\s+/g, '-') + (ROWS.findIndex((r) => r[0] === name) === i ? '' : '-' + i),
  name,
  code,
  bg,
  fg: fg ?? undefined,
  category,
  aliases: aliases.map(slug)
}))

const BY_ID = new Map(SOFTWARE.map((s) => [s.id, s]))

/** Retrouve un logiciel à partir d'un nom saisi (« Adobe Photoshop », « UE5 », « Excel avancé »…). */
export function findSoftware(item: string): SoftwareIcon | undefined {
  const q = slug(item)
  if (!q) return undefined
  return (
    SOFTWARE.find((s) => slug(s.name) === q || s.aliases.includes(q)) ??
    SOFTWARE.find((s) => q.length > 3 && (q.startsWith(slug(s.name) + ' ') || q.endsWith(' ' + slug(s.name)))) ??
    SOFTWARE.find((s) => s.aliases.some((a) => a.length > 3 && (q.startsWith(a + ' ') || q === a)))
  )
}

export function softwareById(id: string): SoftwareIcon | undefined {
  return BY_ID.get(id)
}

// ---------- Couleurs ----------
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function lum(hex: string) {
  const [r, g, b] = rgb(hex).map((x) => {
    const c = x / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function shade(hex: string, k: number) {
  const [r, g, b] = rgb(hex)
  const f = (x: number) => Math.round(k >= 0 ? x + (255 - x) * k : x * (1 + k))
  return '#' + [f(r), f(g), f(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
/** Couleur « signature » : les lettres de couleur des marques à fond sombre, sinon le fond. */
const signature = (s: SoftwareIcon) => (s.fg && lum(s.bg) < 0.06 && lum(s.fg) > 0.12 ? s.fg : s.bg)
const readableOn = (bg: string) => (lum(bg) > 0.45 ? '#111111' : '#FFFFFF')

// ---------- Rendu SVG ----------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function iconSvg(s: SoftwareIcon, design: IconDesign = 'app'): string {
  const n = s.code.length
  const size = n >= 3 ? 40 : n === 2 ? 52 : 62
  const sig = signature(s)
  let shape = ''
  let color = s.fg ?? readableOn(s.bg)
  let defs = ''
  switch (design) {
    case 'app':
      shape = `<rect x="4" y="4" width="120" height="120" rx="28" fill="${s.bg}"/>`
      break
    case 'round':
      shape = `<circle cx="64" cy="64" r="60" fill="${s.bg}"/>`
      break
    case 'outline': {
      const ink = lum(sig) > 0.6 ? shade(sig, -0.45) : sig
      shape = `<rect x="8" y="8" width="112" height="112" rx="26" fill="#FFFFFF" stroke="${ink}" stroke-width="8"/>`
      color = ink
      break
    }
    case 'soft': {
      const ink = lum(sig) > 0.6 ? shade(sig, -0.45) : sig
      shape = `<rect x="4" y="4" width="120" height="120" rx="28" fill="${shade(sig, 0.84)}"/>`
      color = ink
      break
    }
    case 'gradient': {
      const a = shade(sig, 0.18)
      const b = shade(sig, -0.42)
      defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`
      shape = `<rect x="4" y="4" width="120" height="120" rx="28" fill="url(#g)"/>`
      color = readableOn(shade(sig, -0.15))
      break
    }
    case 'mono':
      shape = `<rect x="4" y="4" width="120" height="120" rx="28" fill="#111111"/>`
      color = '#FFFFFF'
      break
  }
  const logo = LOGOS[s.id]
  // Logo officiel monochrome (Simple Icons) : recoloré selon le design, centré dans la forme.
  if (logo?.k === 'm') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${defs}${shape}<g transform="translate(32 32) scale(2.6667)" fill="${color}"><path d="${logo.d}"/></g></svg>`
  }
  // Logo officiel en couleur (Devicon) : posé sur un fond clair, ou en silhouette blanche (Monochrome).
  if (logo?.k === 'c') return colorLogoSvg(s, logo, design, sig)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${defs}${shape}<text x="64" y="64" dy=".35em" text-anchor="middle" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-weight="700" font-size="${size}" letter-spacing="-1" fill="${color}">${esc(s.code)}</text></svg>`
}

function colorLogoSvg(s: SoftwareIcon, logo: { vb: string; b: string }, design: IconDesign, sig: string): string {
  const ink = lum(sig) > 0.6 ? shade(sig, -0.45) : sig
  const inner = (size: number, extra = '') => {
    const o = (128 - size) / 2
    return `<svg x="${o}" y="${o}" width="${size}" height="${size}" viewBox="${logo.vb}"${extra}>${logo.b}</svg>`
  }
  const frame = (fill: string, stroke = '#E4E4E0', w = 3) => `<rect x="5" y="5" width="118" height="118" rx="28" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`
  let body = ''
  switch (design) {
    case 'app':
      body = frame('#FFFFFF') + inner(80)
      break
    case 'round':
      body = `<circle cx="64" cy="64" r="59" fill="#FFFFFF" stroke="#E4E4E0" stroke-width="3"/>` + inner(70)
      break
    case 'outline':
      body = frame('#FFFFFF', ink, 8) + inner(66)
      break
    case 'soft':
      body = `<rect x="4" y="4" width="120" height="120" rx="28" fill="${shade(sig, 0.86)}"/>` + inner(72)
      break
    case 'gradient':
      body =
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(sig, 0.18)}"/><stop offset="1" stop-color="${shade(sig, -0.42)}"/></linearGradient></defs>` +
        `<rect x="4" y="4" width="120" height="120" rx="28" fill="url(#g)"/><circle cx="64" cy="64" r="42" fill="#FFFFFF"/>` +
        inner(58)
      break
    case 'mono':
      body =
        // Niveaux de gris (et non silhouette) : les logos « en boîte » comme Ps ou Ai restent lisibles.
        `<defs><filter id="w"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.25" intercept="0.05"/><feFuncG type="linear" slope="1.25" intercept="0.05"/><feFuncB type="linear" slope="1.25" intercept="0.05"/></feComponentTransfer></filter></defs>` +
        `<rect x="4" y="4" width="120" height="120" rx="28" fill="#111111"/><g filter="url(#w)">${inner(68)}</g>`
      break
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${body}</svg>`
}

/** Le logiciel a-t-il son vrai logo (et de quelle source) ? */
export function logoSource(s: SoftwareIcon): 'simple-icons' | 'devicon' | null {
  const l = LOGOS[s.id]
  return l ? (l.k === 'm' ? 'simple-icons' : 'devicon') : null
}
export const REAL_LOGO_COUNT = Object.keys(LOGOS_RAW).length

export function iconDataUrl(s: SoftwareIcon, design: IconDesign = 'app'): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(s, design))
}

/**
 * Icône d'un élément de tuile : image personnalisée, icône choisie dans la banque (« bank:id »),
 * ou correspondance automatique avec le nom du logiciel.
 */
export function resolveIcon(item: string, custom: string | undefined, design: IconDesign = 'app', auto = true): string | undefined {
  if (custom?.startsWith('bank:')) {
    const s = softwareById(custom.slice(5))
    return s ? iconDataUrl(s, design) : undefined
  }
  if (custom) return custom
  if (!auto) return undefined
  const s = findSoftware(item)
  return s ? iconDataUrl(s, design) : undefined
}
