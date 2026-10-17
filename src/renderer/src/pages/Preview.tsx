import { useEffect } from 'react'
import { sampleResume } from '../lib/sample'
import { Cv } from '../templates/Cv'

/** Rendu d'un modèle avec le CV d'exemple, utilisé par scripts/gen-previews.cjs. */
export default function PreviewPage({ templateId }: { templateId: string }) {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    const images = [...document.images].map((img) => img.decode().catch(() => undefined))
    Promise.all([document.fonts.ready, ...images]).then(() => {
      document.body.dataset.ready = '1'
    })
  }, [])
  return (
    <div className="preview-root">
      <div className="paper" style={{ boxShadow: 'none', borderRadius: 0 }}>
        <Cv resume={sampleResume(templateId)} />
      </div>
    </div>
  )
}
