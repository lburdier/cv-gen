import { useEffect, useState } from 'react'
import { Mark } from './Shell'

/**
 * Animation d'ouverture : les points du logo apparaissent en vague, le nom « CV Gen » se révèle,
 * puis l'écran s'efface. Elle dure au minimum le temps de l'animation et au maximum le
 * temps du chargement des données. Respecte « réduire les animations » du système.
 */
export function IntroSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [minDone, setMinDone] = useState(Boolean(reduce))
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (reduce) return
    const t = setTimeout(() => setMinDone(true), 1450)
    return () => clearTimeout(t)
  }, [reduce])

  useEffect(() => {
    if (!ready || !minDone) return
    setLeaving(true)
    const t = setTimeout(onDone, reduce ? 0 : 420)
    return () => clearTimeout(t)
  }, [ready, minDone, onDone, reduce])

  return (
    <div className={`intro ${leaving ? 'leaving' : ''}`} role="status" aria-label="Chargement de CV GEN">
      <div className="intro-logo">
        <Mark size={58} animated />
        <div className="intro-word">
          <span className="intro-cv">CV</span> <em className="intro-gen">Gen</em>
        </div>
        <div className="intro-tag">Des CV qui passent les robots et plaisent aux recruteurs</div>
      </div>
    </div>
  )
}
