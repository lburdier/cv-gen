import { Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Offer, Resume, TailorResult } from '../../../shared/types'
import { analyze } from '../lib/ats'
import { uid } from '../lib/sample'
import { useStore } from '../store'
import { Modal, ScoreRing } from './ui'

type Parts = { headline: boolean; summary: boolean; skills: boolean; exp: Record<string, boolean> }

function applyTailor(r: Resume, t: TailorResult, parts: Parts): Resume {
  const x = structuredClone(r)
  if (parts.headline && t.headline) x.basics.headline = t.headline
  if (parts.summary && t.summary) x.basics.summary = t.summary
  for (const e of t.experiences) {
    const target = x.experiences.find((y) => y.id === e.id)
    if (target && parts.exp[e.id] && e.bullets.length) target.bullets = e.bullets
  }
  if (parts.skills && t.skills.length) x.skills = t.skills.map((g) => ({ id: uid(), name: g.name, items: g.items }))
  return x
}

/** Adaptation IA d'un CV à une offre, avec revue avant/après section par section. */
export function TailorModal({ resume, offer, onClose }: { resume: Resume; offer: Offer; onClose: () => void }) {
  const s = useStore()
  const [result, setResult] = useState<TailorResult | null>(null)
  const [error, setError] = useState('')
  const [parts, setParts] = useState<Parts>({ headline: true, summary: true, skills: true, exp: {} })

  useEffect(() => {
    let alive = true
    window.cvgen.ai
      .tailor(resume, offer)
      .then((r) => {
        if (!alive) return
        setResult(r)
        setParts((p) => ({ ...p, exp: Object.fromEntries(r.experiences.map((e) => [e.id, true])) }))
      })
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  const before = useMemo(() => analyze(resume, offer).score, [resume, offer])
  const preview = useMemo(() => (result ? applyTailor(resume, result, parts) : null), [result, parts, resume])
  const after = useMemo(() => (preview ? analyze(preview, offer).score : null), [preview, offer])

  const finish = (asCopy: boolean) => {
    if (!preview) return
    if (asCopy) {
      const title = `CV — ${offer.title || 'offre'}${offer.company ? ' · ' + offer.company : ''}`
      const created = s.createResume({ from: { ...preview, title, offerId: offer.id } })
      s.log('tailor', `CV adapté : ${title}`)
      s.go({ name: 'editor', id: created.id })
    } else {
      s.updateResume(resume.id, (r) => Object.assign(r, { ...preview, id: r.id, offerId: offer.id }))
      s.log('tailor', `CV adapté : ${resume.title}`)
      s.go({ name: 'editor', id: resume.id })
    }
    s.toast({ kind: 'success', title: 'CV adapté à l’offre', detail: `Score ATS : ${before} → ${after}` })
    onClose()
  }

  const Block = ({ on, onToggle, title, children }: { on: boolean; onToggle: () => void; title: string; children: ReactNode }) => (
    <div className={`diff-block ${on ? '' : 'off'}`}>
      <div className="row">
        <h4>{title}</h4>
        <label className="check">
          <input type="checkbox" checked={on} onChange={onToggle} /> Appliquer
        </label>
      </div>
      {children}
    </div>
  )

  return (
    <Modal
      size="xl"
      title={`Adapter « ${resume.title} » à l’offre`}
      icon={<Sparkles size={16} />}
      onClose={onClose}
      footer={
        result && (
          <>
            <span className="muted" style={{ marginRight: 'auto', fontSize: 13 }}>
              Relisez chaque proposition : l’IA reformule, elle ne doit rien inventer.
            </span>
            <button className="btn btn-soft" onClick={() => finish(false)}>
              Remplacer ce CV
            </button>
            <button className="btn btn-ink" onClick={() => finish(true)}>
              Créer une copie adaptée
            </button>
          </>
        )
      }
    >
      {!result && !error && (
        <div className="empty" style={{ padding: 60 }}>
          <Loader2 size={28} className="spin" style={{ color: 'var(--accent)' }} />
          <div style={{ fontWeight: 600, color: 'var(--text)', marginTop: 8 }}>L’IA adapte votre CV à « {offer.title} »…</div>
          <div>Réécriture du profil, des réalisations et des compétences. Comptez 20 à 60 secondes.</div>
        </div>
      )}
      {error && <div className="callout warn">{error}</div>}
      {result && preview && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 24, background: 'var(--bg-sunk)', borderRadius: 16, padding: 16 }}>
            <ScoreRing score={before} size={74} stroke={7} label="avant" />
            <span style={{ fontSize: 22 }} className="muted">
              →
            </span>
            <ScoreRing score={after ?? 0} size={74} stroke={7} label="après" />
            <div style={{ flex: 1 }}>
              {result.addedKeywords.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div className="label" style={{ marginBottom: 4 }}>
                    Mots-clés intégrés
                  </div>
                  <div className="chips" style={{ gap: 5 }}>
                    {result.addedKeywords.map((k) => (
                      <span key={k} className="tag ok">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.missingKeywords.length > 0 && (
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>
                    Toujours absents (à ajouter seulement si vous les maîtrisez)
                  </div>
                  <div className="chips" style={{ gap: 5 }}>
                    {result.missingKeywords.map((k) => (
                      <span key={k} className="tag miss">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {result.notes.length > 0 && (
            <div className="callout">
              <Sparkles size={16} />
              <ul className="clean" style={{ color: 'var(--text)' }}>
                {result.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          <Block title="Titre" on={parts.headline} onToggle={() => setParts({ ...parts, headline: !parts.headline })}>
            <div className="diff">
              <div className="before">{resume.basics.headline || <em>vide</em>}</div>
              <div className="after">{result.headline}</div>
            </div>
          </Block>
          <Block title="Profil" on={parts.summary} onToggle={() => setParts({ ...parts, summary: !parts.summary })}>
            <div className="diff">
              <div className="before">{resume.basics.summary || <em>vide</em>}</div>
              <div className="after">{result.summary}</div>
            </div>
          </Block>
          {result.experiences.map((e) => {
            const orig = resume.experiences.find((x) => x.id === e.id)
            if (!orig) return null
            const on = parts.exp[e.id] ?? true
            return (
              <Block key={e.id} title={`${orig.role} — ${orig.company}`} on={on} onToggle={() => setParts({ ...parts, exp: { ...parts.exp, [e.id]: !on } })}>
                <div className="diff">
                  <div className="before">
                    <ul>
                      {orig.bullets.filter((b) => b.trim()).map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="after">
                    <ul>
                      {e.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Block>
            )
          })}
          <Block title="Compétences" on={parts.skills} onToggle={() => setParts({ ...parts, skills: !parts.skills })}>
            <div className="diff">
              <div className="before">
                {resume.skills.map((g) => (
                  <div key={g.id}>
                    <strong>{g.name}</strong> {g.items.join(', ')}
                  </div>
                ))}
              </div>
              <div className="after">
                {result.skills.map((g, i) => (
                  <div key={i}>
                    <strong>{g.name}</strong> {g.items.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          </Block>
        </div>
      )}
    </Modal>
  )
}
