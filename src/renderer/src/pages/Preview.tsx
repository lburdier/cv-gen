import { useEffect } from 'react'
import { presetAs, sampleResume, type PreviewGender } from '../lib/sample'
import { getTemplate } from '../templates/registry'
import { Cv } from '../templates/Cv'

/**
 * Rendu d'un modèle avec le CV d'exemple, utilisé par scripts/gen-previews.cjs.
 * Paramètres facultatifs (contrôles de mise en page) : `?p=<preset>&g=f|m` pour un autre contenu.
 */
export default function PreviewPage({ templateId }: { templateId: string }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    const images = [...document.images].map((img) => img.decode().catch(() => undefined))
    Promise.all([document.fonts.ready, ...images]).then(() => {
      document.body.dataset.ready = '1'
    })
  }, [])
  const q = new URLSearchParams(location.search)
  const preset = q.get('p')
  const t = getTemplate(templateId)
  const resume = preset
    ? { ...presetAs(preset, (q.get('g') as PreviewGender) || 'all'), templateId: t.id, accent: t.accent, ...(t.accent2 ? { accent2: t.accent2 } : {}), font: t.font }
    : sampleResume(templateId)
  return (
    <div className="preview-root">
      <div className="paper" style={{ boxShadow: 'none', borderRadius: 0 }}>
        <Cv resume={resume} />
      </div>
    </div>
  )
}
