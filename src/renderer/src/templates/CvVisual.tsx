import { Fragment, useContext, type CSSProperties, type ReactNode } from 'react'
import { Link2, Mail, MapPin, Navigation, Phone, Sparkle } from 'lucide-react'
import { sectionTitles, stripProtocol, visibleSections } from '../../../shared/format'
import type { Resume, SectionKey, SkillGroup } from '../../../shared/types'
import { EditableContext, usePlaceholders } from './previewContext'
import { resolveIcon, type IconDesign } from '../lib/iconBank'
import { FONTS } from './registry'

/**
 * Modèles visuels « portfolio » : trois mises en page distinctes construites
 * à partir des mêmes blocs (identité, parcours, outils, galerie…).
 *  - vitrine : en-tête scindé, colonne latérale, parcours en frise
 *  - studio  : affiche sombre, nom géant, bandeau d'accent, grille bento
 *  - folio   : éditorial clair, portrait, sections à étiquettes en marge
 */

function years(start: string, end: string, current: boolean, lang: Resume['lang']) {
  const s = start.slice(0, 4)
  const e = current ? (lang === 'en' ? 'now' : 'auj.') : end.slice(0, 4)
  if (s && e && s !== e) return `${s} – ${e}`
  return s || e
}

function initials(text: string) {
  const words = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase()
}

// Teinte stable par nom d'outil, pour les tuiles monogrammes.
const TILE_COLORS = ['#111111', '#2FBF71', '#7C5CFF', '#12A5A5', '#E2367A', '#3D8BFF', '#5D6B2F', '#4B5563', '#0F6E5C', '#9333EA']
function tileColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TILE_COLORS[h % TILE_COLORS.length]
}

/** Couleur de texte lisible sur l'accent : noir sur une couleur claire, blanc sinon. */
function onAccent(hex: string) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim())
  if (!m) return '#ffffff'
  const [r, g, b] = m.slice(1).map((x) => {
    const c = parseInt(x, 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111111' : '#ffffff'
}

/** Termine une phrase par un point, sans le doubler. */
const endDot = (x: string) => (/[.!?…]$/.test(x.trim()) ? x.trim() : x.trim() + '.')

/** Niveau de langue approximatif (0–100) pour les anneaux du modèle Calque. */
function levelPercent(level: string) {
  const l = level.toLowerCase()
  if (/natif|maternelle|native|bilingue|bilingual|c2/.test(l)) return 100
  if (/c1|courant|fluent|avancé|advanced/.test(l)) return 85
  if (/b2/.test(l)) return 70
  if (/b1|intermédiaire|intermediate/.test(l)) return 55
  if (/a2|notions|basic|élémentaire/.test(l)) return 35
  if (/a1|débutant|beginner/.test(l)) return 20
  return 60
}

const LABELS = {
  fr: { phone: 'Téléphone', email: 'E-mail', location: 'Ville', mobility: 'Mobilité', gallery: 'Rendus', path: 'Parcours', contact: 'Contact', profile: 'Profil', more: 'En plus' },
  en: { phone: 'Phone', email: 'Email', location: 'City', mobility: 'Mobility', gallery: 'Selected work', path: 'Journey', contact: 'Contact', profile: 'Profile', more: 'More' }
}

export function CvVisual({ resume: r }: { resume: Resume }) {
  const ph = usePlaceholders()
  const b = { ...r.basics, firstName: ph.first(r.basics.firstName), lastName: ph.last(r.basics.lastName), headline: ph.headline(r.basics.headline) }
  const t = sectionTitles(r)
  const L = LABELS[r.lang]
  const font = FONTS.find((f) => f.id === r.font)
  const style = {
    '--cv-accent': r.accent,
    '--cv-on-accent': onAccent(r.accent),
    ...(r.accent2 ? { '--cv-accent-2': r.accent2, '--cv-on-accent-2': onAccent(r.accent2) } : {}),
    ...(font ? { '--cv-font': font.stack } : {}),
    ...(r.basics.bannerHeight ? { '--banner-h': `${r.basics.bannerHeight}px` } : {})
  } as CSSProperties
  // Dans l'éditeur, chaque élément porte une cible d'édition (survol + clic dans l'aperçu).
  const editable = useContext(EditableContext)
  const E = (edit: string, label: string) => (editable ? { 'data-edit': edit, 'data-edit-label': label } : {})
  const shown = new Set<SectionKey>(visibleSections(r))
  const fullName = `${b.firstName} ${b.lastName}`.trim()

  const links: { label: string; url: string }[] = [
    b.website && { label: r.lang === 'en' ? 'Website' : 'Site', url: b.website },
    b.linkedin && { label: 'LinkedIn', url: b.linkedin },
    b.github && { label: 'GitHub', url: b.github },
    ...(r.links ?? []).filter((l) => l.url || l.label)
  ].filter(Boolean) as { label: string; url: string }[]

  const info = (
    [
      [L.phone, b.phone],
      [L.email, b.email],
      [L.location, b.location],
      [L.mobility, b.mobility ?? '']
    ] as const
  ).filter(([, v]) => v)

  // ---------- Blocs réutilisables ----------

  const heading = (n: string, title: string) => (
    <h2 className="vz-h">
      <span className="vz-n">{n}</span>
      {title}
    </h2>
  )

  const photo = (cls: string) =>
    b.photo ? (
      <img className={`vz-photo ${cls}`} src={b.photo} alt="" {...E('photo', 'Changer la photo')} />
    ) : (
      <div className={`vz-photo vz-initials ${cls}`} {...E('photo', 'Ajouter une photo')}>
        {initials(fullName)}
      </div>
    )

  // Bandeau dans une boîte : l'image la remplit, la poignée du bas règle sa hauteur.
  const banner = (cls: string, sized = false) => (
    <div className={`vz-banner-box ${cls}`} {...E('banner', b.banner ? 'Changer le bandeau' : 'Ajouter une image de bandeau')} {...(sized ? { 'data-banner-size': '' } : {})}>
      {b.banner ? <img className="vz-banner" src={b.banner} alt="" /> : <div className="vz-banner vz-banner-fallback" />}
      {editable && <span className="vz-resize" data-resize="banner" title="Glisser pour changer la hauteur du bandeau" />}
    </div>
  )

  const cta = b.ctaLabel ? (
    <span className="vz-cta" {...E('field:ctaLabel', 'Modifier le bouton')}>
      <span>
        {b.ctaLabel} <span className="arr">→</span>
      </span>
      {b.ctaUrl ? <small>{stripProtocol(b.ctaUrl)}</small> : null}
    </span>
  ) : null

  const linkList = (cls = '') =>
    links.length > 0 && (
      <div className={`vz-links ${cls}`} {...E('tab:identity', 'Modifier les liens')}>
        {links.map((l) => (
          <span className="vz-link" key={l.label + l.url}>
            <b>{l.label}</b>
            {stripProtocol(l.url)}
          </span>
        ))}
      </div>
    )

  const skillGroup = (g: SkillGroup) => {
    const mode = g.display ?? 'list'
    if (mode === 'tiles')
      return (
        <div className="vz-tiles">
          {g.items.map((s) => {
            const custom = g.icons?.[s]
            const icon = resolveIcon(s, custom, (g.iconStyle as IconDesign) ?? 'app', g.autoIcons !== false)
            return (
            <div className="vz-tile" key={s} {...E(`icon:${g.id}:${s}`, `Changer l’icône « ${s} »`)}>
              {icon ? (
                <span className={`vz-mono vz-icon ${custom && !custom.startsWith('bank:') ? '' : 'bank'}`}>
                  <img src={icon} alt="" />
                </span>
              ) : (
                <span className="vz-mono" style={{ background: tileColor(s) }}>
                  {initials(s)}
                </span>
              )}
              <span className="vz-tile-name">{s}</span>
            </div>
            )
          })}
        </div>
      )
    if (mode === 'chips')
      return (
        <div className="vz-chips">
          {g.items.map((s) => (
            <span className="vz-chip" key={s}>
              {s}
            </span>
          ))}
        </div>
      )
    return (
      <p className="vz-inline">
        {g.items.map((s, i) => (
          <Fragment key={s}>
            {i > 0 && <span className="dot"> / </span>}
            {s}
          </Fragment>
        ))}
      </p>
    )
  }

  const skillBlocks = shown.has('skills')
    ? r.skills
        .filter((g) => g.items.length)
        .map((g) => (
          <div className="vz-skill" key={g.id} {...E('tab:skills', 'Modifier les compétences')}>
            <div className="vz-label">{g.name || t.skills}</div>
            {skillGroup(g)}
          </div>
        ))
    : []

  const interests = shown.has('interests')
    ? r.interests
        .split(/[,;·]/)
        .map((x) => x.trim())
        .filter(Boolean)
    : []

  type Entry = { key: string; title: string; sub: string; when: string; bullets: string[]; desc?: string; badge: string; org?: string; place?: string }
  const entries: Entry[] = [
    ...(shown.has('experience')
      ? r.experiences.map((e) => ({
          key: e.id,
          title: e.role,
          sub: [e.company, e.location].filter(Boolean).join(' · '),
          when: years(e.start, e.end, e.current, r.lang),
          bullets: e.bullets.filter((x) => x.trim()).map((x) => x.trim()),
          badge: initials(e.company || e.role),
          org: e.company,
          place: e.location
        }))
      : []),
    ...(shown.has('projects')
      ? r.projects.map((p) => ({ key: p.id, title: p.name, sub: p.link ? stripProtocol(p.link) : '', when: '', bullets: [], desc: p.description, badge: initials(p.name) }))
      : [])
  ]

  const entryBody = (e: Entry) => (
    <>
      {e.sub && <div className="vz-sub">{e.sub}</div>}
      {e.bullets.length > 0 && (
        <ul className="vz-bullets">
          {e.bullets.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}
      {e.desc && <p className="vz-desc">{e.desc}</p>}
    </>
  )

  const gallery =
    shown.has('gallery') && r.gallery?.length ? (
      <div className="vz-gallery">
        {r.gallery.map((g, i) => (
          <figure key={g.id} {...E(`gallery:${g.id}`, 'Changer cette image')}>
            {g.image ? <img src={g.image} alt={g.caption} /> : <div className={`vz-shot-fallback f${i % 3}`} />}
            <figcaption>{g.caption}</figcaption>
          </figure>
        ))}
      </div>
    ) : null

  const education = shown.has('education')
    ? r.education.map((e) => (
        <div className="vz-edu" key={e.id}>
          <strong>{e.degree}</strong>
          <span>
            {[e.school, e.location].filter(Boolean).join(' · ')}
            {(e.start || e.end) && ` · ${years(e.start, e.end, false, r.lang)}`}
          </span>
          {e.details.trim() && <em>{e.details.trim()}</em>}
        </div>
      ))
    : []

  const langs =
    shown.has('languages') && r.languages.length ? (
      <p className="vz-langs">
        {r.languages.map((l, i) => (
          <Fragment key={l.id}>
            {i > 0 && <span className="dot"> / </span>}
            <strong>{l.name}</strong>
            {l.level ? ` ${l.level}` : ''}
          </Fragment>
        ))}
      </p>
    ) : null

  const certs = shown.has('certifications')
    ? r.certifications.map((c) => (
        <div className="vz-edu" key={c.id}>
          <strong>{c.name}</strong>
          <span>{[c.issuer, c.date.slice(0, 4)].filter(Boolean).join(' · ')}</span>
        </div>
      ))
    : []

  const summary = shown.has('summary') && b.summary.trim() ? <p className="vz-summary" {...E('field:summary', 'Modifier le profil')}>{b.summary.trim()}</p> : null

  const chips = (items: string[]) => (
    <div className="vz-chips">
      {items.map((x) => (
        <span className="vz-chip" key={x}>
          {x}
        </span>
      ))}
    </div>
  )

  // ---------- Mises en page ----------

  let body: ReactNode
  if (r.templateId === 'studio') {
    let n = 0
    const num = () => String(++n).padStart(2, '0')
    body = (
      <>
        <header className="st-hero" data-banner-size="">
          {banner('st-banner')}
          <div className="st-top">
            <span className="vz-kicker" {...E('field:headline', 'Modifier le titre')}>{b.headline}</span>
            {photo('st-photo')}
          </div>
          <h1 className="st-name" {...E('field:firstName', 'Modifier le nom')}>
            {b.firstName} <span>{b.lastName}</span>
          </h1>
        </header>
        <div className="st-band">
          {[b.location, b.mobility, ...links.slice(0, 2).map((l) => stripProtocol(l.url))].filter(Boolean).map((x, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="sep">/</span>}
              <span>{x}</span>
            </Fragment>
          ))}
        </div>
        <div className="st-bento">
          <div className="st-col span-4">
          {summary && (
            <section className="st-card">
              {heading(num(), L.profile)}
              {summary}
            </section>
          )}
          {entries.length > 0 && (
            <section className="st-card">
              {heading(num(), L.path)}
              <div className="st-entries" {...E('tab:experience', 'Modifier le parcours')}>
                {entries.map((e) => (
                  <div className="st-entry" key={e.key}>
                    <div className="st-entry-head">
                      <h3>{e.title}</h3>
                      <span className="vz-when">{e.when}</span>
                    </div>
                    {entryBody(e)}
                  </div>
                ))}
              </div>
            </section>
          )}
            {(education.length > 0 || certs.length > 0) && (
              <section className="st-card">
                {heading(num(), t.education)}
                <div className="st-edu" {...E('tab:education', 'Modifier la formation')}>
                  {education}
                  {certs}
                </div>
              </section>
            )}
            {gallery && (
              <section className="st-card">
                {heading(num(), L.gallery)}
                {gallery}
              </section>
            )}
          </div>
          <div className="st-col span-2">
            <section className="st-card st-accent">
              {heading(num(), L.contact)}
              {info.map(([k, v]) => (
                <div className="vz-kv" key={k} {...E('tab:identity', 'Modifier les coordonnées')}>
                  <span>{k}</span>
                  {v}
                </div>
              ))}
              {cta}
            </section>
            {skillBlocks.length > 0 && (
              <section className="st-card">
                {heading(num(), t.skills)}
                {skillBlocks}
              </section>
            )}
            {(interests.length > 0 || langs || links.length > 2) && (
              <section className="st-card">
                {heading(num(), L.more)}
                {langs}
                {interests.length > 0 && chips(interests)}
                {links.length > 2 && (
                  <div className="vz-links st-links">
                    {links.slice(2).map((l) => (
                      <span className="vz-link" key={l.label + l.url}>
                        <b>{l.label}</b>
                        {stripProtocol(l.url)}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </>
    )
  } else if (r.templateId === 'folio') {
    let n = 0
    const num = () => String(++n).padStart(2, '0')
    const row = (title: string, content: ReactNode, key: string) => (
      <section className="fo-row" key={key}>
        <div className="fo-side">
          <span className="vz-n">{num()}</span>
          <span className="fo-title">{title}</span>
        </div>
        <div className="fo-content">{content}</div>
      </section>
    )
    body = (
      <>
        <header className="fo-hero">
          {photo('fo-photo')}
          <div className="fo-id">
            <span className="vz-kicker" {...E('field:headline', 'Modifier le titre')}>{b.headline}</span>
            <h1 className="fo-name" {...E('field:firstName', 'Modifier le nom')}>
              {b.firstName}
              <br />
              {b.lastName}
              <span className="dot">.</span>
            </h1>
            <div className="fo-contact" {...E('tab:identity', 'Modifier les coordonnées')}>
              {info.map(([k, v], i) => (
                <Fragment key={k}>
                  {i > 0 && <span className="sep">/</span>}
                  <span>{v}</span>
                </Fragment>
              ))}
            </div>
            <div className="fo-actions">
              {cta}
              {linkList()}
            </div>
          </div>
        </header>
        {b.banner && banner('fo-banner', true)}
        <div className="fo-rows">
          {summary && row(L.profile, summary, 'p')}
          {entries.length > 0 &&
            row(
              L.path,
              <div className="fo-entries" {...E('tab:experience', 'Modifier le parcours')}>
                {entries.map((e) => (
                  <div className="fo-entry" key={e.key}>
                    <div className="fo-entry-head">
                      <h3>{e.title}</h3>
                      <span className="vz-when">{e.when}</span>
                    </div>
                    {entryBody(e)}
                  </div>
                ))}
              </div>,
              'x'
            )}
          {skillBlocks.length > 0 && row(t.skills, <div className="fo-skills">{skillBlocks}</div>, 's')}
          {gallery && row(L.gallery, gallery, 'g')}
          {(education.length > 0 || certs.length > 0 || langs || interests.length > 0) &&
            row(
              t.education,
              <div className="fo-cols" {...E('tab:education', 'Modifier la formation')}>
                <div>
                  {education}
                  {certs}
                </div>
                <div>
                  {langs}
                  {interests.length > 0 && chips(interests)}
                </div>
              </div>,
              'e'
            )}
        </div>
      </>
    )
  } else if (r.templateId === 'colonne') {
    let n = 0
    const num = () => String(++n).padStart(2, '0')
    body = (
      <div className="co-grid">
        <aside className="co-side">
          {photo('co-photo')}
          <div className="co-block">
            <div className="vz-label">{L.contact}</div>
            {info.map(([k, v]) => (
              <div className="vz-kv" key={k} {...E('tab:identity', 'Modifier les coordonnées')}>
                <span>{k}</span>
                {v}
              </div>
            ))}
          </div>
          {links.length > 0 && (
            <div className="co-block">
              <div className="vz-label">{r.lang === 'en' ? 'Links' : 'Liens'}</div>
              {links.map((l) => (
                <div className="co-link" key={l.label + l.url}>
                  <b>{l.label}</b>
                  {stripProtocol(l.url)}
                </div>
              ))}
            </div>
          )}
          {skillBlocks.length > 0 && <div className="co-block">{skillBlocks}</div>}
          {langs && (
            <div className="co-block">
              <div className="vz-label">{t.languages}</div>
              {langs}
            </div>
          )}
          {interests.length > 0 && (
            <div className="co-block">
              <div className="vz-label">{t.interests}</div>
              {chips(interests)}
            </div>
          )}
        </aside>
        <main className="co-main">
          <header className="co-head">
            <span className="vz-kicker" {...E('field:headline', 'Modifier le titre')}>{b.headline}</span>
            <h1 className="co-name" {...E('field:firstName', 'Modifier le nom')}>
              {b.firstName} <span>{b.lastName}</span>
            </h1>
            {cta}
          </header>
          {b.banner && banner('co-banner', true)}
          {summary && (
            <section>
              {heading(num(), L.profile)}
              {summary}
            </section>
          )}
          {entries.length > 0 && (
            <section>
              {heading(num(), L.path)}
              <div className="co-entries" {...E('tab:experience', 'Modifier le parcours')}>
                {entries.map((e) => (
                  <div className="co-entry" key={e.key}>
                    <div className="st-entry-head">
                      <h3>{e.title}</h3>
                      <span className="vz-when">{e.when}</span>
                    </div>
                    {entryBody(e)}
                  </div>
                ))}
              </div>
            </section>
          )}
          {gallery && (
            <section>
              {heading(num(), L.gallery)}
              {gallery}
            </section>
          )}
          {(education.length > 0 || certs.length > 0) && (
            <section>
              {heading(num(), t.education)}
              <div className="vt-edu-grid" {...E('tab:education', 'Modifier la formation')}>
                {education}
                {certs}
              </div>
            </section>
          )}
        </main>
      </div>
    )
  } else if (r.templateId === 'manifeste') {
    // Manifeste : une phrase géante (nom + titre), étiquettes en pastilles, parcours en tableau à filets.
    const head = (label: string, count?: number) => (
      <div className="mf-head">
        <span className="mf-pill">{label}</span>
        {count ? <span className="mf-count">{String(count).padStart(2, '0')}</span> : null}
      </div>
    )
    body = (
      <>
        <header className="mf-hero">
          <div className="mf-bar">
            {photo('mf-photo')}
            <span className="mf-who">{fullName}</span>
            <span className="mf-bar-right" {...E('tab:identity', 'Modifier les coordonnées')}>
              {b.location && <span className="mf-pill">{b.location}</span>}
              {b.mobility && <span className="mf-pill mf-pill-ink">{b.mobility}</span>}
            </span>
          </div>
          <h1 className="mf-statement" {...E('field:headline', 'Modifier le titre')}>
            <span {...E('field:firstName', 'Modifier le nom')}>
              {b.firstName} {b.lastName}
            </span>
            {b.headline && (
              <>
                , <em>{b.headline}</em>
              </>
            )}
          </h1>
          <div className="mf-intro">
            {summary}
            <div className="mf-actions">
              {cta}
              {linkList()}
            </div>
          </div>
        </header>
        {b.banner && banner('mf-banner', true)}
        {entries.length > 0 && (
          <section className="mf-section">
            {head(L.path, entries.length)}
            <div className="mf-table" {...E('tab:experience', 'Modifier le parcours')}>
              {entries.map((e) => (
                <div className="mf-row" key={e.key}>
                  <span className="vz-when">{e.when}</span>
                  <div>
                    <h3>{e.title}</h3>
                    {e.sub && <div className="vz-sub">{e.sub}</div>}
                  </div>
                  <div>
                    {e.bullets.length > 0 && (
                      <ul className="vz-bullets">
                        {e.bullets.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    )}
                    {e.desc && <p className="vz-desc">{e.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {gallery && (
          <section className="mf-section">
            {head(L.gallery, r.gallery?.length)}
            {gallery}
          </section>
        )}
        <div className="mf-grid">
          {skillBlocks.length > 0 && (
            <section className="mf-card">
              {head(t.skills)}
              {skillBlocks}
            </section>
          )}
          {(education.length > 0 || certs.length > 0) && (
            <section className="mf-card" {...E('tab:education', 'Modifier la formation')}>
              {head(t.education)}
              {education}
              {certs}
            </section>
          )}
          <section className="mf-card mf-card-ink">
            {head(L.contact)}
            {info.map(([k, v]) => (
              <div className="vz-kv" key={k} {...E('tab:identity', 'Modifier les coordonnées')}>
                <span>{k}</span>
                {v}
              </div>
            ))}
            {langs}
            {interests.length > 0 && chips(interests)}
          </section>
        </div>
      </>
    )
  } else if (r.templateId === 'affiche') {
    // Affiche : grand aplat de couleur, nom monumental, image en duotone, parcours numéroté.
    body = (
      <>
        <header className="af-hero" data-banner-size="">
          {banner('af-banner')}
          <div className="af-top">
            <span className="vz-kicker af-kicker" {...E('field:headline', 'Modifier le titre')}>
              {b.headline}
            </span>
            {photo('af-photo')}
          </div>
          <h1 className="af-name" {...E('field:firstName', 'Modifier le nom')}>
            {b.firstName}
            <br />
            {b.lastName}
          </h1>
          <div className="af-band" {...E('tab:identity', 'Modifier les coordonnées')}>
            {[b.phone, b.email, b.location, b.mobility].filter(Boolean).map((x, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="sep">✳</span>}
                <span>{x}</span>
              </Fragment>
            ))}
          </div>
        </header>
        <div className="af-body">
          <aside className="af-side">
            {cta}
            {linkList('af-links')}
            {skillBlocks.length > 0 && <div className="af-block">{skillBlocks}</div>}
            {langs && (
              <div className="af-block">
                <div className="vz-label">{t.languages}</div>
                {langs}
              </div>
            )}
            {interests.length > 0 && (
              <div className="af-block">
                <div className="vz-label">{t.interests}</div>
                {chips(interests)}
              </div>
            )}
          </aside>
          <main className="af-main">
            {summary && <section className="af-lead">{summary}</section>}
            {entries.length > 0 && (
              <section>
                <h2 className="af-h">{L.path}</h2>
                <div className="af-entries" {...E('tab:experience', 'Modifier le parcours')}>
                  {entries.map((e, i) => (
                    <div className="af-entry" key={e.key}>
                      <span className="af-num">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <div className="st-entry-head">
                          <h3>{e.title}</h3>
                          <span className="vz-when">{e.when}</span>
                        </div>
                        {entryBody(e)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {(education.length > 0 || certs.length > 0) && (
              <section>
                <h2 className="af-h">{t.education}</h2>
                <div className="vt-edu-grid" {...E('tab:education', 'Modifier la formation')}>
                  {education}
                  {certs}
                </div>
              </section>
            )}
            {gallery && (
              <section className="af-gallery">
                <h2 className="af-h">{L.gallery}</h2>
                {gallery}
              </section>
            )}
          </main>
        </div>
      </>
    )
  } else if (r.templateId === 'magazine') {
    // Magazine : bandeau de titre, nom en serif italique, chapeau en lettrine, colonnes et mosaïque.
    body = (
      <>
        <header className="mg-mast">
          <div className="mg-meta">
            <span>Portfolio · CV</span>
            <span>N° {new Date().getFullYear()}</span>
            <span>{b.location}</span>
          </div>
          <h1 className="mg-name" {...E('field:firstName', 'Modifier le nom')}>
            {b.firstName} <span>{b.lastName}</span>
            <i className="mg-dot">.</i>
          </h1>
          {b.headline && (
            <p className="mg-dek" {...E('field:headline', 'Modifier le titre')}>
              {b.headline}
            </p>
          )}
        </header>
        <div className="mg-lead">
          {photo('mg-photo')}
          <div className="mg-lead-text">
            {summary}
            <div className="mg-actions">
              {cta}
              {linkList()}
            </div>
          </div>
        </div>
        {b.banner && banner('mg-banner', true)}
        <div className="mg-cols">
          <main className="mg-main">
            {entries.length > 0 && (
              <section>
                <h2 className="mg-h">{L.path}</h2>
                <div className="mg-entries" {...E('tab:experience', 'Modifier le parcours')}>
                  {entries.map((e) => (
                    <article className="mg-entry" key={e.key}>
                      <span className="vz-when">{e.when}</span>
                      <h3>{e.title}</h3>
                      {entryBody(e)}
                    </article>
                  ))}
                </div>
              </section>
            )}
            {(education.length > 0 || certs.length > 0) && (
              <section>
                <h2 className="mg-h">{t.education}</h2>
                <div className="vt-edu-grid" {...E('tab:education', 'Modifier la formation')}>
                  {education}
                  {certs}
                </div>
              </section>
            )}
            {gallery && (
              <section>
                <h2 className="mg-h">{L.gallery}</h2>
                {gallery}
              </section>
            )}
          </main>
          <aside className="mg-side">
            <section className="mg-box">
              <h2 className="mg-h">{L.contact}</h2>
              {info.map(([k, v]) => (
                <div className="vz-kv" key={k} {...E('tab:identity', 'Modifier les coordonnées')}>
                  <span>{k}</span>
                  {v}
                </div>
              ))}
            </section>
            {skillBlocks.length > 0 && (
              <section className="mg-box">
                <h2 className="mg-h">{t.skills}</h2>
                {skillBlocks}
              </section>
            )}
            {(langs || interests.length > 0) && (
              <section className="mg-box">
                <h2 className="mg-h">{L.more}</h2>
                {langs}
                {interests.length > 0 && chips(interests)}
              </section>
            )}
          </aside>
        </div>
      </>
    )
  } else if (r.templateId === 'calque') {
    // Calque : look d'outil de design (cadre de sélection à poignées, surlignages, frise en pointillés).
    const roles = b.headline
      .split(/\s+[·|•/—–-]\s+|\s*,\s*|\s+&\s+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 2)
    const h = (label: string, arrow = false) => (
      <h2 className="cl-h">
        <span>{label}</span>
        {arrow && <span className="cl-arrow">↗</span>}
      </h2>
    )
    const allSkills = r.skills.filter((g) => g.items.length)
    body = (
      <>
        <header className="cl-hero">
          <div className="cl-id">
            <span className="cl-hello">{r.lang === 'en' ? 'Hello! I’m' : 'Bonjour ! Je suis'}</span>
            <h1 className="cl-name" {...E('field:firstName', 'Modifier le nom')}>
              {b.firstName} {b.lastName}
            </h1>
            {roles.length > 0 && (
              <div className="cl-roles" {...E('field:headline', 'Modifier le titre')}>
                {roles.map((x, i) => (
                  <span key={i} className={i === 0 ? 'on' : ''}>
                    {x}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="cl-frame">
            {photo('cl-photo')}
            {['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br'].map((p) => (
              <i key={p} className={`cl-handle ${p}`} />
            ))}
          </div>
        </header>
        {summary && (
          <section className="cl-profile">
            {h(L.profile, true)}
            {summary}
            <div className="cl-contact" {...E('tab:identity', 'Modifier les coordonnées')}>
              {[b.email, b.phone, b.location, ...links.map((l) => stripProtocol(l.url))].filter(Boolean).map((x, i) => (
                <span key={i}>{x}</span>
              ))}
            </div>
            {cta}
          </section>
        )}
        <div className="cl-body">
          <aside className="cl-side">
            {allSkills.length > 0 && shown.has('skills') && (
              <section {...E('tab:skills', 'Modifier les compétences')}>
                {h(t.skills)}
                {allSkills.map((g) => (
                  <div className="cl-skill" key={g.id}>
                    {g.name && <div className="vz-label">{g.name}</div>}
                    {g.display === 'chips' ? (
                      chips(g.items)
                    ) : (
                      <ul className={g.items.length > 5 ? 'two' : ''}>
                        {g.items.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
            )}
            {shown.has('languages') && r.languages.length > 0 && (
              <section {...E('tab:extras', 'Modifier les langues')}>
                {h(t.languages)}
                <div className="cl-rings">
                  {r.languages.map((l) => (
                    <div className="cl-ring" key={l.id}>
                      <span className="ring" style={{ '--p': levelPercent(l.level) } as CSSProperties} />
                      <strong>{l.name}</strong>
                      <small>{l.level}</small>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {interests.length > 0 && (
              <section>
                {h(t.interests)}
                {chips(interests)}
              </section>
            )}
          </aside>
          <main className="cl-main">
            {entries.length > 0 && (
              <section>
                {h(L.path)}
                <div className="cl-entries" {...E('tab:experience', 'Modifier le parcours')}>
                  {entries.map((e) => (
                    <div className="cl-entry" key={e.key}>
                      <div className="cl-when">
                        {e.place && <span>{e.place} /</span>}
                        <span>{e.when}</span>
                      </div>
                      <div>
                        <h3>
                          {e.title}
                          {e.org && <span> / {e.org}</span>}
                        </h3>
                        {!e.org && e.sub && <div className="vz-sub">{e.sub}</div>}
                        {e.bullets.length > 0 && (
                          <ul className="cl-bullets">
                            {e.bullets.map((x, i) => (
                              <li key={i}>{x}</li>
                            ))}
                          </ul>
                        )}
                        {e.desc && <p className="vz-desc">{e.desc}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {(education.length > 0 || certs.length > 0) && (
              <section>
                {h(t.education)}
                <div className="cl-edu" {...E('tab:education', 'Modifier la formation')}>
                  {education}
                  {certs}
                </div>
              </section>
            )}
            {gallery && (
              <section>
                {h(L.gallery)}
                {gallery}
              </section>
            )}
          </main>
        </div>
      </>
    )
  } else if (r.templateId === 'pop') {
    // Pop : bleu électrique et rose, en-tête en trame de points, pastilles étoilées, frise à points.
    const parts = b.headline
      .split(/\s+[·|•/—–-]\s+|\s*,\s*/)
      .map((x) => x.trim())
      .filter(Boolean)
    const role = parts[0] ?? ''
    const quote = parts.slice(1).join(' · ') || b.mobility || ''
    const head = (label: string, alt = false) => (
      <h2 className={`pop-h ${alt ? 'alt' : ''}`}>
        <span className="pop-pill">
          {label}
          <Sparkle className="pop-star" size={13} fill="currentColor" strokeWidth={1.5} />
        </span>
        <span className="pop-line" />
      </h2>
    )
    const contacts: [ReactNode, string][] = [
      [<Phone size={10} key="p" />, b.phone],
      [<Mail size={10} key="m" />, b.email],
      ...links.map((l): [ReactNode, string] => [<Link2 size={10} key={l.url} />, stripProtocol(l.url)]),
      [<MapPin size={10} key="l" />, b.location],
      [<Navigation size={10} key="n" />, b.mobility ?? '']
    ].filter(([, v]) => v) as [ReactNode, string][]
    body = (
      <>
        <header className="pop-hero" data-banner-size="">
          {banner('pop-banner')}
          <div className="pop-id">
            <div className="pop-title">
              <h1 className="pop-name" {...E('field:firstName', 'Modifier le nom')}>
                {b.firstName} {b.lastName}
              </h1>
              {role && (
                <span className="pop-role" {...E('field:headline', 'Modifier le titre')}>
                  {role}
                </span>
              )}
            </div>
            {quote && <p className="pop-quote">« {quote} »</p>}
          </div>
          {photo('pop-photo')}
        </header>
        <div className="pop-body">
          <aside className="pop-side">
            {contacts.length > 0 && (
              <section>
                {head(L.contact)}
                <ul className="pop-contact" {...E('tab:identity', 'Modifier les coordonnées')}>
                  {contacts.map(([icon, v], i) => (
                    <li key={i}>
                      {icon}
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
                {cta}
              </section>
            )}
            {summary && (
              <section>
                {head(r.lang === 'en' ? 'About' : 'Moi')}
                {summary}
              </section>
            )}
            {shown.has('skills') && r.skills.some((g) => g.items.length) && (
              <section {...E('tab:skills', 'Modifier les compétences')}>
                {head(t.skills)}
                {r.skills
                  .filter((g) => g.items.length)
                  .map((g) => (
                    <div className="pop-skill" key={g.id}>
                      {g.name && <h3>{g.name}</h3>}
                      {g.display === 'chips' ? (
                        <ul className="pop-dots">
                          {g.items.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{g.items.join(' - ')}</p>
                      )}
                    </div>
                  ))}
              </section>
            )}
            {langs && (
              <section>
                {head(t.languages)}
                {langs}
              </section>
            )}
            {interests.length > 0 && (
              <section>
                {head(t.interests)}
                <ul className="pop-dots pop-interests">
                  {interests.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
          <main className="pop-main">
            {entries.length > 0 && (
              <section>
                {head(L.path, true)}
                <div className="pop-entries" {...E('tab:experience', 'Modifier le parcours')}>
                  {entries.map((e) => (
                    <div className="pop-entry" key={e.key}>
                      <h3>
                        {e.title}
                        {(e.org || (!e.place && e.sub)) && <em> - {e.org || e.sub}</em>}
                      </h3>
                      {e.bullets.length > 0 && <p className="pop-desc">{endDot(e.bullets.join(', '))}</p>}
                      {e.desc && <p className="pop-desc">{e.desc}</p>}
                      {(e.when || e.place) && <p className="pop-when">{endDot([e.place, e.when].filter(Boolean).join(', '))}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {(education.length > 0 || certs.length > 0) && shown.has('education') && (
              <section>
                {head(t.education, true)}
                <div className="pop-edu" {...E('tab:education', 'Modifier la formation')}>
                  {r.education.map((e) => (
                    <div key={e.id}>
                      <h3>{e.degree}</h3>
                      <p>
                        {[e.school, e.location].filter(Boolean).join(' ')} {years(e.start, e.end, false, r.lang)}
                      </p>
                      {e.details.trim() && <p className="pop-when">{e.details.trim()}</p>}
                    </div>
                  ))}
                  {certs}
                </div>
              </section>
            )}
            {gallery && (
              <section>
                {head(L.gallery, true)}
                {gallery}
              </section>
            )}
          </main>
        </div>
      </>
    )
  } else if (r.templateId === 'brutal') {
    // Brutal : néo-brutalisme, bordures épaisses, ombres décalées, aplats et étiquettes autocollantes.
    body = (
      <>
        <header className="br-hero">
          <div className="br-namecard">
            {b.headline && (
              <span className="br-sticker" {...E('field:headline', 'Modifier le titre')}>
                {b.headline}
              </span>
            )}
            <h1 className="br-name" {...E('field:firstName', 'Modifier le nom')}>
              {b.firstName}
              <br />
              {b.lastName}
            </h1>
          </div>
          <div className="br-photo-wrap">{photo('br-photo')}</div>
        </header>
        <div className="br-strip" {...E('tab:identity', 'Modifier les coordonnées')}>
          {info.map(([k, v]) => (
            <span className="br-chip" key={k}>
              <b>{k}</b>
              {v}
            </span>
          ))}
          {links.map((l) => (
            <span className="br-chip" key={l.label + l.url}>
              <b>{l.label}</b>
              {stripProtocol(l.url)}
            </span>
          ))}
        </div>
        <div className="br-grid">
          <div className="br-col">
            {summary && (
              <section className="br-card br-card-accent">
                <h2 className="br-h">{L.profile}</h2>
                {summary}
                {cta}
              </section>
            )}
            {entries.length > 0 && (
              <section className="br-card">
                <h2 className="br-h">{L.path}</h2>
                <div className="br-entries" {...E('tab:experience', 'Modifier le parcours')}>
                  {entries.map((e) => (
                    <div className="br-entry" key={e.key}>
                      <div className="st-entry-head">
                        <h3>{e.title}</h3>
                        {e.when && <span className="br-when">{e.when}</span>}
                      </div>
                      {entryBody(e)}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
          <div className="br-col">
            {skillBlocks.length > 0 && (
              <section className="br-card">
                <h2 className="br-h">{t.skills}</h2>
                {skillBlocks}
              </section>
            )}
            {(education.length > 0 || certs.length > 0) && (
              <section className="br-card br-card-soft" {...E('tab:education', 'Modifier la formation')}>
                <h2 className="br-h">{t.education}</h2>
                {education}
                {certs}
              </section>
            )}
            {(langs || interests.length > 0) && (
              <section className="br-card">
                <h2 className="br-h">{L.more}</h2>
                {langs}
                {interests.length > 0 && chips(interests)}
              </section>
            )}
          </div>
        </div>
        {gallery && (
          <section className="br-card br-gallery">
            <h2 className="br-h">{L.gallery}</h2>
            {gallery}
          </section>
        )}
      </>
    )
  } else {
    // Vitrine
    let n = 0
    const num = () => String(++n).padStart(2, '0')
    body = (
      <>
        <header className="vt-hero">
          <div className="vt-id">
            <span className="vz-kicker">Portfolio · CV</span>
            <h1 className="vt-name" {...E('field:firstName', 'Modifier le nom')}>
              {b.firstName}
              <br />
              <span>{b.lastName}</span>
            </h1>
            {b.headline && <p className="vt-headline" {...E('field:headline', 'Modifier le titre')}>{b.headline}</p>}
            {cta}
          </div>
          <div className="vt-visual" data-banner-size="">
            {banner('vt-banner')}
            {photo('vt-photo')}
          </div>
        </header>
        <div className="vt-body">
          <aside className="vt-aside">
            <div className="vt-block">
              <div className="vz-label">{L.contact}</div>
              {info.map(([k, v]) => (
                <div className="vz-kv" key={k} {...E('tab:identity', 'Modifier les coordonnées')}>
                  <span>{k}</span>
                  {v}
                </div>
              ))}
              {linkList('vt-links')}
            </div>
            {skillBlocks.length > 0 && <div className="vt-block">{skillBlocks}</div>}
            {(langs || interests.length > 0) && (
              <div className="vt-block">
                {langs && (
                  <>
                    <div className="vz-label">{t.languages}</div>
                    {langs}
                  </>
                )}
                {interests.length > 0 && (
                  <>
                    <div className="vz-label">{t.interests}</div>
                    {chips(interests)}
                  </>
                )}
              </div>
            )}
          </aside>
          <main className="vt-main">
            {summary}
            {entries.length > 0 && (
              <section>
                {heading(num(), L.path)}
                <div className="vt-timeline" {...E('tab:experience', 'Modifier le parcours')}>
                  {entries.map((e) => (
                    <div className="vt-step" key={e.key}>
                      <span className="vz-when">{e.when}</span>
                      <div className="vt-step-body">
                        <h3>{e.title}</h3>
                        {entryBody(e)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {gallery && (
              <section>
                {heading(num(), L.gallery)}
                {gallery}
              </section>
            )}
            {(education.length > 0 || certs.length > 0) && (
              <section>
                {heading(num(), t.education)}
                <div className="vt-edu-grid" {...E('tab:education', 'Modifier la formation')}>
                  {education}
                  {certs}
                </div>
              </section>
            )}
          </main>
        </div>
      </>
    )
  }

  return (
    <article className={`cv cv-visual tpl-${r.templateId}`} style={style} lang={r.lang}>
      {body}
    </article>
  )
}
