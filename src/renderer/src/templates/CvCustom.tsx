import { Fragment, useContext, type CSSProperties, type ReactNode } from 'react'
import { formatMonth, sectionTitles, formatRange, stripProtocol, visibleSections } from '../../../shared/format'
import type { DesignSpec, Resume, SectionKey } from '../../../shared/types'
import { contrast, onColor } from './color'
import { designOf } from './designCatalog'
import { T, useCanvasMarks } from './Editable'
import { EditableContext, usePlaceholders } from './previewContext'

/**
 * Moteur de design : « Sur mesure » (recréé depuis une image) et les 200 modèles du studio.
 * Mise en page entièrement pilotée par un design paramétrable (colonne, en-tête et sa forme,
 * photo, titres, polices, couleurs, décors, puces, cartes). En mode toile, chaque texte
 * s'édite sur place et sections et entrées se réorganisent.
 */

const BODY_FONTS = {
  sans: "'Inter Variable', Inter, Arial, sans-serif",
  serif: "'Source Serif 4 Variable', Georgia, serif",
  mono: "'IBM Plex Mono', 'JetBrains Mono Variable', Consolas, monospace"
}
const DISPLAY_FONTS = {
  sans: "'Inter Variable', Inter, Arial, sans-serif",
  serif: "'Crimson Pro Variable', Georgia, serif",
  mono: "'JetBrains Mono Variable', Consolas, monospace",
  wide: "'Archivo Variable', 'Arial Black', sans-serif"
}
const NAME_SIZE = { m: 28, l: 36, xl: 48 }

const mix = (a: string, b: string) => `color-mix(in srgb, ${a}, ${b})`

function initials(text: string) {
  const w = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  return ((w[0]?.[0] ?? '') + (w[1]?.[0] ?? '')).toUpperCase()
}

/** Couleur lisible sur un fond : la couleur souhaitée si le contraste suffit, sinon noir ou blanc. */
const readable = (wanted: string, bg: string, min = 3) => (contrast(wanted, bg) >= min ? wanted : onColor(bg))

// ---------- Décors (motifs de fond, calculés aux couleurs du modèle) ----------

const svg = (body: string, w: number, h: number) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`

/** Motif de fond pour une zone de couleur `bg` ; `ink` est la couleur du motif. */
function decorLayer(decor: DesignSpec['decor'], ink: string, accent: string): { image: string; size?: string; position?: string; repeat?: string } | null {
  switch (decor) {
    case 'dots':
      return { image: `radial-gradient(${mix(`${ink} 22%`, 'transparent')} 1.3px, transparent 1.6px)`, size: '13px 13px' }
    case 'grid':
      return {
        image: `linear-gradient(${mix(`${ink} 10%`, 'transparent')} 1px, transparent 1px), linear-gradient(90deg, ${mix(`${ink} 10%`, 'transparent')} 1px, transparent 1px)`,
        size: '18px 18px'
      }
    case 'lines':
      return { image: `repeating-linear-gradient(0deg, ${mix(`${ink} 9%`, 'transparent')} 0 1px, transparent 1px 21px)` }
    case 'diagonal':
      return { image: `repeating-linear-gradient(135deg, ${mix(`${ink} 9%`, 'transparent')} 0 7px, transparent 7px 20px)` }
    case 'waves':
      return {
        image: svg(
          [0, 1, 2, 3].map((i) => `<path d='M0 ${30 + i * 16} C 60 ${14 + i * 16}, 120 ${46 + i * 16}, 180 ${30 + i * 16} S 300 ${14 + i * 16}, 360 ${30 + i * 16}' fill='none' stroke='${ink}' stroke-opacity='${0.16 - i * 0.03}' stroke-width='2'/>`).join(''),
          360,
          110
        ),
        size: '360px 110px',
        position: 'right bottom',
        repeat: 'no-repeat'
      }
    case 'circles':
      return {
        image: svg([28, 52, 76, 100].map((r, i) => `<circle cx='130' cy='0' r='${r}' fill='none' stroke='${ink}' stroke-opacity='${0.2 - i * 0.04}' stroke-width='1.6'/>`).join(''), 130, 110),
        size: '130px 110px',
        position: 'right top',
        repeat: 'no-repeat'
      }
    case 'blobs':
      return {
        image: svg(
          `<path d='M120 4c34 6 56 34 48 64s-46 44-78 34-44-40-30-66 26-38 60-32z' fill='${accent}' fill-opacity='0.22'/><path d='M20 92c18-10 42-6 50 10s-6 32-26 32-38-8-40-20 4-14 16-22z' fill='${ink}' fill-opacity='0.08'/>`,
          180,
          150
        ),
        size: '180px 150px',
        position: 'right top',
        repeat: 'no-repeat'
      }
    case 'confetti':
      return {
        image: svg(
          [
            [12, 14, 6, 0.18],
            [48, 8, 4, 0.12],
            [80, 30, 5, 0.2],
            [30, 44, 3, 0.14],
            [96, 6, 3, 0.1],
            [64, 52, 4, 0.16]
          ]
            .map(([x, y, s, o], i) => `<rect x='${x}' y='${y}' width='${s}' height='${s}' fill='${i % 2 ? accent : ink}' fill-opacity='${o}' transform='rotate(${i * 17} ${x} ${y})'/>`)
            .join(''),
          110,
          64
        ),
        size: '110px 64px'
      }
    default:
      return null
  }
}

const layerStyle = (l: ReturnType<typeof decorLayer>): CSSProperties | undefined =>
  l ? { backgroundImage: l.image, backgroundSize: l.size, backgroundPosition: l.position ?? '0 0', backgroundRepeat: l.repeat ?? 'repeat' } : undefined

/** Bord bas d'un en-tête en bandeau : une forme de la couleur de la page « découpe » le bandeau. */
function HeaderEdge({ shape, page }: { shape: DesignSpec['headerShape']; page: string }) {
  const d =
    shape === 'curve'
      ? 'M0 40 C 30 0, 70 0, 100 40 Z'
      : shape === 'slant'
        ? 'M0 40 L100 0 L100 40 Z'
        : shape === 'wave'
          ? 'M0 40 L0 22 C 12 4, 25 4, 37 22 S 62 40, 75 22 S 92 4, 100 18 L100 40 Z'
          : null
  if (!d) return null
  return (
    <svg className="cm-edge" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill={page} />
    </svg>
  )
}

export function CvCustom({ resume: r }: { resume: Resume }) {
  const ph = usePlaceholders()
  const editable = useContext(EditableContext)
  const { canvas, entry, sectionMark, grip, dates } = useCanvasMarks()
  const E = (edit: string, label: string) => (editable ? { 'data-edit': edit, 'data-edit-label': label } : {})
  const d = designOf(r)
  const t = sectionTitles(r)
  const b = { ...r.basics, firstName: ph.first(r.basics.firstName), lastName: ph.last(r.basics.lastName), headline: ph.headline(r.basics.headline) }
  const primary = r.accent || d.colors.primary
  const secondary = r.accent2 || d.colors.secondary
  const { page, text, sidebar } = d.colors
  const hasSide = d.layout !== 'single'
  const filledHeader = d.header === 'band' || d.header === 'card'
  const headerBg = filledHeader ? d.colors.header : page
  const headerText = filledHeader ? readable(text, headerBg, 4.5) : text
  const sideText = readable(text, sidebar, 4.5)
  const decor = d.decor ?? 'none'

  const style = {
    '--cv-accent': primary,
    '--cm-primary': primary,
    '--cm-on-primary': onColor(primary),
    '--cm-secondary': secondary,
    '--cm-page': page,
    '--cm-text': text,
    '--cm-muted': mix(`${text} 62%`, page),
    '--cm-line': mix(`${text} 14%`, page),
    '--cm-card': mix(`${primary} 7%`, page),
    '--cm-sidebar': sidebar,
    '--cm-on-sidebar': sideText,
    '--cm-side-accent': readable(primary, sidebar, 2.4),
    '--cm-header': headerBg,
    '--cm-on-header': headerText,
    '--cm-name-accent': readable(primary, headerBg, 2.2),
    '--cm-name-accent-2': readable(secondary, headerBg, 1.6),
    '--cm-mark': mix(`${secondary} 70%`, headerBg),
    '--cm-body': BODY_FONTS[d.bodyFont],
    '--cm-display': DISPLAY_FONTS[d.displayFont],
    '--cm-name-size': `${NAME_SIZE[d.nameSize]}px`,
    '--cm-side-w': `${d.sidebarWidth}%`,
    '--cm-radius': d.corners === 'rounded' ? '14px' : '2px'
  } as CSSProperties

  // Décors : sur l'en-tête rempli, sinon sur la colonne latérale, sinon dans le coin de la page.
  const headerDecor = filledHeader ? layerStyle(decorLayer(decor, headerText, secondary)) : undefined
  const sideDecor = hasSide && !filledHeader ? layerStyle(decorLayer(decor, sideText, primary)) : undefined
  const cornerDecor = !filledHeader && !hasSide ? layerStyle(decorLayer(decor, primary, secondary)) : undefined

  const sections = visibleSections(r)
  // Sur la toile, les sections vides restent visibles pour pouvoir être remplies.
  const shown = canvas ? r.sectionOrder.filter((k) => !r.hidden.includes(k) && (k !== 'gallery' || (r.gallery ?? []).length > 0)) : sections
  const sideKeys = hasSide ? shown.filter((k) => d.sidebarSections.includes(k)) : []
  const mainKeys = shown.filter((k) => !sideKeys.includes(k))
  const fullName = `${b.firstName} ${b.lastName}`.trim()

  const contactFields = (['phone', 'email', 'location', 'website', 'linkedin', 'github'] as const).filter((k) => r.basics[k] || (canvas && (k === 'email' || k === 'phone')))
  const extraContacts = [r.basics.mobility ?? '', ...(r.links ?? []).map((l) => stripProtocol(l.url))].filter(Boolean)
  const hasContacts = contactFields.length > 0 || extraContacts.length > 0

  const photo =
    d.photo === 'none' ? null : b.photo ? (
      <img className="cm-photo" src={b.photo} alt="" {...E('photo', 'Changer la photo')} />
    ) : (
      <div className="cm-photo cm-initials" {...E('photo', 'Ajouter une photo')}>
        {initials(fullName)}
      </div>
    )
  const photoInSide = hasSide && d.photoPlace === 'sidebar'

  const contactList = (cls: string) =>
    hasContacts && (
      <ul className={`cm-contact ${cls}`} {...E('tab:identity', 'Modifier les coordonnées')}>
        {contactFields.map((k) => (
          <li key={k}>
            <T p={`basics.${k}`} v={canvas ? r.basics[k] : k === 'website' || k === 'linkedin' || k === 'github' ? stripProtocol(r.basics[k]) : r.basics[k]} ph={{ phone: 'Téléphone', email: 'E-mail', location: 'Ville', website: 'Site', linkedin: 'LinkedIn', github: 'GitHub' }[k]} />
          </li>
        ))}
        {extraContacts.map((c, i) => (
          <li key={`x${i}`}>{c}</li>
        ))}
      </ul>
    )

  const TAB: Record<SectionKey, string> = {
    summary: 'field:summary',
    experience: 'tab:experience',
    skills: 'tab:skills',
    education: 'tab:education',
    projects: 'tab:extras',
    certifications: 'tab:extras',
    languages: 'tab:extras',
    interests: 'tab:extras',
    gallery: 'tab:gallery'
  }

  const bulletsOf = (list: string[]) => (canvas ? list.map((x, i) => [x, i] as const) : list.map((x, i) => [x.trim(), i] as const).filter(([x]) => x))

  const content = (k: SectionKey, inSide: boolean): ReactNode => {
    switch (k) {
      case 'summary':
        return (
          <p className="cm-text">
            <T p="basics.summary" v={canvas ? r.basics.summary : b.summary.trim()} ph="Votre profil en 3 à 4 phrases : métier, années d’expérience, spécialités, objectif." multi />
          </p>
        )
      case 'experience':
        return (
          <div className={d.timeline ? 'cm-timeline' : 'cm-entries'}>
            {r.experiences.map((e, i) => (
              <div className="cm-entry" key={e.id} {...entry(`experiences.${i}`)}>
                {grip(`experiences.${i}`)}
                <div className="cm-row">
                  <h3>
                    <T p={`experiences.${i}.role`} v={e.role} ph="Intitulé du poste" />
                  </h3>
                  <span className="cm-date" {...dates(`experiences.${i}`)}>
                    {formatRange(e.start, e.end, e.current, r.lang) || (canvas ? 'Dates' : '')}
                  </span>
                </div>
                {(e.company || e.location || canvas) && (
                  <div className="cm-sub">
                    <b>
                      <T p={`experiences.${i}.company`} v={e.company} ph="Entreprise" />
                    </b>
                    {(e.company && e.location) || canvas ? ' · ' : ''}
                    <T p={`experiences.${i}.location`} v={e.location} ph="Ville" />
                  </div>
                )}
                {(e.bullets.some((x) => x.trim()) || canvas) && (
                  <ul className="cm-bullets">
                    {bulletsOf(e.bullets).map(([x, j]) => (
                      <li key={j}>
                        <T p={`experiences.${i}.bullets.${j}`} v={x} ph="Verbe d’action + réalisation + résultat chiffré" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )
      case 'education':
        return (
          <div className={d.timeline && !inSide ? 'cm-timeline' : 'cm-entries'}>
            {r.education.map((e, i) => (
              <div className="cm-entry" key={e.id} {...entry(`education.${i}`)}>
                {grip(`education.${i}`)}
                <div className="cm-row">
                  <h3>
                    <T p={`education.${i}.degree`} v={e.degree} ph="Diplôme" />
                  </h3>
                  {!inSide && (
                    <span className="cm-date" {...dates(`education.${i}`)}>
                      {formatRange(e.start, e.end, false, r.lang) || (canvas ? 'Dates' : '')}
                    </span>
                  )}
                </div>
                <div className="cm-sub">
                  <b>
                    <T p={`education.${i}.school`} v={e.school} ph="École" />
                  </b>
                  {(e.school && e.location) || canvas ? ' · ' : ''}
                  <T p={`education.${i}.location`} v={e.location} ph="Ville" />
                  {inSide && (e.start || e.end) ? (
                    <span {...dates(`education.${i}`)}>{` · ${formatRange(e.start, e.end, false, r.lang)}`}</span>
                  ) : (
                    ''
                  )}
                </div>
                {(e.details.trim() || canvas) && (
                  <p className="cm-detail">
                    <T p={`education.${i}.details`} v={canvas ? e.details : e.details.trim()} ph="Mention, spécialité (facultatif)" multi />
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      case 'skills':
        return r.skills
          .map((g, i) => [g, i] as const)
          .filter(([g]) => g.items.length || canvas)
          .map(([g, i]) => (
            <div className="cm-skill" key={g.id} {...entry(`skills.${i}`)}>
              {grip(`skills.${i}`)}
              {d.skills === 'list' ? (
                <p>
                  {(g.name || canvas) && (
                    <b>
                      <T p={`skills.${i}.name`} v={g.name} ph="Catégorie" /> :{' '}
                    </b>
                  )}
                  {g.items.map((x, j) => (
                    <Fragment key={j}>
                      {j > 0 && ' · '}
                      <T p={`skills.${i}.items.${j}`} v={x} ph="Compétence" />
                    </Fragment>
                  ))}
                </p>
              ) : (
                <>
                  {(g.name || canvas) && (
                    <div className="cm-label">
                      <T p={`skills.${i}.name`} v={g.name} ph="Catégorie" />
                    </div>
                  )}
                  {d.skills === 'chips' ? (
                    <div className="cm-chips">
                      {g.items.map((x, j) => (
                        <span className="cm-chip" key={j}>
                          <T p={`skills.${i}.items.${j}`} v={x} ph="Compétence" />
                        </span>
                      ))}
                    </div>
                  ) : (
                    <ul className={`cm-cols ${inSide ? 'one' : ''}`}>
                      {g.items.map((x, j) => (
                        <li key={j}>
                          <T p={`skills.${i}.items.${j}`} v={x} ph="Compétence" />
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))
      case 'projects':
        return r.projects.map((p, i) => (
          <div className="cm-entry" key={p.id} {...entry(`projects.${i}`)}>
            {grip(`projects.${i}`)}
            <div className="cm-row">
              <h3>
                <T p={`projects.${i}.name`} v={p.name} ph="Nom du projet" />
              </h3>
              {(p.link || canvas) && !inSide && (
                <span className="cm-date">
                  <T p={`projects.${i}.link`} v={canvas ? p.link : stripProtocol(p.link)} ph="lien (facultatif)" />
                </span>
              )}
            </div>
            {(p.description || canvas) && (
              <p className="cm-detail">
                <T p={`projects.${i}.description`} v={p.description} ph="Description et résultat" multi />
              </p>
            )}
          </div>
        ))
      case 'certifications':
        return r.certifications.map((c, i) => (
          <div className="cm-entry" key={c.id} {...entry(`certifications.${i}`)}>
            {grip(`certifications.${i}`)}
            <h3>
              <T p={`certifications.${i}.name`} v={c.name} ph="Certification" />
            </h3>
            <div className="cm-sub">
              <T p={`certifications.${i}.issuer`} v={c.issuer} ph="Organisme" />
              {c.date && (
                <span {...dates(`certifications.${i}`)}>
                  {' · '}
                  {formatMonth(c.date)}
                </span>
              )}
            </div>
          </div>
        ))
      case 'languages':
        return (
          <ul className="cm-langs">
            {r.languages.map((l, i) => (
              <li key={l.id} {...entry(`languages.${i}`)}>
                {grip(`languages.${i}`)}
                <b>
                  <T p={`languages.${i}.name`} v={l.name} ph="Langue" />
                </b>
                {(l.level || canvas) && (
                  <span>
                    <T p={`languages.${i}.level`} v={l.level} ph="niveau" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )
      case 'interests':
        return canvas ? (
          <p className="cm-text">
            <T p="interests" v={r.interests} ph="Sport, bénévolat, passions…" multi />
          </p>
        ) : (
          <div className="cm-chips">
            {r.interests
              .split(/[,;·]/)
              .map((x) => x.trim())
              .filter(Boolean)
              .map((x, i) => (
                <span className="cm-chip" key={i}>
                  {x}
                </span>
              ))}
          </div>
        )
      case 'gallery':
        return (
          <div className={`cm-gallery ${inSide ? 'side' : ''}`}>
            {(r.gallery ?? []).map((g) => (
              <figure key={g.id} {...E(`gallery:${g.id}`, 'Changer cette image')}>
                {g.image ? <img src={g.image} alt={g.caption} /> : <div className="cm-shot" />}
                {g.caption && <figcaption>{g.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )
    }
  }

  const section = (k: SectionKey, inSide: boolean) => (
    <section className={`cm-sec cm-s-${k}`} key={k} {...E(TAB[k], `Modifier « ${t[k]} »`)} {...sectionMark(k)}>
      {grip(`section:${k}`)}
      <h2 className="cm-h">
        <span>{t[k]}</span>
      </h2>
      {content(k, inSide)}
    </section>
  )

  const name = (
    <h1 className="cm-name" {...E('field:firstName', 'Modifier le nom')}>
      <T p="basics.firstName" v={r.basics.firstName} show={b.firstName} ph="Prénom" />{' '}
      <span>
        <T p="basics.lastName" v={r.basics.lastName} show={b.lastName} ph="Nom" />
      </span>
    </h1>
  )

  const header = (
    <header className="cm-header" {...sectionMark('header')}>
      {headerDecor && <div className="cm-decor" style={headerDecor} aria-hidden />}
      {!photoInSide && photo}
      <div className="cm-id">
        {name}
        {(b.headline || canvas) && (
          <p className="cm-headline" {...E('field:headline', 'Modifier le titre')}>
            <T p="basics.headline" v={r.basics.headline} show={b.headline} ph="Titre du poste visé" />
          </p>
        )}
        {!hasSide && d.header !== 'split' && contactList('inline')}
      </div>
      {!hasSide && d.header === 'split' && contactList('stack')}
      {d.header === 'band' && <HeaderEdge shape={d.headerShape} page={page} />}
    </header>
  )

  // Avec colonne latérale, l'en-tête en bandeau couvre toute la largeur ; sinon il ouvre la colonne principale.
  const headerOnTop = !hasSide || d.header === 'band'

  const cls = [
    'cv',
    'cv-visual',
    'tpl-sur-mesure',
    'cm',
    `cm-${d.layout}`,
    `cm-header-${d.header}`,
    `cm-shape-${d.headerShape}`,
    `cm-align-${d.headerAlign}`,
    `cm-photo-${d.photo}`,
    `cm-photo-side-${d.photoSide}`,
    `cm-h-${d.headings}`,
    `cm-name-${d.nameCase}`,
    `cm-ns-${d.nameStyle}`,
    `cm-display-${d.displayFont}`,
    `cm-skills-${d.skills}`,
    `cm-bl-${d.bullets}`,
    `cm-en-${d.entries}`,
    `cm-fr-${d.frame}`,
    `cm-${d.density}`,
    `cm-corners-${d.corners}`
  ].join(' ')

  return (
    <article className={cls} style={style} lang={r.lang}>
      {cornerDecor && <div className="cm-corner" style={cornerDecor} aria-hidden />}
      {headerOnTop && header}
      <div className="cm-body">
        {hasSide && (
          <aside className="cm-side">
            {sideDecor && <div className="cm-decor" style={sideDecor} aria-hidden />}
            {photoInSide && <div className="cm-side-photo">{photo}</div>}
            {hasContacts && (
              <section className="cm-sec">
                <h2 className="cm-h">
                  <span>Contact</span>
                </h2>
                {contactList('stack')}
              </section>
            )}
            {sideKeys.map((k) => section(k, true))}
          </aside>
        )}
        <main className="cm-main">
          {!headerOnTop && header}
          {mainKeys.map((k) => (
            <Fragment key={k}>{section(k, false)}</Fragment>
          ))}
        </main>
      </div>
    </article>
  )
}
