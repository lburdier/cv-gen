import { useContext, type ClipboardEvent, type ReactNode } from 'react'
import { CanvasContext } from './canvasContext'

/** Collage en texte brut : la toile n'accepte ni mise en forme ni images (règle ATS). */
export function plainPaste(e: ClipboardEvent<HTMLElement>) {
  e.preventDefault()
  const text = e.clipboardData.getData('text/plain')
  document.execCommand('insertText', false, text)
}

/**
 * Texte du CV : simple texte à l'export ; en mode toile, zone éditable liée à un champ.
 * La clé suit la valeur enregistrée : après validation, la zone repart du texte enregistré.
 */
export function T({ p, v, show, ph, multi }: { p: string; v: string; show?: ReactNode; ph?: string; multi?: boolean }) {
  const c = useContext(CanvasContext)
  if (!c) return <>{show ?? v}</>
  return (
    <span
      key={v}
      className={`cv-ed ${multi ? 'multi' : ''}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-path={p}
      data-ph={ph}
      onBlur={(e) => c.commit(p, e.currentTarget.innerText)}
      onKeyDown={(e) => c.key(p, e)}
      onPaste={plainPaste}
    >
      {v}
    </span>
  )
}

/** Repères de la toile (sélection, poignées, dates) ; rien à l'export. */
export function useCanvasMarks() {
  const canvas = useContext(CanvasContext)
  return {
    canvas,
    entry: (path: string) => (canvas ? { 'data-entry': path } : {}),
    sectionMark: (key: string) => (canvas ? { 'data-section': key } : {}),
    grip: (drag: string) => (canvas ? <span className="cv-grip" draggable data-drag={drag} title="Glisser pour déplacer" aria-hidden /> : null),
    dates: (path: string) => (canvas ? { 'data-dates': path, title: 'Modifier les dates' } : {})
  }
}
