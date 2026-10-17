import { Fragment, useContext, type CSSProperties, type ReactNode } from 'react'
import { normalizeDesign } from '../../../shared/design'
import { formatMonth, sectionTitles, formatRange, stripProtocol, visibleSections } from '../../../shared/format'
import type { Resume, SectionKey } from '../../../shared/types'
import { contrast, onColor } from './color'
import { EditableContext, usePlaceholders } from './previewContext'

/**
 * Modèle « Sur mesure » : une mise en page entièrement pilotée par un design paramétrable
 * (colonne latérale, en-tête, photo, style des titres, polices, couleurs…). C'est ce rendu
 * qui reproduit un CV envoyé en image.
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

export function CvCustom({ resume: r }: { resume: Resume }) {
  const ph = usePlaceholders()
  const editable = useContext(EditableContext)
  const E = (edit: string, label: string) => (editable ? { 'data-edit': edit, 'data-edit-label': label } : {})
  const d = normalizeDesign(r.design)
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

  const style = {
    '--cv-accent': primary,
    '--cm-primary': primary,
    '--cm-on-primary': onColor(primary),
    '--cm-secondary': secondary,
    '--cm-page': page,
    '--cm-text': text,
    '--cm-muted': mix(`${text} 62%`, page),
    '--cm-line': mix(`${text} 14%`, page),
    '--cm-sidebar': sidebar,
    '--cm-on-sidebar': sideText,
    '--cm-side-accent': readable(primary, sidebar, 2.4),
    '--cm-header': headerBg,
    '--cm-on-header': headerText,
    '--cm-name-accent': readable(primary, headerBg, 2.2),
    '--cm-body': BODY_FONTS[d.bodyFont],
    '--cm-display': DISPLAY_FONTS[d.displayFont],
    '--cm-name-size': `${NAME_SIZE[d.nameSize]}px`,
    '--cm-side-w': `${d.sidebarWidth}%`,
    '--cm-radius': d.corners === 'rounded' ? '14px' : '2px'
  } as CSSProperties

  const sections = visibleSections(r)
  const sideKeys = hasSide ? sections.filter((k) => d.sidebarSections.includes(k)) : []
  const mainKeys = sections.filter((k) => !sideKeys.includes(k))
  const fullName = `${b.firstName} ${b.lastName}`.trim()

  const contacts = [
    b.phone,
    b.email,
    b.location,
    b.mobility ?? '',
    b.website && stripProtocol(b.website),
    b.linkedin && stripProtocol(b.linkedin),
    b.github && stripProtocol(b.github),
    ...(r.links ?? []).map((l) => stripProtocol(l.url))
  ].filter(Boolean) as string[]

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
    contacts.length > 0 && (
      <ul className={`cm-contact ${cls}`} {...E('tab:identity', 'Modifier les coordonnées')}>
        {contacts.map((c, i) => (
          <li key={i}>{c}</li>
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

  const chips = (items: string[]) => (
    <div className="cm-chips">
      {items.map((x, i) => (
        <span className="cm-chip" key={i}>
          {x}
        </span>
      ))}
    </div>
  )

  const content = (k: SectionKey, inSide: boolean): ReactNode => {
    switch (k) {
      case 'summary':
        return <p className="cm-text">{b.summary.trim()}</p>
      case 'experience':
        return (
          <div className={d.timeline ? 'cm-timeline' : 'cm-entries'}>
            {r.experiences.map((e) => (
              <div className="cm-entry" key={e.id}>
                <div className="cm-row">
                  <h3>{e.role}</h3>
                  <span className="cm-date">{formatRange(e.start, e.end, e.current, r.lang)}</span>
                </div>
                {(e.company || e.location) && (
                  <div className="cm-sub">
                    <b>{e.company}</b>
                    {e.company && e.location ? ' · ' : ''}
                    {e.location}
                  </div>
                )}
                {e.bullets.some((x) => x.trim()) && (
                  <ul className="cm-bullets">
                    {e.bullets
                      .filter((x) => x.trim())
                      .map((x, i) => (
                        <li key={i}>{x.trim()}</li>
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
            {r.education.map((e) => (
              <div className="cm-entry" key={e.id}>
                <div className="cm-row">
                  <h3>{e.degree}</h3>
                  {!inSide && <span className="cm-date">{formatRange(e.start, e.end, false, r.lang)}</span>}
                </div>
                <div className="cm-sub">
                  <b>{e.school}</b>
                  {e.school && e.location ? ' · ' : ''}
                  {e.location}
                  {inSide && (e.start || e.end) ? ` · ${formatRange(e.start, e.end, false, r.lang)}` : ''}
                </div>
                {e.details.trim() && <p className="cm-detail">{e.details.trim()}</p>}
              </div>
            ))}
          </div>
        )
      case 'skills':
        return r.skills
          .filter((g) => g.items.length)
          .map((g) => (
            <div className="cm-skill" key={g.id}>
              {d.skills === 'list' ? (
                <p>
                  {g.name && <b>{g.name} : </b>}
                  {g.items.join(' · ')}
                </p>
              ) : (
                <>
                  {g.name && <div className="cm-label">{g.name}</div>}
                  {d.skills === 'chips' ? (
                    chips(g.items)
                  ) : (
                    <ul className={`cm-cols ${inSide ? 'one' : ''}`}>
                      {g.items.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))
      case 'projects':
        return r.projects.map((p) => (
          <div className="cm-entry" key={p.id}>
            <div className="cm-row">
              <h3>{p.name}</h3>
              {p.link && !inSide && <span className="cm-date">{stripProtocol(p.link)}</span>}
            </div>
            {p.description && <p className="cm-detail">{p.description}</p>}
          </div>
        ))
      case 'certifications':
        return r.certifications.map((c) => (
          <div className="cm-entry" key={c.id}>
            <h3>{c.name}</h3>
            <div className="cm-sub">{[c.issuer, formatMonth(c.date)].filter(Boolean).join(' · ')}</div>
          </div>
        ))
      case 'languages':
        return (
          <ul className="cm-langs">
            {r.languages.map((l) => (
              <li key={l.id}>
                <b>{l.name}</b>
                {l.level && <span>{l.level}</span>}
              </li>
            ))}
          </ul>
        )
      case 'interests':
        return chips(
          r.interests
            .split(/[,;·]/)
            .map((x) => x.trim())
            .filter(Boolean)
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
    <section className={`cm-sec cm-s-${k}`} key={k} {...E(TAB[k], `Modifier « ${t[k]} »`)}>
      <h2 className="cm-h">
        <span>{t[k]}</span>
      </h2>
      {content(k, inSide)}
    </section>
  )

  const header = (
    <header className="cm-header">
      {!photoInSide && photo}
      <div className="cm-id">
        <h1 className="cm-name" {...E('field:firstName', 'Modifier le nom')}>
          {b.firstName} <span>{b.lastName}</span>
        </h1>
        {b.headline && (
          <p className="cm-headline" {...E('field:headline', 'Modifier le titre')}>
            {b.headline}
          </p>
        )}
        {!hasSide && d.header !== 'split' && contactList('inline')}
      </div>
      {!hasSide && d.header === 'split' && contactList('stack')}
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
    `cm-align-${d.headerAlign}`,
    `cm-photo-${d.photo}`,
    `cm-photo-side-${d.photoSide}`,
    `cm-h-${d.headings}`,
    `cm-name-${d.nameCase}`,
    `cm-display-${d.displayFont}`,
    `cm-skills-${d.skills}`,
    `cm-${d.density}`,
    `cm-corners-${d.corners}`
  ].join(' ')

  return (
    <article className={cls} style={style} lang={r.lang}>
      {headerOnTop && header}
      <div className="cm-body">
        {hasSide && (
          <aside className="cm-side">
            {photoInSide && <div className="cm-side-photo">{photo}</div>}
            {contacts.length > 0 && (
              <section className="cm-sec">
                <h2 className="cm-h">
                  <span>{r.lang === 'en' ? 'Contact' : 'Contact'}</span>
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
