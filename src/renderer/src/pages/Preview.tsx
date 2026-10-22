import { useEffect } from 'react'
import { presetAs, sampleResume, type PreviewGender } from '../lib/sample'
import { getTemplate } from '../templates/registry'
import { Cv } from '../templates/Cv'
import { measureReadability, type ScanReport } from '../lib/readability'
import { pitchParts } from '../../../shared/format'

/**
 * Rendu d'un modèle avec le CV d'exemple, utilisé par scripts/gen-previews.cjs.
 * Paramètres facultatifs (contrôles de mise en page) : `?p=<preset>&g=f|m` pour un autre contenu,
 * `&icons=1` pour activer les icônes de logiciels sur tous les groupes de compétences, `&isize=1.6` pour leur taille.
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
  const base = preset
    ? { ...presetAs(preset, (q.get('g') as PreviewGender) || 'all'), templateId: t.id, accent: t.accent, ...(t.accent2 ? { accent2: t.accent2 } : {}), font: t.font }
    : sampleResume(templateId)
  const size = Number(q.get('isize')) || undefined
  const resume =
    q.get('icons') === '1' || size ? { ...base, skills: base.skills.map((g) => ({ ...g, ...(q.get('icons') === '1' ? { showIcons: true } : {}), ...(size ? { iconSize: size } : {}) })) } : base
  // Mesure « Lecture 6 s » (scripts/gen-scores.cjs) : lue sur le rendu réel du modèle.
  ;(window as unknown as { cvScan?: () => ScanReport }).cvScan = () =>
    measureReadability(document.querySelector('.cv') as HTMLElement, { roles: resume.experiences.map((e) => e.role), pitch: pitchParts(resume).length > 0 })
  return (
    <div className="preview-root">
      <div className="paper" style={{ boxShadow: 'none', borderRadius: 0 }}>
        <Cv resume={resume} />
      </div>
    </div>
  )
}
