import { Fragment, useContext } from 'react'
import { pitchParts } from '../../../shared/format'
import type { Resume } from '../../../shared/types'
import { EditableContext } from './previewContext'

/**
 * Ligne de candidature, juste sous le titre : ce que la personne recherche (stage, alternance, poste)
 * puis où elle est mobile. Le recruteur sait en un coup d'œil qui postule, à quoi et où.
 */
export function Pitch({ r, className = '' }: { r: Resume; className?: string }) {
  const editable = useContext(EditableContext)
  const parts = pitchParts(r)
  if (!parts.length) return null
  const main = Boolean(r.basics.target?.trim())
  return (
    <p className={`cv-pitch ${className}`} {...(editable ? { 'data-edit': 'field:target', 'data-edit-label': 'Modifier la candidature' } : {})}>
      {parts.map((x, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="sep">·</span>}
          <span className={i === 0 && main ? 'cv-pitch-main' : 'cv-pitch-more'}>{x}</span>
        </Fragment>
      ))}
    </p>
  )
}
