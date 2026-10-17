import { memo, useEffect, useRef, useState } from 'react'
import type { Resume } from '../../../shared/types'
import { CvPreview } from '../templates/CvPreview'

/**
 * Miniature fidèle d'un CV : le vrai rendu A4 (794 px) réduit à la largeur du conteneur.
 * Le rendu n'est calculé qu'une fois la miniature visible à l'écran.
 */
export const PaperThumb = memo(function PaperThumb({ resume, rounded }: { resume: Resume; rounded?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 794))
    ro.observe(el)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px' }
    )
    io.observe(el)
    return () => {
      ro.disconnect()
      io.disconnect()
    }
  }, [])
  return (
    <div className={`paper-thumb ${rounded ? 'rounded' : ''}`} ref={ref} aria-hidden>
      {visible && (
        <div className="paper-scale" style={{ transform: `scale(${scale})` }}>
          <CvPreview resume={resume} />
        </div>
      )}
    </div>
  )
})
