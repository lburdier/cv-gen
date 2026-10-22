import { Fragment, useContext, type CSSProperties } from 'react'
import { SkillIcon, groupIcon } from './skillIcons'
import { atsSections, contactParts, coursesText, displayResume, formatMonth, formatRange, sectionHasContent, sectionTitles, stripProtocol } from '../../../shared/format'
import type { Resume, SectionKey } from '../../../shared/types'
import { CanvasContext } from './canvasContext'
import { onColor } from './color'
import { CvCustom } from './CvCustom'
import { usesDesignEngine } from './designCatalog'
import { T } from './Editable'
import { Pitch } from './Pitch'
import { CvVisual } from './CvVisual'
import { CvReplica, isReplica } from './CvReplica'
import { useOnePage } from './onePage'
import { EditableContext, usePlaceholders } from './previewContext'
import { FONTS, isVisual } from './registry'

/**
 * Rendu unique pour tous les modèles : HTML sémantique en une colonne.
 * Le modèle choisi ne change que des classes CSS, jamais l'ordre de lecture.
 * En mode « toile », chaque texte s'édite sur place ; le rendu exporté reste identique.
 */
export function Cv({ resume }: { resume: Resume }) {
  // Tous les modèles tiennent sur une seule page (réduction automatique si besoin).
  const fit = useOnePage()
  // Langues : sans la langue du CV, niveaux CECRL (la toile garde les données brutes pour l'édition).
  const canvas = useContext(CanvasContext)
  return (
    <div className="cv-fit" ref={fit}>
      <CvLayout resume={canvas ? resume : displayResume(resume)} />
    </div>
  )
}

function CvLayout({ resume }: { resume: Resume }) {
  // Les modèles visuels ont leur propre mise en page (bandeau, colonnes, images).
  // « Sur mesure » et les modèles du studio : moteur de design paramétrable.
  if (usesDesignEngine(resume.templateId)) return <CvCustom resume={resume} />
  if (isReplica(resume.templateId)) return <CvReplica resume={resume} />
  if (isVisual(resume.templateId)) return <CvVisual resume={resume} />
  return <CvAts resume={resume} />
}

const MARGINS = {
  narrow: { '--cv-mx': '40px', '--cv-mx-print': '11mm' },
  normal: { '--cv-mx': '60px', '--cv-mx-print': '16mm' },
  wide: { '--cv-mx': '78px', '--cv-mx-print': '21mm' }
}

function CvAts({ resume: r }: { resume: Resume }) {
  const ph = usePlaceholders()
  const canvas = useContext(CanvasContext)
  const t = sectionTitles(r)
  const font = FONTS.find((f) => f.id === r.font)
  // Les modèles Classique et Brut imposent leur police sauf si l'utilisateur en choisit une autre.
  const style = {
    '--cv-accent': r.accent,
    ...(r.accent2 ? { '--cv-accent-2': r.accent2, '--cv-on-accent-2': onColor(r.accent2) } : {}),
    ...(font ? { '--cv-font': font.stack } : {}),
    ...(r.style?.size ? { '--cv-size': `${Math.min(11.5, Math.max(9, r.style.size))}pt` } : {}),
    ...(r.style?.leading ? { lineHeight: Math.min(1.6, Math.max(1.2, r.style.leading)) } : {}),
    ...(r.style?.margin ? MARGINS[r.style.margin] : {})
  } as CSSProperties
  const contact = contactParts(r)
  const pills = r.templateId === 'galerie'
  const editable = useContext(EditableContext)
  const E = (edit: string, label: string) => (editable ? { 'data-edit': edit, 'data-edit-label': label } : {})
  // Toile : repères de sélection et poignées de déplacement (jamais dans l'export).
  const entry = (path: string) => (canvas ? { 'data-entry': path } : {})
  const grip = (drag: string) => (canvas ? <span className="cv-grip" draggable data-drag={drag} title="Glisser pour déplacer" aria-hidden /> : null)
  const dates = (path: string) => (canvas ? { 'data-dates': path, title: 'Modifier les dates' } : {})
  const bullets = (list: string[]) => (canvas ? list.map((b, i) => [b, i] as const) : list.map((b, i) => [b, i] as const).filter(([b]) => b.trim()))
  // Onglet du formulaire correspondant à chaque section.
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

  const section = (k: SectionKey) => {
    switch (k) {
      case 'summary':
        return (
          <p className="cv-text">
            <T p="basics.summary" v={canvas ? r.basics.summary : r.basics.summary.trim()} ph="Votre profil en 3 à 4 phrases : métier, années d’expérience, spécialités, objectif." multi />
          </p>
        )
      case 'experience':
        return r.experiences.map((e, i) => (
          <div className="cv-item" key={e.id} {...entry(`experiences.${i}`)}>
            {grip(`experiences.${i}`)}
            <div className="cv-row">
              <h3>
                <T p={`experiences.${i}.role`} v={e.role} ph="Intitulé du poste" />
              </h3>
              <span className="cv-date" {...dates(`experiences.${i}`)}>
                {formatRange(e.start, e.end, e.current, r.lang) || (canvas ? 'Dates' : '')}
              </span>
            </div>
            {(e.company || e.location || canvas) && (
              <div className="cv-sub">
                <span className="company">
                  <T p={`experiences.${i}.company`} v={e.company} ph="Entreprise" />
                </span>
                {(e.company && e.location) || canvas ? ' · ' : ''}
                <T p={`experiences.${i}.location`} v={e.location} ph="Ville" />
              </div>
            )}
            {(canvas || e.bullets.some((b) => b.trim())) && (
              <ul className="cv-bullets">
                {bullets(e.bullets).map(([b, j]) => (
                  <li key={j}>
                    <T p={`experiences.${i}.bullets.${j}`} v={canvas ? b : b.trim()} ph="Verbe d’action + réalisation + résultat chiffré" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      case 'education':
        return r.education.map((e, i) => (
          <div className="cv-item" key={e.id} {...entry(`education.${i}`)}>
            {grip(`education.${i}`)}
            <div className="cv-row">
              <h3>
                <T p={`education.${i}.degree`} v={e.degree} ph="Diplôme" />
              </h3>
              <span className="cv-date" {...dates(`education.${i}`)}>
                {formatRange(e.start, e.end, false, r.lang) || (canvas ? 'Dates' : '')}
              </span>
            </div>
            {(e.school || e.location || canvas) && (
              <div className="cv-sub">
                <span className="company">
                  <T p={`education.${i}.school`} v={e.school} ph="École" />
                </span>
                {(e.school && e.location) || canvas ? ' · ' : ''}
                <T p={`education.${i}.location`} v={e.location} ph="Ville" />
              </div>
            )}
            {(e.details.trim() || canvas) && (
              <p className="cv-detail cv-text">
                <T p={`education.${i}.details`} v={canvas ? e.details : e.details.trim()} ph="Mention, spécialité (facultatif)" multi />
              </p>
            )}
            {coursesText(e, r.lang) && <p className="cv-detail cv-courses">{coursesText(e, r.lang)}</p>}
          </div>
        ))
      case 'skills':
        return r.skills
          .map((g, i) => [g, i] as const)
          .filter(([g]) => canvas || g.items.length)
          .map(([g, i]) => (
            // Les éléments restent séparés par un vrai caractère : sans lui, l'extraction
            // fusionne « Tailwind CSS » et « Storybook » en un seul terme.
            <p className="cv-skill-line" key={g.id} {...entry(`skills.${i}`)}>
              {grip(`skills.${i}`)}
              {(g.name || canvas) &&
                (pills ? (
                  <span className="cv-pill">
                    <T p={`skills.${i}.name`} v={g.name} ph="Catégorie" />
                  </span>
                ) : (
                  <strong>
                    <T p={`skills.${i}.name`} v={g.name} ph="Catégorie" /> :{' '}
                  </strong>
                ))}
              {pills && (g.name || canvas) ? ' ' : ''}
              {(g.items.length ? g.items : canvas ? [''] : []).map((s, j) => (
                <Fragment key={j}>
                  {j > 0 && <span className="dot">{pills ? '/' : '·'}</span>}
                  <SkillIcon src={groupIcon(g, s)} />
                  <T p={`skills.${i}.items.${j}`} v={s} ph="Compétence" />
                </Fragment>
              ))}
            </p>
          ))
      case 'projects':
        return r.projects.map((p, i) => (
          <div className="cv-item" key={p.id} {...entry(`projects.${i}`)}>
            {grip(`projects.${i}`)}
            <div className="cv-row">
              <h3>
                <T p={`projects.${i}.name`} v={p.name} ph="Nom du projet" />
              </h3>
              {(p.link || canvas) && (
                <span className="cv-date">
                  <T p={`projects.${i}.link`} v={canvas ? p.link : stripProtocol(p.link)} ph="lien (facultatif)" />
                </span>
              )}
            </div>
            {(p.description || canvas) && (
              <p className="cv-detail cv-text">
                <T p={`projects.${i}.description`} v={p.description} ph="Description et résultat" multi />
              </p>
            )}
          </div>
        ))
      case 'certifications':
        return r.certifications.map((c, i) => (
          <div className="cv-item" key={c.id} {...entry(`certifications.${i}`)}>
            {grip(`certifications.${i}`)}
            <div className="cv-row">
              <h3>
                <T p={`certifications.${i}.name`} v={c.name} ph="Certification" />
              </h3>
              <span className="cv-date" {...dates(`certifications.${i}`)}>
                {formatMonth(c.date) || (canvas ? 'Date' : '')}
              </span>
            </div>
            {(c.issuer || canvas) && (
              <div className="cv-sub">
                <T p={`certifications.${i}.issuer`} v={c.issuer} ph="Organisme" />
              </div>
            )}
          </div>
        ))
      case 'languages':
        return (
          <p>
            {r.languages.map((l, i) => (
              <Fragment key={l.id}>
                {i > 0 && <span className="dot"> · </span>}
                <span {...entry(`languages.${i}`)} className={canvas ? 'cv-inline-entry' : undefined}>
                  <strong style={{ fontWeight: 600 }}>
                    <T p={`languages.${i}.name`} v={l.name} ph="Langue" />
                  </strong>
                  {l.level || canvas ? ' (' : ''}
                  {(l.level || canvas) && <T p={`languages.${i}.level`} v={l.level} ph="niveau" />}
                  {l.level || canvas ? ')' : ''}
                </span>
              </Fragment>
            ))}
          </p>
        )
      case 'interests':
        return (
          <p>
            <T p="interests" v={canvas ? r.interests : r.interests.trim()} ph="Sport, bénévolat, passions…" multi />
          </p>
        )
      case 'gallery':
        return (
          <p>
            {(r.gallery ?? [])
              .map((g) => g.caption.trim())
              .filter(Boolean)
              .join(' · ')}
          </p>
        )
    }
  }

  // Toile : une section vide reste visible tant qu'elle n'est pas masquée (profil à rédiger…).
  const keys = canvas ? r.sectionOrder.filter((k) => !r.hidden.includes(k) && (k === 'summary' || sectionHasContent(r, k)) && k !== 'gallery') : atsSections(r)
  const b = r.basics
  const contactFields: [string, string, string][] = [
    ['email', b.email, 'e-mail'],
    ['phone', b.phone, 'téléphone'],
    ['location', b.location, 'ville'],
    ['linkedin', b.linkedin, 'linkedin.com/in/…'],
    ['github', b.github, 'github.com/…'],
    ['website', b.website, 'site web']
  ]

  return (
    <article className={`cv tpl-${r.templateId} density-${r.density}`} style={style} lang={r.lang}>
      <header className="cv-header" {...(canvas ? { 'data-section': 'header' } : {})}>
        <div>
          <h1 className="cv-name" {...E('field:firstName', 'Modifier le nom')}>
            <T p="basics.firstName" v={b.firstName} show={ph.first(b.firstName)} ph="Prénom" />{' '}
            <span className="last">
              <T p="basics.lastName" v={b.lastName} show={ph.last(b.lastName)} ph="Nom" />
            </span>
          </h1>
          {(ph.headline(b.headline) || canvas) && (
            <p className="cv-headline" {...E('field:headline', 'Modifier le titre')}>
              <T p="basics.headline" v={b.headline} show={ph.headline(b.headline)} ph="Titre du poste visé (reprenez l’intitulé de l’offre)" />
            </p>
          )}
          <Pitch r={r} />
        </div>
        {canvas ? (
          <p className="cv-contact">
            {contactFields
              .filter(([k, v]) => v || k === 'email' || k === 'phone')
              .map(([k, v, label], i) => (
                <Fragment key={k}>
                  {i > 0 && <span className="sep">|</span>}
                  <T p={`basics.${k}`} v={v} ph={label} />
                </Fragment>
              ))}
          </p>
        ) : (
          contact.length > 0 && (
            <p className="cv-contact" {...E('tab:identity', 'Modifier les coordonnées')}>
              {contact.map((c, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="sep">|</span>}
                  {c}
                </Fragment>
              ))}
            </p>
          )
        )}
      </header>
      {keys.map((k) => (
        <section className={`cv-section cv-s-${k}`} key={k} {...E(TAB[k], `Modifier « ${t[k]} »`)} {...(canvas ? { 'data-section': k } : {})}>
          {grip(`section:${k}`)}
          <h2 className="cv-h">{t[k]}</h2>
          {section(k)}
        </section>
      ))}
    </article>
  )
}
