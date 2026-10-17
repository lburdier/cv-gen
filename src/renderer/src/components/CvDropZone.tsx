import { useEffect, useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { actions } from '../lib/actions'
import { useStore } from '../store'

const ACCEPT = /\.(pdf|docx|txt|md)$/i
// Pages qui gèrent elles-mêmes le dépôt de fichiers (score ATS, image, couleurs, éditeur…) : exclues.
const PAGES = new Set(['dashboard', 'resumes'])

const hasFile = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files')

/** Glisser-déposer un CV (PDF, Word, texte) sur l'accueil ou « Mes CV » pour l'importer. */
export function CvDropZone() {
  const route = useStore((s) => s.route.name)
  const busy = useStore((s) => s.busy)
  const [over, setOver] = useState(false)
  const depth = useRef(0)
  const active = PAGES.has(route) && !busy

  useEffect(() => {
    if (!active) {
      setOver(false)
      depth.current = 0
      return
    }
    const enter = (e: DragEvent) => {
      if (!hasFile(e) || document.querySelector('.overlay')) return
      depth.current++
      setOver(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFile(e)) return
      depth.current = Math.max(0, depth.current - 1)
      if (!depth.current) setOver(false)
    }
    const overFn = (e: DragEvent) => {
      if (!hasFile(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const drop = async (e: DragEvent) => {
      if (!hasFile(e)) return
      e.preventDefault()
      depth.current = 0
      setOver(false)
      const f = e.dataTransfer?.files?.[0]
      if (!f) return
      const s = useStore.getState()
      if (!ACCEPT.test(f.name)) return s.toast({ kind: 'error', title: 'Format non pris en charge', detail: 'Déposez un CV en PDF, Word (.docx) ou texte.' })
      if (f.size > 25 * 1024 * 1024) return s.toast({ kind: 'error', title: 'Fichier trop lourd', detail: '25 Mo maximum.' })
      await actions.importResume({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', overFn)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', overFn)
      window.removeEventListener('drop', drop)
    }
  }, [active])

  if (!over) return null
  return (
    <div className="cv-drop" aria-hidden>
      <div className="cv-drop-card">
        <FileUp size={30} />
        <strong>Déposez votre CV pour l’importer</strong>
        <span>PDF, Word ou texte : il sera lu et rangé dans les bonnes rubriques.</span>
      </div>
    </div>
  )
}
