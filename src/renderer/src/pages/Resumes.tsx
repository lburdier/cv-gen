import { Copy, Download, FileText, FileUp, MoreHorizontal, Plus, Target, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PaperThumb } from '../components/PaperThumb'
import { Dropdown, ScorePill, timeAgo } from '../components/ui'
import { analyze } from '../lib/ats'
import { actions } from '../lib/actions'
import { isEmptyResume } from '../lib/sample'
import { useStore } from '../store'
import { getTemplate } from '../templates/registry'

const FILTERS = ['Tous', 'Adaptés à une offre', 'Génériques'] as const

export default function Resumes() {
  const s = useStore()
  const { resumes, offers } = s.data
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Tous')
  const [sort, setSort] = useState<'recent' | 'score'>('recent')

  const rows = useMemo(() => {
    const list = resumes
      .filter((r) => (filter === 'Tous' ? true : filter === 'Génériques' ? !r.offerId : Boolean(r.offerId)))
      .map((r) => ({ r, score: analyze(r, offers.find((o) => o.id === r.offerId)).score }))
    return sort === 'score' ? list.sort((a, b) => b.score - a.score) : list.sort((a, b) => b.r.updatedAt - a.r.updatedAt)
  }, [resumes, offers, filter, sort])

  const remove = (id: string) => actions.deleteResume(id)
  const emptyCount = resumes.filter(isEmptyResume).length

  return (
    <div className="page">
      <div className="hero">
        <div className="mono-label">
          mes cv
        </div>
        <h1>
          Vos CV, prêts à passer <em>tous les filtres</em>.
        </h1>
        <p>Chaque CV est noté en continu sur sa structure, son contenu et sa correspondance avec l’offre visée.</p>
      </div>

      <div className="row" style={{ marginBottom: 22 }}>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="seg" style={{ marginLeft: 'auto' }}>
          <button className={sort === 'recent' ? 'on' : ''} onClick={() => setSort('recent')}>
            Récents
          </button>
          <button className={sort === 'score' ? 'on' : ''} onClick={() => setSort('score')}>
            Meilleur score
          </button>
        </div>
        {emptyCount > 0 && (
          <button className="btn btn-ghost" onClick={() => actions.deleteEmptyResumes()} title="Supprime les CV dans lesquels rien n’a été saisi">
            <Trash2 size={16} /> Supprimer les CV vides ({emptyCount})
          </button>
        )}
        <button className="btn btn-soft" onClick={() => actions.importResume()}>
          <FileUp size={16} /> Importer
        </button>
      </div>

      <div className="gallery">
        <button className="shot new-shot" onClick={() => actions.newResume()}>
          <div className="shot-frame">
            <div>
              <div className="plus-big">
                <Plus size={22} />
              </div>
              <strong>Nouveau CV</strong>
              <div className="muted" style={{ fontSize: 12.5 }}>
                Ctrl N
              </div>
            </div>
          </div>
          <div className="shot-meta">
            <div>
              <strong>Page blanche</strong>
              <span>ou partez d’un modèle</span>
            </div>
          </div>
        </button>

        {rows.map(({ r, score }) => {
          const offer = offers.find((o) => o.id === r.offerId)
          return (
            <div key={r.id} className="shot" role="button" tabIndex={0} onClick={() => s.go({ name: 'editor', id: r.id })} onKeyDown={(e) => e.key === 'Enter' && s.go({ name: 'editor', id: r.id })}>
              <div className="shot-frame">
                <PaperThumb resume={r} />
                <div className="shot-score">
                  <ScorePill score={score} />
                </div>
                <div className="shot-overlay" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn" title="Exporter en PDF" onClick={() => actions.exportResume(r.id, 'pdf')}>
                    <Download size={16} />
                  </button>
                  <button className="icon-btn danger" title="Supprimer ce CV" onClick={() => remove(r.id)}>
                    <Trash2 size={16} />
                  </button>
                  <Dropdown
                    align="right"
                    trigger={(toggle) => (
                      <button className="icon-btn" title="Plus d’actions" onClick={toggle}>
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                  >
                    {(close) => (
                      <>
                        <button
                          onClick={() => {
                            close()
                            const c = s.duplicateResume(r.id)
                            if (c) s.toast({ kind: 'success', title: 'CV dupliqué', detail: c.title })
                          }}
                        >
                          <Copy size={15} /> Dupliquer
                        </button>
                        <button
                          onClick={() => {
                            close()
                            s.go({ name: 'offers' })
                          }}
                        >
                          <Target size={15} /> Adapter à une offre
                        </button>
                        <hr />
                        <button onClick={() => (close(), actions.exportResume(r.id, 'pdf'))}>
                          <Download size={15} /> PDF <small>recommandé</small>
                        </button>
                        <button onClick={() => (close(), actions.exportResume(r.id, 'docx'))}>
                          <Download size={15} /> Word (.docx)
                        </button>
                        <button onClick={() => (close(), actions.exportResume(r.id, 'txt'))}>
                          <Download size={15} /> Texte brut
                        </button>
                        <hr />
                        <button style={{ color: 'var(--danger)' }} onClick={() => (close(), remove(r.id))}>
                          <Trash2 size={15} /> Supprimer
                        </button>
                      </>
                    )}
                  </Dropdown>
                </div>
              </div>
              <div className="shot-meta">
                <div className="shot-logo">
                  <FileText size={15} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</strong>
                  <span>
                    {getTemplate(r.templateId).name} · {offer ? `ciblé ${offer.company || offer.title}` : 'générique'} · {timeAgo(r.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
