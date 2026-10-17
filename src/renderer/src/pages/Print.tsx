import { useEffect, useState } from 'react'
import { contactParts, fullName } from '../../../shared/format'
import { placeDate } from '../../../shared/letter'
import type { CoverLetter, Resume } from '../../../shared/types'
import { Cv } from '../templates/Cv'

type Job = { kind: 'resume'; resume: Resume } | { kind: 'letter'; letter: CoverLetter; resume?: Resume }

/** Page rendue dans une fenêtre cachée, uniquement pour générer le PDF. */
export default function PrintPage({ token }: { token: string }) {
  const [job, setJob] = useState<Job | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    window.cvgen.getPrintJob(token).then((j) => {
      if (!j) return
      document.title = j.kind === 'resume' ? `CV · ${fullName(j.resume)}` : j.letter.title
      setJob(j)
    })
  }, [token])

  useEffect(() => {
    if (!job) return
    // On attend polices et images pour qu'elles soient intégrées au PDF.
    const images = [...document.images].map((img) => img.decode().catch(() => undefined))
    Promise.all([document.fonts.ready, ...images]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => window.cvgen.printReady(token))))
  }, [job, token])

  if (!job) return null
  return (
    <div className="print-root">
      {job.kind === 'resume' ? (
        <Cv resume={job.resume} />
      ) : (
        <div className="letter-print">
          {job.resume && (
            <div className="from">
              <strong>{fullName(job.resume)}</strong>
              <span>{contactParts(job.resume).join('  |  ')}</span>
            </div>
          )}
          {job.letter.recipient?.trim() && <div className="to">{job.letter.recipient.trim()}</div>}
          {(job.letter.place || job.letter.date) && <div className="when">{placeDate(job.letter.place ?? '', job.letter.date ?? '', job.letter.options?.lang ?? 'fr')}</div>}
          {job.letter.subject?.trim() && (
            <div className="subject">
              {(job.letter.options?.lang ?? 'fr') === 'en' ? 'Subject: ' : 'Objet : '}
              {job.letter.subject.trim()}
            </div>
          )}
          {job.letter.body.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p.trim()}</p>
          ))}
        </div>
      )}
    </div>
  )
}
