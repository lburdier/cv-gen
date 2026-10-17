import { useMemo } from 'react'
import type { Resume } from '../../../shared/types'
import { isEmptyResume, sampleResume } from '../lib/sample'
import { Cv } from './Cv'
import { EditableContext, PreviewContext } from './previewContext'

/**
 * Aperçu à l'écran (éditeur, miniatures). Un CV encore vide affiche le modèle en filigrane,
 * rempli avec l'exemple, pour qu'on voie le design au lieu d'une page blanche.
 * Les exports utilisent toujours <Cv> directement, sans filigrane.
 */
export function CvPreview({ resume, editable = false }: { resume: Resume; editable?: boolean }) {
  const empty = isEmptyResume(resume)
  const shown = useMemo(
    () =>
      empty
        ? {
            ...sampleResume(resume.templateId),
            templateId: resume.templateId,
            accent: resume.accent,
            font: resume.font,
            lang: resume.lang,
            density: resume.density
          }
        : resume,
    [empty, resume]
  )
  return (
    <PreviewContext.Provider value={true}>
      <EditableContext.Provider value={editable}>
      <div className={empty ? 'cv-ghost' : undefined}>
        <Cv resume={shown} />
        {empty && <div className="ghost-label">Exemple : remplissez le formulaire, votre contenu remplacera ce texte</div>}
      </div>
      </EditableContext.Provider>
    </PreviewContext.Provider>
  )
}
