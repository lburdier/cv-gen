import { useState } from 'react'
import { Check } from 'lucide-react'
import { TOURS, resetTours, seenTours, setToursAuto, toursAuto } from '../lib/tours'
import { useStore } from '../store'
import { launchTour } from './Tour'

/** Paramètres › Tutoriels : relancer une visite, tout revoir, lancement automatique. */
export function ToursSettings() {
  const hasResume = useStore((s) => s.data.resumes.length > 0)
  const toast = useStore((s) => s.toast)
  const [seen, setSeen] = useState(() => seenTours())
  const [auto, setAuto] = useState(() => toursAuto())

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="tours-list">
        {TOURS.map((t) => {
          const needsCv = (t.id === 'editor' || t.id === 'canvas') && !hasResume
          return (
            <button key={t.id} disabled={needsCv} onClick={() => launchTour(t.id)} title={needsCv ? 'Créez d’abord un CV' : `Lancer le tutoriel « ${t.name} »`}>
              <b>
                {t.name}
                {seen.has(t.id) && (
                  <span className="seen">
                    <Check size={11} style={{ verticalAlign: -1 }} /> vu
                  </span>
                )}
              </b>
              <small>{needsCv ? 'Créez d’abord un CV' : t.summary}</small>
            </button>
          )
        })}
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <label className="check">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => {
              setToursAuto(e.target.checked)
              setAuto(e.target.checked)
            }}
          />
          <span>Afficher le tutoriel à la première visite de chaque page</span>
        </label>
        <button
          className="btn btn-outline btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            resetTours()
            setSeen(new Set())
            toast({ kind: 'success', title: 'Tutoriels réactivés', detail: 'Ils s’afficheront de nouveau à la première visite de chaque page.' })
          }}
        >
          Revoir tous les tutoriels
        </button>
      </div>
    </div>
  )
}
