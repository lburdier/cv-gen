import { useContext, type CSSProperties, type ReactNode } from 'react'
import { BookOpen, Camera, Coffee, Dumbbell, Film, Gamepad2, Globe, Mail, MapPin, Music, Palette, Phone, Plane, Sparkle, User, BarChart3, GraduationCap, Wrench, Send } from 'lucide-react'
import { sectionTitles, stripProtocol, visibleSections } from '../../../shared/format'
import type { Resume, SectionKey } from '../../../shared/types'
import { EditableContext, usePlaceholders } from './previewContext'
import { resolveIcon } from '../lib/iconBank'
import { FONTS } from './registry'

/**
 * Collection « Reproductions » : seize modèles visuels recréés d'après des CV de référence
 * (mises en page, formes, typographies et couleurs), alimentés par le contenu du CV.
 * Chaque modèle a sa propre mise en page ; les blocs de données sont partagés.
 */

export const REPLICA_IDS = ['arche', 'chevron', 'petale', 'monochrome', 'grille', 'degrade', 'medaillon', 'dune', 'angles', 'nocturne', 'pastel', 'cartel', 'collage', 'sachet', 'ecran', 'tribune'] as const
export const isReplica = (id: string) => (REPLICA_IDS as readonly string[]).includes(id)

// ---------- Outils ----------

function years(start: string, end: string, current: boolean, lang: Resume['lang']) {
  const s = start.slice(0, 4)
  const e = current ? (lang === 'en' ? 'Present' : 'Présent') : end.slice(0, 4)
  if (s && e && s !== e) return `${s} - ${e}`
  return s || e
}

/** Années d'expérience d'un poste (« 3+ »), pour le modèle Cartel. */
function span(start: string, end: string, current: boolean) {
  const s = parseInt(start.slice(0, 4))
  const e = current || !end ? new Date().getFullYear() : parseInt(end.slice(0, 4))
  if (!s || !e) return ''
  return `${Math.max(1, e - s)}+`
}

function initials(text: string) {
  const words = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase()
}

/** Monogramme façon logiciel (« Ps », « Ai », « Fi ») à partir d'un nom d'outil. */
function mono(name: string) {
  const known: Record<string, string> = { photoshop: 'Ps', illustrator: 'Ai', indesign: 'Id', 'after effects': 'Ae', premiere: 'Pr', 'premiere pro': 'Pr', xd: 'Xd', 'adobe xd': 'Xd', figma: 'Fi', blender: 'Bl', 'davinci resolve': 'Dr', 'unreal engine': 'Ue', 'substance painter': 'Pt', excel: 'Xl', 'power bi': 'Bi', sketch: 'Sk', 'cinema 4d': 'C4' }
  const k = name.toLowerCase().trim()
  if (known[k]) return known[k]
  const w = name.split(/\s+/).filter(Boolean)
  return w.length > 1 ? (w[0][0] + w[1][0]).toUpperCase() : name.slice(0, 2).replace(/^./, (c) => c.toUpperCase())
}

/** Niveau d'une compétence : explicite (« Figma 80 % », « Typographie - Expert »), sinon selon son rang. */
function skillLevel(item: string, index: number) {
  const pct = /(\d{1,3})\s*%/.exec(item)
  const name = item
    .replace(/\s*[(:\-–]?\s*\d{1,3}\s*%\s*\)?\s*$/, '')
    .replace(/\s+[-–:]\s*(expert|avancé|confirmé|intermédiaire|débutant|notions|advanced|intermediate|beginner)\s*$/i, '')
    .trim()
  const word = /(expert|avancé|confirmé|intermédiaire|débutant|notions|advanced|intermediate|beginner)\s*$/i.exec(item)?.[1]?.toLowerCase()
  if (pct) return { name, value: Math.min(100, parseInt(pct[1])), explicit: true, word: '' }
  if (word) {
    const value = /expert/.test(word) ? 95 : /avancé|confirmé|advanced/.test(word) ? 80 : /intermédiaire|intermediate/.test(word) ? 60 : 38
    return { name, value, explicit: false, word: word.charAt(0).toUpperCase() + word.slice(1) }
  }
  return { name: item, value: Math.max(52, 92 - index * 8), explicit: false, word: '' }
}

function levelPercent(level: string) {
  const l = level.toLowerCase()
  if (/natif|maternelle|native|bilingue|bilingual|c2/.test(l)) return 100
  if (/c1|courant|fluent|avancé|advanced|professionnel/.test(l)) return 85
  if (/b2/.test(l)) return 70
  if (/b1|intermédiaire|intermediate|bon niveau/.test(l)) return 55
  if (/a2|notions|basic|élémentaire|scolaire/.test(l)) return 35
  if (/a1|débutant|beginner/.test(l)) return 20
  return 60
}

function interestIcon(label: string) {
  const l = label.toLowerCase()
  if (/musiq|music|guitare|piano/.test(l)) return Music
  if (/photo/.test(l)) return Camera
  if (/voyage|travel|trek|randonn/.test(l)) return Plane
  if (/lecture|livre|read|podcast|book/.test(l)) return BookOpen
  if (/jeu|game|gaming/.test(l)) return Gamepad2
  if (/sport|muscu|course|running|foot|tennis|yoga|natation|futsal|rugby/.test(l)) return Dumbbell
  if (/ciné|film|série|théâtre/.test(l)) return Film
  if (/dessin|art|illustr|peinture|design|mode/.test(l)) return Palette
  if (/cuisine|café|coffee|gastr/.test(l)) return Coffee
  return Sparkle
}

const LinkedinIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" />
    <path d="M7 10v7M7 7v.01M11 17v-4.2c0-1.6 1-2.6 2.3-2.6s2.2.9 2.2 2.6V17M11 10v7" stroke="var(--rp-icon-bg, #fff)" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
)
const GithubIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
  </svg>
)

type ContactKind = 'phone' | 'email' | 'location' | 'website' | 'linkedin' | 'github' | 'link'
const CONTACT_ICON: Record<ContactKind, (size: number) => ReactNode> = {
  phone: (s) => <Phone size={s} />,
  email: (s) => <Mail size={s} />,
  location: (s) => <MapPin size={s} />,
  website: (s) => <Globe size={s} />,
  linkedin: (s) => <LinkedinIcon size={s} />,
  github: (s) => <GithubIcon size={s} />,
  link: (s) => <Send size={s} />
}

/** Code-barres décoratif stable (modèles Collage et Sachet). */
function Barcode({ seed, bars = 46, className }: { seed: string; bars?: number; className?: string }) {
  let h = 7
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const widths: number[] = []
  for (let i = 0; i < bars; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    widths.push(1 + (h % 4))
  }
  let x = 0
  return (
    <svg className={className} viewBox={`0 0 ${widths.reduce((a, w) => a + w + 1.6, 0)} 40`} preserveAspectRatio="none" aria-hidden>
      {widths.map((w, i) => {
        const r = <rect key={i} x={x} y="0" width={i % 2 ? w * 0.6 : w} height="40" fill="currentColor" />
        x += w + 1.6
        return r
      })}
    </svg>
  )
}

/** Motif façon QR code, stable pour un même texte (purement décoratif). */
function QrMark({ seed, className }: { seed: string; className?: string }) {
  let h = 11
  for (const c of seed) h = (h * 33 + c.charCodeAt(0)) >>> 0
  const n = 21
  const cells: ReactNode[] = []
  const finder = (x: number, y: number) => x < 7 && y < 7
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const inFinder = finder(x, y) || finder(n - 1 - x, y) || finder(x, n - 1 - y)
      if (inFinder) continue
      h = (h * 1103515245 + 12345) >>> 0
      if ((h >>> 16) % 2) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)
    }
  const box = (x: number, y: number) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  )
  return (
    <svg className={className} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden>
      <g fill="currentColor">
        {cells}
        {box(0, 0)}
        {box(n - 7, 0)}
        {box(0, n - 7)}
      </g>
    </svg>
  )
}

/** Étoile à quatre branches (modèle Arche). */
const Spark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" aria-hidden>
    <path d="M10 0c.6 5.6 3.8 9 10 10-6.2 1-9.4 4.4-10 10-.6-5.6-3.8-9-10-10 6.2-1 9.4-4.4 10-10z" fill="currentColor" />
  </svg>
)

/** Pastille souriante (modèles Collage et Sachet). */
const Smiley = ({ className, outline }: { className?: string; outline?: boolean }) => (
  <svg className={className} viewBox="0 0 100 100" aria-hidden>
    {outline ? <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="7" /> : <circle cx="50" cy="50" r="46" fill="url(#rp-holo)" />}
    <defs>
      <linearGradient id="rp-holo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8EF5D0" />
        <stop offset="0.45" stopColor="#B8A6FF" />
        <stop offset="0.75" stopColor="#7FD3FF" />
        <stop offset="1" stopColor="#F9F871" />
      </linearGradient>
    </defs>
    <ellipse cx="36" cy="40" rx="5" ry="10" fill={outline ? 'currentColor' : '#111'} />
    <ellipse cx="64" cy="40" rx="5" ry="10" fill={outline ? 'currentColor' : '#111'} />
    <path d="M26 60c8 14 40 14 48 0" fill="none" stroke={outline ? 'currentColor' : '#111'} strokeWidth="6" strokeLinecap="round" />
  </svg>
)

const LABELS = {
  fr: { contact: 'Contact', coords: 'Coordonnées', info: 'Informations personnelles', about: 'À propos', profile: 'Profil', resume: 'CV', more: 'En plus', software: 'Logiciels', website: 'Site web', phone: 'Téléphone', address: 'Adresse', references: 'Références', present: 'Présent' },
  en: { contact: 'Contact', coords: 'Contact', info: 'Personal details', about: 'About me', profile: 'Profile', resume: 'Resume', more: 'More', software: 'Software', website: 'Website', phone: 'Phone', address: 'Address', references: 'References', present: 'Present' }
}

// ---------- Rendu ----------

export function CvReplica({ resume: r }: { resume: Resume }) {
  const ph = usePlaceholders()
  const editable = useContext(EditableContext)
  const E = (edit: string, label: string) => (editable ? { 'data-edit': edit, 'data-edit-label': label } : {})
  const b = { ...r.basics, firstName: ph.first(r.basics.firstName), lastName: ph.last(r.basics.lastName), headline: ph.headline(r.basics.headline) }
  const t = sectionTitles(r)
  const L = LABELS[r.lang]
  const shown = new Set<SectionKey>(visibleSections(r))
  const font = FONTS.find((f) => f.id === r.font && f.id !== 'inter')
  const style = {
    '--cv-accent': r.accent,
    ...(r.accent2 ? { '--cv-accent-2': r.accent2 } : {}),
    ...(font ? { '--rp-body': font.stack } : {})
  } as CSSProperties
  const fullName = `${b.firstName} ${b.lastName}`.trim()
  const headline = b.headline.split(/\s+[·|]\s+/)[0]
  // Intitulé court (« Chargée de recrutement » plutôt que « … et marque employeur »).
  // Taille des grands titres selon leur longueur : un nom long rétrécit au lieu de déborder.
  const longest = (...parts: string[]) => Math.max(1, ...parts.flatMap((p) => p.split(/s+/)).map((w) => w.length))
  const fit = (max: number, width: number, ratio: number, ...parts: string[]): CSSProperties => ({ fontSize: `${Math.min(max, Math.floor(width / (longest(...parts) * ratio)))}px` })
  const fitLine = (max: number, width: number, ratio: number, text: string): CSSProperties => ({ fontSize: `${Math.min(max, Math.floor(width / (Math.max(1, text.length) * ratio)))}px` })
  const shortHead = headline.split(/\s+(?:et|and|&)\s+|,\s*/)[0]

  // ---------- Données ----------
  const contacts = (
    [
      ['phone', b.phone],
      ['email', b.email],
      ['location', b.location],
      ['website', b.website ? stripProtocol(b.website) : ''],
      ['linkedin', b.linkedin ? stripProtocol(b.linkedin) : ''],
      ['github', b.github ? stripProtocol(b.github) : '']
    ] as [ContactKind, string][]
  )
    .filter(([, v]) => v)
    .concat((r.links ?? []).filter((l) => l.url).map((l) => ['link', stripProtocol(l.url)] as [ContactKind, string]))
  const contactList = (cls: string, size = 12, max = 6) => (
    <ul className={cls} {...E('tab:identity', 'Modifier les coordonnées')}>
      {contacts.slice(0, max).map(([k, v]) => (
        <li key={k + v}>
          <i className="rp-ico">{CONTACT_ICON[k](size)}</i>
          <span>{v}</span>
        </li>
      ))}
    </ul>
  )

  const exps = shown.has('experience') ? r.experiences : []
  const edus = shown.has('education') ? r.education : []
  const projects = shown.has('projects') ? r.projects : []
  const certs = shown.has('certifications') ? r.certifications : []
  const langs = shown.has('languages') ? r.languages : []
  const groups = shown.has('skills') ? r.skills.filter((g) => g.items.length) : []
  const skills = groups.flatMap((g) => g.items)
  const leveled = skills.map((s, i) => skillLevel(s, i))
  const interests = shown.has('interests')
    ? r.interests
        .split(/[,;·]/)
        .map((x) => x.trim())
        .filter(Boolean)
    : []
  const summary = shown.has('summary') ? b.summary.trim() : ''
  const gallery = shown.has('gallery') ? (r.gallery ?? []).filter((g) => g.image) : []
  // Outils (première famille de compétences « tuiles », sinon la première).
  const toolGroup = groups.find((g) => g.display === 'tiles') ?? groups[0]
  const tools = toolGroup?.items ?? []
  const otherSkills = groups.filter((g) => g !== toolGroup).flatMap((g) => g.items)

  const photo = (cls: string) =>
    b.photo ? (
      <img className={`rp-photo ${cls}`} src={b.photo} alt="" {...E('photo', 'Changer la photo')} />
    ) : (
      <div className={`rp-photo rp-initials ${cls}`} {...E('photo', 'Ajouter une photo')}>
        {initials(fullName)}
      </div>
    )
  const when = (e: { start: string; end: string; current?: boolean }) => years(e.start, e.end, Boolean(e.current), r.lang)
  const bulletsOf = (list: string[]) => list.map((x) => x.trim()).filter(Boolean)
  const toolIcon = (name: string) => (toolGroup ? resolveIcon(name, toolGroup.icons?.[name], 'app', toolGroup.autoIcons !== false) : undefined)

  const S = (key: string, label: string) => E(key, label)
  const tabOf: Record<string, string> = {
    experience: 'tab:experience',
    education: 'tab:education',
    skills: 'tab:skills',
    languages: 'tab:extras',
    interests: 'tab:extras',
    certifications: 'tab:extras',
    projects: 'tab:extras',
    summary: 'field:summary',
    gallery: 'tab:gallery'
  }
  const sec = (k: SectionKey) => S(tabOf[k], `Modifier : ${t[k]}`)

  let body: ReactNode = null

  switch (r.templateId) {
    // ======================================================================
    case 'arche': {
      body = (
        <>
          <div className="rp-arch" aria-hidden />
          <aside className="rp-side">
            {photo('rp-arche-photo')}
            <ul className="rp-arche-contact" {...E('tab:identity', 'Modifier les coordonnées')}>
              {contacts.slice(0, 4).map(([k, v]) => (
                <li key={k + v}>
                  <i className="rp-ico">{CONTACT_ICON[k](22)}</i>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
            {langs.length > 0 && (
              <section {...sec('languages')}>
                <h3 className="rp-arche-sh">{t.languages}</h3>
                {langs.map((l) => (
                  <p key={l.id}>{[l.name, l.level && /courant|natif|maternelle|bilingue|fluent/i.test(l.level) ? l.level : ''].filter(Boolean).join(' ')}</p>
                ))}
              </section>
            )}
            {interests.length > 0 && (
              <section {...sec('interests')}>
                <h3 className="rp-arche-sh">{t.interests}</h3>
                {interests.map((x) => (
                  <p key={x}>{x}</p>
                ))}
              </section>
            )}
          </aside>
          <main className="rp-main">
            <header className="rp-arche-head" {...E('tab:identity', 'Modifier l’identité')}>
              <h1 style={fit(98, 400, 0.52, b.firstName, b.lastName)}>
                <span>
                  {b.firstName}
                  <Spark className="rp-spark s1" />
                </span>
                <span>
                  {b.lastName}
                  <Spark className="rp-spark s2" />
                </span>
              </h1>
              <p className="rp-arche-role">{headline}</p>
            </header>
            <div className="rp-arche-line" aria-hidden />
            {summary && (
              <section className="rp-arche-sec" {...sec('summary')}>
                <h2>
                  <Spark className="rp-star" />
                  {t.summary}
                </h2>
                <p>{summary}</p>
              </section>
            )}
            {exps.length > 0 && (
              <section className="rp-arche-sec" {...sec('experience')}>
                <h2>
                  <Spark className="rp-star" />
                  {t.experience}
                </h2>
                {exps.map((e) => (
                  <div className="rp-arche-item" key={e.id}>
                    <strong>
                      {e.company || e.role} {when(e)}
                    </strong>
                    <em>{e.company ? e.role : e.location}</em>
                    <ul>
                      {bulletsOf(e.bullets).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}
            {edus.length > 0 && (
              <section className="rp-arche-sec" {...sec('education')}>
                <h2>
                  <Spark className="rp-star" />
                  {t.education}
                </h2>
                {edus.map((e) => (
                  <div className="rp-arche-item" key={e.id}>
                    <strong>
                      {e.school} {when(e)}
                    </strong>
                    <em>{e.degree}</em>
                    {e.details.trim() && <em>{e.details.trim()}</em>}
                  </div>
                ))}
              </section>
            )}
            {skills.length > 0 && (
              <section className="rp-arche-sec" {...sec('skills')}>
                <h2>
                  <Spark className="rp-star" />
                  {t.skills}
                </h2>
                <div className="rp-arche-pills">
                  {leveled.slice(0, 10).map((s, i) => (
                    <span key={s.name + i} className={i % 4 === 0 || i % 4 === 3 ? 'warm' : 'cool'}>
                      {s.name}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </main>
        </>
      )
      break
    }

    // ======================================================================
    case 'chevron': {
      const sideEdu = edus
      body = (
        <>
          <header className="rp-chev-head" {...E('tab:identity', 'Modifier l’identité')}>
            <div className="rp-chev-photo">{photo('')}</div>
            <div>
              <h1 style={fitLine(40, 440, 0.55, fullName)}>{fullName}</h1>
              <p>{headline}</p>
            </div>
          </header>
          <div className="rp-chev-body">
            <aside className="rp-side">
              <div className="rp-chev-notch" aria-hidden />
              <section>
                <h3>{L.info}</h3>
                {contactList('rp-chev-contact', 13, 4)}
              </section>
              {sideEdu.length > 0 && (
                <section {...sec('education')}>
                  <h3>{t.education}</h3>
                  <div className="rp-chev-tl">
                    {sideEdu.map((e) => (
                      <div key={e.id}>
                        <strong>{e.degree}</strong>
                        <span>{e.school}</span>
                        <span>{when(e)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {skills.length > 0 && (
                <section {...sec('skills')}>
                  <h3>{t.skills}</h3>
                  {leveled.slice(0, 9).map((s, i) => (
                    <p className="rp-chev-skill" key={s.name + i}>
                      {s.name}
                      {s.word ? ` - ${s.word}` : ''}
                    </p>
                  ))}
                </section>
              )}
              {langs.length > 0 && (
                <section {...sec('languages')}>
                  <h3>{t.languages}</h3>
                  {langs.map((l) => (
                    <p className="rp-chev-skill" key={l.id}>
                      {l.name}
                      {l.level ? ` - ${l.level}` : ''}
                    </p>
                  ))}
                </section>
              )}
            </aside>
            <main className="rp-main">
              {summary && (
                <section {...sec('summary')}>
                  <h2>{t.summary}</h2>
                  <p>{summary}</p>
                </section>
              )}
              {exps.length > 0 && (
                <section {...sec('experience')}>
                  <h2>{t.experience}</h2>
                  {exps.map((e) => (
                    <div className="rp-chev-item" key={e.id}>
                      <strong>{[e.role, e.company].filter(Boolean).join(', ')}</strong>
                      <span className="rp-when">{when(e)}</span>
                      <ul>
                        {bulletsOf(e.bullets).map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}
              {projects.length > 0 && (
                <section {...sec('projects')}>
                  <h2>{t.projects}</h2>
                  {projects.map((p) => (
                    <div className="rp-chev-item" key={p.id}>
                      <strong>{p.name}</strong>
                      {p.link && <span className="rp-when">{stripProtocol(p.link)}</span>}
                      <p>{p.description}</p>
                    </div>
                  ))}
                </section>
              )}
              {certs.length > 0 && (
                <section {...sec('certifications')}>
                  <h2>{t.certifications}</h2>
                  {certs.map((c) => (
                    <p key={c.id}>
                      <strong>{c.name}</strong>
                      {[c.issuer, c.date.slice(0, 4)].filter(Boolean).length ? `, ${[c.issuer, c.date.slice(0, 4)].filter(Boolean).join(', ')}` : ''}
                    </p>
                  ))}
                </section>
              )}
              {interests.length > 0 && (
                <section {...sec('interests')}>
                  <h2>{t.interests}</h2>
                  <p>{interests.join(', ')}</p>
                </section>
              )}
            </main>
          </div>
        </>
      )
      break
    }

    // ======================================================================
    case 'petale': {
      body = (
        <>
          <svg className="rp-petal-bg" viewBox="0 0 794 1123" preserveAspectRatio="none" aria-hidden>
            <path className="soft" d="M0 58 C 92 44, 210 70, 296 24 C 330 8, 362 0, 420 0 L 420 0 C 404 92, 336 150, 330 252 C 324 350, 352 468, 302 560 C 252 650, 120 662, 40 612 C 18 598, 0 584, 0 574 Z" />
            <path className="deep" d="M410 0 C 366 74, 342 172, 392 252 C 452 348, 616 392, 794 330 L 794 0 Z" />
          </svg>
          {/* Forme du bas : ancrée au bas de la page, même quand le CV est réduit pour tenir sur une page. */}
          <svg className="rp-petal-bg bottom" viewBox="0 830 794 293" preserveAspectRatio="none" aria-hidden>
            <path className="soft" d="M0 900 C 42 858, 124 830, 204 838 C 282 846, 298 924, 298 1000 C 298 1058, 304 1098, 310 1123 L 0 1123 Z" />
          </svg>
          <aside className="rp-side">
            {photo('rp-petal-photo')}
            {summary && (
              <section className="rp-petal-profile" {...sec('summary')}>
                <h2>{t.summary}</h2>
                <p>{summary}</p>
              </section>
            )}
            {skills.length > 0 && (
              <section className="rp-petal-skills" {...sec('skills')}>
                <h2>{t.skills}</h2>
                <ol>
                  {leveled.slice(0, 7).map((s, i) => (
                    <li key={s.name + i}>{s.name}</li>
                  ))}
                </ol>
              </section>
            )}
            <section className="rp-petal-coords">
              <h2>{L.coords}</h2>
              <div {...E('tab:identity', 'Modifier les coordonnées')}>
                {contacts.slice(0, 4).map(([k, v]) => (
                  <p key={k + v}>{v}</p>
                ))}
              </div>
            </section>
          </aside>
          <main className="rp-main">
            <header className="rp-petal-head" {...E('tab:identity', 'Modifier l’identité')}>
              <h1 style={fit(33, 290, 0.74, b.firstName, b.lastName)}>
                <span>{b.firstName}</span>
                <span>{b.lastName}</span>
              </h1>
              <p>{headline}</p>
            </header>
            {exps.length > 0 && (
              <section {...sec('experience')}>
                <h2>{t.experience}</h2>
                {exps.map((e) => (
                  <div className="rp-petal-item" key={e.id}>
                    <p>
                      <strong>{e.role}</strong>
                      {e.company ? ` – ${e.company}` : ''}
                    </p>
                    <p className="rp-muted">{[e.location, when(e)].filter(Boolean).join(' / ')}</p>
                    <ol>
                      {bulletsOf(e.bullets).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </section>
            )}
            {edus.length > 0 && (
              <section {...sec('education')}>
                <h2>{t.education}</h2>
                {edus.map((e) => (
                  <p className="rp-petal-line" key={e.id}>
                    <strong>{e.degree}</strong>
                    {[e.school, e.location, when(e)].filter(Boolean).length ? ` – ${[e.school, e.location, when(e)].filter(Boolean).join(' - ')}` : ''}
                  </p>
                ))}
              </section>
            )}
            {langs.length > 0 && (
              <section {...sec('languages')}>
                <h2>{t.languages}</h2>
                {langs.map((l) => (
                  <p className="rp-petal-line" key={l.id}>
                    {l.name}
                    {l.level ? ` : ${l.level}` : ''}
                  </p>
                ))}
              </section>
            )}
            {interests.length > 0 && (
              <section {...sec('interests')}>
                <h2>{t.interests}</h2>
                <p className="rp-petal-line">{interests.join(', ')}</p>
              </section>
            )}
          </main>
        </>
      )
      break
    }

    // ======================================================================
    case 'monochrome': {
      const site = contacts.find(([k]) => k === 'website' || k === 'linkedin' || k === 'link')?.[1] ?? b.email
      body = (
        <div className="rp-mono-frame">
          <div className="rp-mono-top">
            <span>( {L.resume.toUpperCase()} )</span>
            <i aria-hidden />
            <span>{shortHead.toUpperCase()}</span>
          </div>
          <div className="rp-mono-grid">
            <div className="rp-mono-photo">{photo('')}</div>
            <div className="rp-mono-name" {...E('tab:identity', 'Modifier l’identité')}>
              <span className="rp-mono-block b1" aria-hidden />
              <span className="rp-mono-block b2" aria-hidden />
              <span className="rp-mono-block b3" aria-hidden />
              <h1 style={fit(128, 318, 0.46, b.firstName)}>{b.firstName}</h1>
              <p className="rp-mono-script" style={fit(84, 330, 0.42, b.lastName)}>{b.lastName}</p>
              {summary && (
                <section {...sec('summary')}>
                  <h2>{t.summary}</h2>
                  <p className="rp-just">{summary}</p>
                </section>
              )}
            </div>
            <div className="rp-mono-left">
              {edus.length > 0 && (
                <section {...sec('education')}>
                  <h2>
                    {t.education}
                    <span className="rp-mono-bar small" aria-hidden />
                  </h2>
                  {edus.map((e) => (
                    <div className="rp-mono-item" key={e.id}>
                      <p className="up">{e.school}</p>
                      <p className="dot up">{e.degree}</p>
                      <p className="paren">( {when(e)} )</p>
                      {e.details.trim() && (
                        <>
                          <span className="rp-mono-arrow" aria-hidden />
                          <p className="rp-just">{e.details.trim()}</p>
                        </>
                      )}
                    </div>
                  ))}
                </section>
              )}
              {skills.length > 0 && (
                <section {...sec('skills')}>
                  <h2>
                    {t.skills}
                    <span className="rp-mono-bar" aria-hidden />
                  </h2>
                  <div className="rp-mono-pills">
                    {leveled.slice(0, 8).map((s, i) => (
                      <span key={s.name + i} className={i % 4 === 0 || i % 4 === 3 ? 'on' : ''}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <div className="rp-mono-right">
              {exps.length > 0 && (
                <section {...sec('experience')}>
                  <h2>
                    {t.experience}
                    <span className="rp-mono-bar" aria-hidden />
                  </h2>
                  {exps.map((e, i) => (
                    <div className="rp-mono-item" key={e.id}>
                      {i > 0 && <hr />}
                      <p className="up big">{e.role}</p>
                      <p className="dot up">{[e.company, e.location].filter(Boolean).join(' / ')}</p>
                      <p className="paren">( {when(e).toUpperCase()} )</p>
                      <p className="rp-just">{bulletsOf(e.bullets).join(' ')}</p>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>
          <footer className="rp-mono-foot" {...E('tab:identity', 'Modifier les coordonnées')}>
            <div>
              <b>( {L.website.toUpperCase()} )</b>
              <span>{site}</span>
            </div>
            <div>
              <b>( {L.phone.toUpperCase()} )</b>
              <span>{b.phone}</span>
            </div>
            <div>
              <b>( {L.address.toUpperCase()} )</b>
              <span>{b.location}</span>
            </div>
          </footer>
        </div>
      )
      break
    }

    // ======================================================================
    case 'grille': {
      const half = Math.ceil(otherSkills.length / 2)
      const toolHalf = Math.ceil(tools.length / 2)
      const softSkills = otherSkills.length ? otherSkills : skills
      const refs = certs.length
        ? certs.map((c) => `${c.name}${c.issuer ? `, ${c.issuer}` : ''}`)
        : langs.map((l) => `${l.name}${l.level ? ` (${l.level})` : ''}`)
      body = (
        <div className="rp-grid">
          <div className="rp-grid-top">
            <div className="rp-grid-photo">{photo('')}</div>
            <div className="rp-grid-id" {...E('tab:identity', 'Modifier l’identité')}>
              <h1 style={fit(62, 380, 0.7, b.firstName, b.lastName)}>
                <span>{b.firstName}</span>
                <span>{b.lastName}</span>
              </h1>
              <p className="role">{headline}</p>
              {contacts.slice(0, 6).map(([k, v]) => (
                <p key={k + v}>{v}</p>
              ))}
            </div>
          </div>
          {exps.map((e, i) => (
            <div className="rp-grid-row" key={e.id} {...sec('experience')}>
              <div className="rp-grid-label">
                {i === 0 && <h2>{t.experience}</h2>}
                <p>{when(e)}</p>
              </div>
              <div className="rp-grid-cell">
                <h3>{e.company || e.location}</h3>
                <h4>{e.role}</h4>
                <p>{bulletsOf(e.bullets).join(' ')}</p>
              </div>
            </div>
          ))}
          {edus.map((e, i) => (
            <div className="rp-grid-row" key={e.id} {...sec('education')}>
              <div className="rp-grid-label">
                {i === 0 && <h2>{t.education}</h2>}
                <p>{when(e)}</p>
              </div>
              <div className="rp-grid-cell">
                <h3>{e.degree}</h3>
                <h4>{e.school}</h4>
                {e.details.trim() && (
                  <ul>
                    <li>{e.details.trim()}</li>
                  </ul>
                )}
              </div>
            </div>
          ))}
          {skills.length > 0 && (
            <div className="rp-grid-row rp-grid-skills" {...sec('skills')}>
              <div className="rp-grid-cell">
                <h2>{t.skills}</h2>
                <ul>{softSkills.slice(0, half || 6).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="rp-grid-cell">
                <ul className="pad">{softSkills.slice(half || 6, 12).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="rp-grid-cell">
                <h2>{toolGroup?.name || L.software}</h2>
                <ul>{tools.slice(0, toolHalf).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="rp-grid-cell">
                <ul className="pad">{tools.slice(toolHalf, 12).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </div>
          )}
          <div className="rp-grid-row rp-grid-refs">
            <div className="rp-grid-cell" {...sec(certs.length ? 'certifications' : 'languages')}>
              <h2>{certs.length ? t.certifications : t.languages}</h2>
              <p>{refs.join(' · ')}</p>
            </div>
            <div className="rp-grid-cell" />
            <div className="rp-grid-cell" />
            <div className="rp-grid-cell" />
          </div>
        </div>
      )
      break
    }

    // ======================================================================
    case 'degrade': {
      body = (
        <>
          <aside className="rp-side">
            <div className="rp-grad-photo">{photo('')}</div>
            {edus.length > 0 && (
              <section {...sec('education')}>
                <h3 className="rp-grad-tag">{t.education}</h3>
                {edus.map((e) => (
                  <div className="rp-grad-edu" key={e.id}>
                    <strong>{e.degree}</strong>
                    <span>{e.school}</span>
                    <span>{when(e)}</span>
                  </div>
                ))}
              </section>
            )}
            <section>
              <h3 className="rp-grad-tag">{L.contact}</h3>
              <div className="rp-grad-contact" {...E('tab:identity', 'Modifier les coordonnées')}>
                {b.phone && (
                  <p>
                    <strong>{L.phone}</strong>
                    <span>{b.phone}</span>
                  </p>
                )}
                {b.email && (
                  <p>
                    <strong>Email</strong>
                    <span>{b.email}</span>
                  </p>
                )}
                {b.location && (
                  <p>
                    <strong>{L.address}</strong>
                    <span>{b.location}</span>
                  </p>
                )}
              </div>
            </section>
            <div className="rp-grad-foot">
              {(langs.length > 0 || certs.length > 0) && (
                <section {...sec(langs.length ? 'languages' : 'certifications')}>
                  <h3 className="rp-grad-tag">{langs.length ? t.languages : t.certifications}</h3>
                  {langs.length
                    ? langs.map((l) => (
                        <p key={l.id}>
                          <strong>{l.name}</strong>
                          <span>{l.level}</span>
                        </p>
                      ))
                    : certs.map((c) => (
                        <p key={c.id}>
                          <strong>{c.name}</strong>
                          <span>{c.issuer}</span>
                        </p>
                      ))}
                </section>
              )}
            </div>
          </aside>
          <main className="rp-main">
            <div className="rp-grad-ring" aria-hidden />
            <header className="rp-grad-head" {...E('tab:identity', 'Modifier l’identité')}>
              <h1 style={fit(42, 330, 0.76, b.firstName, b.lastName + '.')}>
                <span>{b.firstName}</span>
                <span>
                  {b.lastName}
                  <i>.</i>
                </span>
              </h1>
              <p>{headline}</p>
              {summary && (
                <div {...sec('summary')}>
                  <h4>
                    {L.about}
                    <span aria-hidden />
                  </h4>
                  <p className="rp-grad-sum">{summary}</p>
                </div>
              )}
            </header>
            <div className="rp-grad-body">
              {exps.length > 0 && (
                <section {...sec('experience')}>
                  <h3 className="rp-grad-tag">{t.experience}</h3>
                  {exps.map((e) => (
                    <div className="rp-grad-item" key={e.id}>
                      <strong>{e.role}</strong>
                      <span>{when(e)}</span>
                      <span>{e.company}</span>
                      <p>{bulletsOf(e.bullets).slice(0, 2).join(' ')}</p>
                    </div>
                  ))}
                </section>
              )}
              {skills.length > 0 && (
                <section {...sec('skills')}>
                  <h3 className="rp-grad-tag">{t.skills}</h3>
                  <div className="rp-grad-donuts">
                    {leveled.slice(0, 6).map((s, i) => (
                      <div key={s.name + i} className="rp-grad-donut">
                        <span>{s.name}</span>
                        <div className="ring" style={{ '--p': s.value } as CSSProperties}>
                          {s.explicit ? `${s.value}%` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </main>
        </>
      )
      break
    }

    // ======================================================================
    case 'medaillon': {
      const left = contacts.filter(([k]) => k === 'phone' || k === 'location')
      const right = contacts.filter(([k]) => k !== 'phone' && k !== 'location').slice(0, 2)
      const timeline = (list: { id: string; label: string; title: string; when: string; text: string }[]) => (
        <div className="rp-med-tl">
          {list.map((x) => (
            <div className="rp-med-row" key={x.id}>
              <span className="lab">{x.label}</span>
              <span className="dot" aria-hidden />
              <div>
                <div className="top">
                  <strong>{x.title}</strong>
                  {x.when && <span className="tag">{x.when}</span>}
                </div>
                <p>{x.text}</p>
              </div>
            </div>
          ))}
        </div>
      )
      body = (
        <>
          <header className="rp-med-head" {...E('tab:identity', 'Modifier l’identité')}>
            <h1 style={fitLine(44, 700, 0.74, fullName)}>{fullName}</h1>
            <p>{headline}</p>
          </header>
          <div className="rp-med-band">
            <ul {...E('tab:identity', 'Modifier les coordonnées')}>
              {left.map(([k, v]) => (
                <li key={k}>
                  <i className="rp-ico">{CONTACT_ICON[k](15)}</i>
                  {v}
                </li>
              ))}
            </ul>
            <div className="rp-med-photo">{photo('')}</div>
            <ul {...E('tab:identity', 'Modifier les coordonnées')}>
              {right.map(([k, v]) => (
                <li key={k}>
                  <i className="rp-ico">{CONTACT_ICON[k](15)}</i>
                  {v}
                </li>
              ))}
            </ul>
          </div>
          <div className="rp-med-cols">
            <div>
              {summary && (
                <section {...sec('summary')}>
                  <h2>
                    <User size={26} strokeWidth={2.4} />
                    {L.about}
                  </h2>
                  <p className="rp-med-text">{summary}</p>
                </section>
              )}
              {skills.length > 0 && (
                <section {...sec('skills')}>
                  <h2>
                    <BarChart3 size={26} strokeWidth={2.4} />
                    {t.skills}
                  </h2>
                  {leveled.slice(0, 7).map((s, i) => (
                    <div className="rp-med-bar" key={s.name + i}>
                      <span>{s.name}</span>
                      {s.explicit && <small>{s.value}%</small>}
                      <i style={{ '--p': `${s.value}%` } as CSSProperties} />
                    </div>
                  ))}
                </section>
              )}
              {langs.length > 0 && (
                <section {...sec('languages')}>
                  <h2>{t.languages}</h2>
                  {langs.map((l) => (
                    <div className="rp-med-bar" key={l.id}>
                      <span>{l.name}</span>
                      <small>{l.level}</small>
                      <i style={{ '--p': `${levelPercent(l.level)}%` } as CSSProperties} />
                    </div>
                  ))}
                </section>
              )}
            </div>
            <div>
              {edus.length > 0 && (
                <section {...sec('education')}>
                  <h2>
                    <GraduationCap size={28} strokeWidth={2.2} />
                    {t.education}
                  </h2>
                  {timeline(edus.map((e) => ({ id: e.id, label: e.degree.split(/[,(]/)[0], title: e.school, when: when(e), text: e.details || e.location })))}
                </section>
              )}
              {exps.length > 0 && (
                <section {...sec('experience')}>
                  <h2>
                    <Wrench size={26} strokeWidth={2.4} />
                    {t.experience}
                  </h2>
                  {timeline(exps.map((e) => ({ id: e.id, label: e.role, title: e.company || e.role, when: when(e), text: bulletsOf(e.bullets).slice(0, 2).join(' ') })))}
                </section>
              )}
            </div>
          </div>
        </>
      )
      break
    }

    // ======================================================================
    case 'dune': {
      body = (
        <>
          <div className="rp-dune-arch" aria-hidden />
          <div className="rp-dune-photo">
            <span className="ring" aria-hidden />
            {photo('')}
          </div>
          <div className="rp-dune-left">
            <header {...E('tab:identity', 'Modifier l’identité')}>
              <h1 style={fit(72, 330, 0.68, b.firstName, b.lastName)}>
                <span>{b.firstName}</span>
                <span>{b.lastName}</span>
              </h1>
              <p>{headline}</p>
            </header>
            {contactList('rp-dune-contact', 13, 3)}
            {edus.length > 0 && (
              <section {...sec('education')}>
                <h2 className="rp-dune-pill">{t.education}</h2>
                {edus.map((e) => (
                  <div className="rp-dune-edu" key={e.id}>
                    <strong>{e.end.slice(0, 4) || e.start.slice(0, 4)}</strong>
                    <strong>{e.school}</strong>
                    <p>{[e.degree, e.details].filter((x) => x.trim()).join(', ')}</p>
                  </div>
                ))}
              </section>
            )}
            {skills.length > 0 && (
              <section {...sec('skills')}>
                <h2 className="rp-dune-pill">{t.skills}</h2>
                {leveled.slice(0, 6).map((s, i) => (
                  <div className="rp-dune-bar" key={s.name + i}>
                    <span>{s.name}</span>
                    <i style={{ '--p': `${s.value}%` } as CSSProperties} />
                  </div>
                ))}
              </section>
            )}
            {langs.length > 0 && (
              <section {...sec('languages')}>
                <h2 className="rp-dune-pill">{t.languages}</h2>
                {langs.map((l) => (
                  <p className="rp-dune-lang" key={l.id}>
                    {l.name}
                  </p>
                ))}
              </section>
            )}
          </div>
          <div className="rp-dune-right">
            <span className="rp-dune-line" aria-hidden />
            {summary && (
              <div className="rp-dune-dot" {...sec('summary')}>
                <p>{summary}</p>
              </div>
            )}
            {exps.length > 0 && (
              <section {...sec('experience')}>
                <h2 className="rp-dune-pill">{t.experience}</h2>
                {exps.map((e) => (
                  <div className="rp-dune-dot" key={e.id}>
                    <strong>{when(e)}</strong>
                    <strong>{[e.company, e.role].filter(Boolean).join(', ')}</strong>
                    <p>{bulletsOf(e.bullets).join(' ')}</p>
                  </div>
                ))}
              </section>
            )}
          </div>
          <div className="rp-dune-foot" aria-hidden />
        </>
      )
      break
    }

    // ======================================================================
    case 'angles': {
      body = (
        <>
          <svg className="rp-ang-bg" viewBox="0 0 794 1123" preserveAspectRatio="none" aria-hidden>
            <polygon className="grey" points="0,250 400,368 400,1123 0,1123" />
            <polygon className="beige" points="452,0 794,0 794,356 399,172" />
            <polygon className="deep" points="0,0 506,0 0,266" />
            <polygon className="beige" points="0,930 400,1066 400,1123 0,1123" />
            <polygon className="deep" points="0,1000 260,1123 0,1123" />
            <polygon className="deep" points="400,1123 794,1012 794,1123" />
          </svg>
          <div className="rp-ang-photo">{photo('')}</div>
          <header className="rp-ang-head" {...E('tab:identity', 'Modifier l’identité')}>
            <h1 style={fit(46, 320, 0.8, b.firstName, b.lastName)}>
              <span>{b.firstName}</span>
              <span>{b.lastName}</span>
            </h1>
            <p className="role">{headline}</p>
            {summary && (
              <p className="sum" {...sec('summary')}>
                {summary}
              </p>
            )}
          </header>
          <div className="rp-ang-cols">
            <div>
              {edus.length > 0 && (
                <section {...sec('education')}>
                  <h2>{t.education}</h2>
                  {edus.map((e) => (
                    <div className="rp-ang-edu" key={e.id}>
                      <strong>{when(e)} :</strong>
                      <strong>{e.school}</strong>
                      <strong>{e.degree}</strong>
                    </div>
                  ))}
                </section>
              )}
              {certs.length > 0 && (
                <section {...sec('certifications')}>
                  <h2>{t.certifications}</h2>
                  {certs.map((c) => (
                    <p key={c.id}>
                      {c.date.slice(0, 4) ? `${c.date.slice(0, 4)} : ` : ''}
                      {c.name}
                      {c.issuer ? `, ${c.issuer}` : ''}
                    </p>
                  ))}
                </section>
              )}
              {skills.length > 0 && (
                <section {...sec('skills')}>
                  <h2>{t.skills}</h2>
                  {leveled.slice(0, 5).map((s, i) => (
                    <div className="rp-ang-bar" key={s.name + i}>
                      <span>{s.name}</span>
                      <div>
                        <i style={{ '--p': `${s.value}%` } as CSSProperties} />
                        {s.explicit && <small>{s.value}%</small>}
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </div>
            <div>
              {exps.length > 0 && (
                <section {...sec('experience')}>
                  <h2>{t.experience}</h2>
                  {exps.map((e) => (
                    <div className="rp-ang-item" key={e.id}>
                      <strong>{when(e)}</strong>
                      <strong>{e.company}</strong>
                      <h3>{e.role}</h3>
                      <ul>
                        {bulletsOf(e.bullets).map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}
              <section>
                <h2>{L.contact}</h2>
                {contactList('rp-ang-contact', 13, 4)}
              </section>
            </div>
          </div>
        </>
      )
      break
    }

    // ======================================================================
    case 'nocturne': {
      const rows = (list: { id: string; a: string; b: string; c: string; text: string }[]) =>
        list.map((x) => (
          <div className="rp-noc-row" key={x.id}>
            <div>
              <p className="up">{x.a}</p>
              <p className="b">{x.b}</p>
              <p className="up">{x.c}</p>
            </div>
            <p>{x.text}</p>
          </div>
        ))
      body = (
        <>
          <aside className="rp-side">
            <header {...E('tab:identity', 'Modifier l’identité')}>
              <h1 style={fit(34, 210, 0.62, b.firstName, b.lastName)}>
                <span>{b.firstName}</span>
                <span>{b.lastName}</span>
              </h1>
              <p>{headline}</p>
              <div className="rp-noc-social">
                {b.linkedin && <LinkedinIcon size={12} />}
                {b.github && <GithubIcon size={12} />}
                {b.website && <Globe size={12} />}
              </div>
            </header>
            <div className="rp-noc-photo">{photo('')}</div>
            <section>
              <h3>{L.contact}</h3>
              {contactList('rp-noc-contact', 12, 4)}
            </section>
            {interests.length > 0 && (
              <section {...sec('interests')}>
                <h3>{t.interests}</h3>
                <div className="rp-noc-int">
                  {interests.slice(0, 6).map((x) => {
                    const I = interestIcon(x)
                    return (
                      <span key={x} title={x}>
                        <I size={22} strokeWidth={1.5} />
                        <small>{x}</small>
                      </span>
                    )
                  })}
                </div>
              </section>
            )}
          </aside>
          <main className="rp-main">
            {summary && (
              <section {...sec('summary')}>
                <h2>{t.summary}</h2>
                <p className="rp-noc-text">{summary}</p>
              </section>
            )}
            {edus.length > 0 && (
              <section {...sec('education')}>
                <h2>{t.education}</h2>
                {rows(edus.map((e) => ({ id: e.id, a: e.school, b: when(e), c: e.degree, text: e.details || e.location })))}
              </section>
            )}
            {skills.length > 0 && (
              <section {...sec('skills')}>
                <h2>{t.skills}</h2>
                <div className="rp-noc-skills">
                  {leveled.slice(0, 6).map((s, i) => (
                    <div key={s.name + i}>
                      <p>
                        <b>{mono(s.name)}</b>
                        <span>{s.name}</span>
                      </p>
                      <div className="seg">
                        {[0, 1, 2, 3, 4].map((k) => (
                          <i key={k} className={k < Math.round(s.value / 20) ? 'on' : ''} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {exps.length > 0 && (
              <section {...sec('experience')}>
                <h2>{t.experience}</h2>
                {rows(exps.map((e) => ({ id: e.id, a: e.role, b: when(e), c: e.company, text: bulletsOf(e.bullets).join(' ') })))}
              </section>
            )}
          </main>
        </>
      )
      break
    }

    // ======================================================================
    case 'pastel': {
      body = (
        <>
          <div className="rp-pastel-bg" aria-hidden />
          <aside className="rp-side">
            <div className="rp-pastel-photo">{photo('')}</div>
            <header {...E('tab:identity', 'Modifier l’identité')}>
              <h1 style={fit(30, 222, 0.66, b.firstName, b.lastName)}>{fullName}</h1>
              <p>{headline}</p>
            </header>
            {contactList('rp-pastel-contact', 11, 3)}
            {summary && (
              <p className="rp-pastel-sum" {...sec('summary')}>
                {summary}
              </p>
            )}
            {skills.length > 0 && (
              <section {...sec('skills')}>
                <h2>{t.skills}</h2>
                <ul>
                  {leveled.slice(0, 6).map((s, i) => (
                    <li key={s.name + i}>{s.name}</li>
                  ))}
                </ul>
              </section>
            )}
            {langs.length > 0 && (
              <section {...sec('languages')}>
                <h2>{t.languages}</h2>
                {langs.map((l) => (
                  <div className="rp-pastel-lang" key={l.id}>
                    <div>
                      <strong>{l.name}</strong>
                      <small>{l.level}</small>
                    </div>
                    <i style={{ '--p': `${levelPercent(l.level)}%` } as CSSProperties} />
                  </div>
                ))}
              </section>
            )}
          </aside>
          <main className="rp-main">
            {exps.length > 0 && (
              <section {...sec('experience')}>
                <h2>{t.experience}</h2>
                {exps.map((e) => (
                  <div className="rp-pastel-row" key={e.id}>
                    <b>{e.start.slice(0, 4) || when(e)}</b>
                    <div>
                      <strong>{[e.role, e.company].filter(Boolean).join(' / ')}</strong>
                      <ul>
                        {bulletsOf(e.bullets).map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </section>
            )}
            {edus.length > 0 && (
              <section {...sec('education')}>
                <h2>{t.education}</h2>
                {edus.map((e) => (
                  <div className="rp-pastel-row" key={e.id}>
                    <b>{e.end.slice(0, 4) || e.start.slice(0, 4)}</b>
                    <div>
                      <strong>{[e.degree, e.school].filter(Boolean).join(' / ')}</strong>
                      {(e.details || e.location) && <p>{e.details || e.location}</p>}
                    </div>
                  </div>
                ))}
              </section>
            )}
            {certs.length > 0 && (
              <section {...sec('certifications')}>
                <h2>{t.certifications}</h2>
                {certs.map((c) => (
                  <div className="rp-pastel-row" key={c.id}>
                    <b>{c.date.slice(0, 4)}</b>
                    <div>
                      <strong>{[c.name, c.issuer].filter(Boolean).join(' / ')}</strong>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </main>
        </>
      )
      break
    }

    // ======================================================================
    case 'cartel': {
      const skillRows = leveled.slice(0, 12)
      const half = Math.ceil(skillRows.length / 2)
      body = (
        <>
          <header className="rp-cartel-head">
            <h1 style={fit(76, 430, 0.5, b.firstName, b.lastName)} {...E('tab:identity', 'Modifier l’identité')}>
              <span>{b.firstName}</span>
              <span>{b.lastName}</span>
            </h1>
            <div className="rp-cartel-contact" {...E('tab:identity', 'Modifier les coordonnées')}>
              <h3>{L.contact}</h3>
              {contacts.slice(0, 4).map(([k, v]) => (
                <p key={k + v}>
                  <b>{k === 'phone' ? 'T.' : k === 'email' ? 'E.' : k === 'location' ? 'A.' : 'W.'}</b> {v}
                </p>
              ))}
              <div className="soc">
                {b.linkedin && <LinkedinIcon size={11} />}
                {b.github && <GithubIcon size={11} />}
              </div>
            </div>
          </header>
          {exps.length > 0 && (
            <div className="rp-cartel-band grey" {...sec('experience')}>
              <span className="rp-cartel-label">{t.experience}</span>
              <div className="rp-cartel-exp">
                {exps.slice(0, 3).map((e) => (
                  <div key={e.id}>
                    <b className="big">{span(e.start, e.end, e.current)}</b>
                    <div>
                      <strong>{e.company}</strong>
                      <strong>{e.role}</strong>
                      <small>{when(e)}</small>
                      <p>{bulletsOf(e.bullets).slice(0, 1).join(' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rp-cartel-photo">{photo('')}</div>
            </div>
          )}
          {edus.length > 0 && (
            <div className="rp-cartel-band" {...sec('education')}>
              <span className="rp-cartel-label">{t.education}</span>
              <div className="rp-cartel-edu">
                {edus.slice(0, 2).map((e) => (
                  <div key={e.id}>
                    <strong>{e.degree}</strong>
                    <small>
                      {e.school}
                      {e.location ? `, ${e.location}` : ''} · {when(e)}
                    </small>
                    {e.details.trim() && <p>{e.details.trim()}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {skills.length > 0 && (
            <div className="rp-cartel-band grey" {...sec('skills')}>
              <span className="rp-cartel-label">{t.skills}</span>
              <div className="rp-cartel-skills">
                {[skillRows.slice(0, half), skillRows.slice(half)].map((col, c) => (
                  <div key={c}>
                    {col.map((s, i) => (
                      <p key={s.name + i}>
                        <span>{s.name}</span>
                        <b>
                          {[0, 1, 2, 3, 4].map((k) => (
                            <i key={k} className={k < Math.round(s.value / 20) ? 'on' : ''} />
                          ))}
                        </b>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(summary || langs.length > 0) && (
            <div className="rp-cartel-band" {...sec('summary')}>
              <span className="rp-cartel-label">{summary ? t.summary : t.languages}</span>
              <div className="rp-cartel-more">
                {summary && <p>{summary}</p>}
                {langs.length > 0 && <p className="langs">{langs.map((l) => `${l.name}${l.level ? ` (${l.level})` : ''}`).join(' · ')}</p>}
              </div>
            </div>
          )}
        </>
      )
      break
    }

    // ======================================================================
    case 'collage': {
      const ribbons = [...edus.map((e) => ({ id: e.id, top: e.degree, bottom: [e.school, when(e)].filter(Boolean).join(' · ') })), ...certs.map((c) => ({ id: c.id, top: c.name, bottom: [c.issuer, c.date.slice(0, 4)].filter(Boolean).join(' · ') })), ...interests.map((x) => ({ id: `i-${x}`, top: x, bottom: '' }))].slice(0, 5)
      const words = exps.map((e) => (e.role.split(/[,(·]/)[0].trim().split(/\s+/).slice(0, 2).join(' ') || e.company).slice(0, 18))
      body = (
        <>
          <div className="rp-col-sheen" aria-hidden />
          <div className="rp-col-card" {...E('tab:identity', 'Modifier l’identité')}>
            <span className="rp-tape t1" aria-hidden />
            <span className="rp-tape t2" aria-hidden />
            <div className="rp-col-photo">{photo('')}</div>
            <div className="rp-col-id">
              <h1 style={fit(22, 210, 0.5, b.firstName, b.lastName)}>{fullName}</h1>
              <p className="role">{b.headline.split(/\s+[·|&]\s+|,\s*/).slice(0, 3).join(' · ')}</p>
              <span className="rp-col-badge">{exps.length > 2 ? 'senior' : 'junior'}</span>
              <div className="rp-col-box">
                {contacts.slice(0, 3).map(([k, v]) => (
                  <p key={k + v}>{v}</p>
                ))}
              </div>
              <div className="rp-col-soc">
                {contacts.slice(3, 8).map(([k, v]) => (
                  <i key={k + v}>{CONTACT_ICON[k](12)}</i>
                ))}
              </div>
            </div>
          </div>
          <div className="rp-col-skills" {...sec('skills')}>
            <h2>{t.skills}</h2>
            <div className="tiles">
              {tools.slice(0, 6).map((s) => {
                const icon = toolIcon(s)
                return <span key={s}>{icon ? <img src={icon} alt="" /> : mono(s)}</span>
              })}
            </div>
            <Barcode seed={fullName} className="rp-col-barcode" />
            <small>{String(Math.abs([...fullName].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))).slice(0, 9)} - 5569</small>
          </div>
          <Smiley className="rp-col-smiley" />
          {ribbons.length > 0 && (
            <div className="rp-col-ribbons" {...sec('education')}>
              <span className="rp-col-arch" aria-hidden />
              <span className="rp-col-formtag">{t.education}</span>
              {ribbons.map((x, i) => (
                <div className={`ribbon r${i}`} key={x.id}>
                  <b style={fitLine(22, 540, 0.5, x.top)}>{x.top}</b>
                  <span>{x.bottom}</span>
                </div>
              ))}
            </div>
          )}
          <div className="rp-col-paper" {...sec('experience')}>
            <h2 className="rp-col-hand">{t.experience}</h2>
            {exps.slice(0, 4).map((e, i) => (
              <div className={`rp-col-entry ${i % 2 ? 'alt' : ''}`} key={e.id}>
                <span className="date">{when(e)}</span>
                <strong>{e.company || e.role}</strong>
                <p>{bulletsOf(e.bullets).join(' ')}</p>
                <span className="rp-col-word">{words[i]}</span>
              </div>
            ))}
            {gallery[0] && <img className="rp-col-pic" src={gallery[0].image} alt="" {...E(`gallery:${gallery[0].id}`, 'Changer cette image')} />}
            <span className="rp-col-star" aria-hidden>
              ✦
            </span>
          </div>
        </>
      )
      break
    }

    // ======================================================================
    case 'sachet': {
      const rowsInfo = (
        [
          [t.languages, langs[0] ? `${langs[0].name}` : ''],
          [r.lang === 'en' ? 'City' : 'Ville', b.location],
          [r.lang === 'en' ? 'Mobility' : 'Mobilité', b.mobility ?? '']
        ] as [string, string][]
      ).filter(([, v]) => v)
      body = (
        <>
          <div className="rp-bag">
            <div className="rp-bag-zip" aria-hidden>
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i}>
                  {b.firstName} {b.lastName}
                  <em>♲ 04</em>
                </span>
              ))}
            </div>
            <div className="rp-bag-card" {...E('tab:identity', 'Modifier l’identité')}>
              <Smiley className="rp-bag-hi" outline />
              <div className="rp-bag-photo">{photo('')}</div>
              <div className="rp-bag-id">
                <h1 style={fit(44, 175, 0.62, b.firstName)}>
                  {b.firstName}
                  <sup>®</sup>
                </h1>
                <span className="echo" aria-hidden style={fit(44, 175, 0.62, b.firstName)}>
                  {b.firstName}
                </span>
                <p className="bio">{(summary || headline).split(/(?<=[.!?])\s/)[0]}</p>
                <table>
                  <thead>
                    <tr>
                      {rowsInfo.map(([k]) => (
                        <th key={k}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {rowsInfo.map(([k, v]) => (
                        <td key={k}>{v}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <div className="rp-bag-contact">
                  {contactList('', 10, 3)}
                  <QrMark seed={b.email || fullName} className="qr" />
                </div>
              </div>
            </div>
            <div className="rp-bag-warn">
              <b>WARNING</b>
              <p>{headline}</p>
            </div>
            <div className="rp-bag-strip" aria-hidden>
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i}>{t.experience}</span>
              ))}
            </div>
            <div className="rp-bag-paper" {...sec('experience')}>
              {exps.slice(0, 3).map((e, i) => (
                <div className={`rp-bag-entry ${i % 2 ? 'flip' : ''}`} key={e.id}>
                  <span className="rp-tape" aria-hidden />
                  {gallery[i] ? <img src={gallery[i].image} alt="" /> : b.photo ? <img src={b.photo} alt="" /> : <span className="ph" />}
                  <div>
                    <span className="date">{when(e)}</span>
                    <b className="co">{e.company}</b>
                    <p className="note">{bulletsOf(e.bullets)[0]?.split(/[,.;:]/)[0]}</p>
                    <span className="marker">{e.role.split(/[,(·]/)[0]}</span>
                    <ul>
                      {bulletsOf(e.bullets).slice(1, 4).map((x, k) => (
                        <li key={k}>- {x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <div className="rp-bag-edu" {...sec('education')}>
              <h2>{t.education}</h2>
              <div className="eye">{gallery[1] ? <img src={gallery[1].image} alt="" /> : photo('')}</div>
              {edus.slice(0, 2).map((e) => (
                <div className="deg" key={e.id}>
                  <b>{e.degree}</b>
                  <span>{e.school}</span>
                  <p>
                    <span>{when(e)}</span>
                    <span>{e.location}</span>
                  </p>
                </div>
              ))}
              <Barcode seed={b.email || fullName} className="bc" bars={60} />
            </div>
            <div className="rp-bag-skills" {...sec('skills')}>
              <h3>{otherSkills.length ? groups.find((g) => g !== toolGroup)?.name : t.skills}</h3>
              <div className="icons">
                {(otherSkills.length ? otherSkills : skills).slice(0, 4).map((s) => (
                  <span key={s}>
                    <i>{mono(s)}</i>
                    <small>{s}</small>
                  </span>
                ))}
              </div>
              <h2 style={fitLine(40, 178, 0.6, t.skills)}>
                {t.skills}
                <sup>™</sup>
              </h2>
              <div className="soft">
                {tools.slice(0, 8).map((s) => (
                  <span key={s}>{mono(s)}</span>
                ))}
              </div>
              {langs.length > 0 && (
                <p className="lang">
                  <b>{t.languages} :</b>
                  {langs.map((l) => (
                    <span key={l.id}>
                      {l.name.slice(0, 3).toUpperCase()} {'}'} {l.level}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </>
      )
      break
    }

    // ======================================================================
    case 'ecran': {
      const cards = (list: { id: string; when: string; title: string; sub: string }[], cols: number) => (
        <div className="rp-scr-cards" style={{ '--cols': cols } as CSSProperties}>
          {list.map((x, i) => (
            <div key={x.id}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <b>{x.when}</b>
              <strong>{x.title}</strong>
              <em>{x.sub}</em>
            </div>
          ))}
        </div>
      )
      const short = (e: { start: string; end: string; current: boolean }) => {
        const s = e.start.slice(0, 4)
        const en = e.current ? (r.lang === 'en' ? 'now' : 'auj.') : e.end.slice(2, 4)
        return s ? (en ? `${s}-${en}` : s) : en
      }
      body = (
        <>
          <div className="rp-scr-tags">
            <span>{headline.split(/\s+/)[0]}</span>
            <span>///</span>
            <span>{headline.split(/\s+/).slice(1, 2).join(' ')}</span>
          </div>
          <header className="rp-scr-head" {...E('tab:identity', 'Modifier l’identité')}>
            <h1 style={fit(60, 370, 0.84, b.firstName, b.lastName)}>
              <span>{b.firstName}</span>
              <span>{b.lastName}</span>
            </h1>
            <span className="echo" aria-hidden style={fit(60, 370, 0.84, b.firstName, b.lastName)}>
              {b.lastName}
            </span>
            {contactList('rp-scr-contact', 13, 3)}
          </header>
          <div className="rp-scr-photo">
            {photo('')}
            <svg className="rp-scr-badge" viewBox="0 0 100 100" aria-hidden>
              <defs>
                <path id="rp-circle" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" />
              </defs>
              <text>
                <textPath href="#rp-circle">/// {headline.toUpperCase().slice(0, 30)} ///</textPath>
              </text>
            </svg>
            <i className="bar" aria-hidden />
          </div>
          <span className="rp-scr-vertical" aria-hidden style={fitLine(54, 330, 0.74, headline.split(/\s+/).slice(0, 2).join(' '))}>
            {headline.split(/\s+/).slice(0, 2).join(' ')}
          </span>
          <main className="rp-main">
            {edus.length + certs.length > 0 && (
              <section {...sec('education')}>
                <h2>
                  <i>///</i> {t.education}
                </h2>
                {cards(
                  [...edus.map((e) => ({ id: e.id, when: short({ ...e, current: false }), title: e.degree, sub: e.school })), ...certs.map((c) => ({ id: c.id, when: c.date.slice(0, 4), title: c.name, sub: c.issuer }))].slice(0, 4),
                  2
                )}
              </section>
            )}
            {exps.length > 0 && (
              <section {...sec('experience')}>
                <h2>
                  <i>///</i> {t.experience}
                </h2>
                {cards(exps.slice(0, 6).map((e) => ({ id: e.id, when: short(e), title: e.company || e.role, sub: e.role })), 3)}
              </section>
            )}
            {tools.length > 0 && (
              <section {...sec('skills')}>
                <h2>
                  <i>///</i> {toolGroup?.name || L.software}
                </h2>
                <div className="rp-scr-tools">
                  {tools.slice(0, 9).map((s, i) => (
                    <span key={s} style={{ '--c': ['#FF61F6', '#F7B500', '#31A8FF', '#FF9A00', '#9999FF', '#FF3366', '#22D3EE', '#A3E635', '#F472B6'][i % 9] } as CSSProperties}>
                      {mono(s)}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </main>
        </>
      )
      break
    }

    // ======================================================================
    case 'tribune': {
      body = (
        <div className="rp-trib">
          <div className="rp-trib-contact" {...E('tab:identity', 'Modifier les coordonnées')}>
            {contactList('', 10, 4)}
          </div>
          <header className="rp-trib-head" {...E('tab:identity', 'Modifier l’identité')}>
            <h1 style={fit(36, 400, 0.62, b.firstName, b.lastName)}>
              <span>{b.firstName}</span>
              <span className="up">{b.lastName}</span>
            </h1>
            <p>
              <span>{headline}</span>
            </p>
            <i className="rail" aria-hidden />
          </header>
          <aside className="rp-trib-side">
            <div className="rp-trib-photo">
              {photo('')}
              <i aria-hidden />
            </div>
            {summary && (
              <p className="rp-trib-sum" {...sec('summary')}>
                {summary}
              </p>
            )}
            {langs.length > 0 && (
              <section {...sec('languages')}>
                <h2>{t.languages}</h2>
                {langs.map((l) => (
                  <div className="rp-trib-lv" key={l.id}>
                    <b>{l.name}</b>
                    <i style={{ '--p': `${levelPercent(l.level)}%` } as CSSProperties} />
                    <small>{l.level}</small>
                  </div>
                ))}
              </section>
            )}
            {interests.length > 0 && (
              <section {...sec('interests')}>
                <h2>{t.interests}</h2>
                {interests.map((x) => (
                  <div className="rp-trib-lv" key={x}>
                    <b>{x}</b>
                  </div>
                ))}
              </section>
            )}
          </aside>
          <main className="rp-trib-main">
            {exps.length > 0 && (
              <section {...sec('experience')}>
                <h2>{t.experience}</h2>
                {exps.map((e) => (
                  <div className="rp-trib-item" key={e.id}>
                    <em>{e.role}</em>
                    <strong>{[e.company, e.location, when(e)].filter(Boolean).join(', ')}</strong>
                    <p>{bulletsOf(e.bullets).join(' ')}</p>
                  </div>
                ))}
              </section>
            )}
            {edus.length > 0 && (
              <section {...sec('education')}>
                <h2>{t.education}</h2>
                {edus.map((e) => (
                  <div className="rp-trib-item" key={e.id}>
                    <em>{e.degree}</em>
                    <strong>{[e.school, e.location, when(e)].filter(Boolean).join(', ')}</strong>
                    {e.details.trim() && <p>{e.details.trim()}</p>}
                  </div>
                ))}
              </section>
            )}
          </main>
          {skills.length > 0 && (
            <div className="rp-trib-skills" {...sec('skills')}>
              <h2>{t.skills}</h2>
              <div className="cols">
                {groups.slice(0, 4).map((g) => (
                  <div className="rp-trib-sk" key={g.id}>
                    <b>{g.name || t.skills}</b>
                    <i style={{ '--p': `${skillLevel(g.items[0] ?? '', 0).value}%` } as CSSProperties} />
                    <p>{g.items.join(', ')}</p>
                  </div>
                ))}
              </div>
              <i className="rail" aria-hidden />
            </div>
          )}
        </div>
      )
      break
    }
  }

  return (
    <article className={`cv cv-visual rp rp-${r.templateId}`} style={style} lang={r.lang}>
      {body}
    </article>
  )
}

