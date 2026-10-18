import { AlertTriangle, CheckCircle2, Plus, ScanText, Sparkles, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { Offer, Resume } from '../../../shared/types'
import type { AtsReport } from '../lib/ats'
import { scoreColor } from '../lib/ats'
import { uid } from '../lib/sample'
import { useStore } from '../store'
import { ScoreRing } from './ui'
import { Select } from './Select'

const CAT_LABEL = { format: 'Format', content: 'Contenu', keywords: 'Mots-clés' }

export function AtsPanel({
  resume,
  offer,
  report,
  onShowText,
  onTailor
}: {
  resume: Resume
  offer?: Offer
  report: AtsReport
  onShowText: () => void
  onTailor: () => void
}) {
  const s = useStore()
  const [tab, setTab] = useState<'all' | 'issues'>('issues')
  const verdict = report.score >= 85 ? 'Excellent' : report.score >= 70 ? 'Bon' : report.score >= 50 ? 'À améliorer' : 'Insuffisant'
  const checks = report.checks.filter((c) => tab === 'all' || c.status !== 'pass')

  const addSkill = (term: string) => {
    s.updateResume(resume.id, (r) => {
      let g = r.skills.find((x) => /clé|key/i.test(x.name)) ?? r.skills[0]
      if (!g) {
        g = { id: uid(), name: r.lang === 'en' ? 'Key skills' : 'Compétences clés', items: [] }
        r.skills.unshift(g)
      }
      if (!g.items.some((i) => i.toLowerCase() === term.toLowerCase())) g.items.push(term)
    })
    s.toast({ kind: 'success', title: `« ${term} » ajouté aux compétences`, detail: 'Mentionnez-le aussi dans une expérience pour plus de poids.' })
  }

  return (
    <>
      <div className="ats-score-card">
        <div className="row" style={{ gap: 16 }}>
          <ScoreRing score={report.score} size={92} label="/ 100" />
          <div>
            <div className="mono-label">
              score ats
            </div>
            <div style={{ fontSize: 20, fontWeight: 680, letterSpacing: '-0.02em', color: scoreColor(report.score) }}>{verdict}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {report.wordCount} mots · {offer ? 'comparé à l’offre' : 'sans offre ciblée'}
            </div>
          </div>
        </div>
        {(['format', 'content', 'keywords'] as const).map((k) => {
          const v = report[k]
          return (
            <div key={k} className="bar-row">
              <span>{CAT_LABEL[k]}</span>
              <div className="bar">
                <i style={{ width: `${v ?? 0}%`, background: v == null ? 'transparent' : scoreColor(v) }} />
              </div>
              <b>{v == null ? '-' : v}</b>
            </div>
          )
        })}
        <button className="btn btn-outline btn-sm" onClick={onShowText}>
          <ScanText size={14} /> Vue ATS (texte extrait)
        </button>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <div className="mono-label">
          offre ciblée
        </div>
        <Select
          className="select"
          value={resume.offerId ?? ''}
          onChange={(e) => s.updateResume(resume.id, (r) => void (r.offerId = e.target.value || undefined))}
        >
          <option value="">Aucune (score général)</option>
          {s.data.offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title || 'Offre sans titre'}
              {o.company ? ` · ${o.company}` : ''}
            </option>
          ))}
        </Select>
        {s.data.offers.length === 0 && (
          <button className="btn btn-soft btn-sm" onClick={() => s.go({ name: 'offers', id: 'new' })}>
            <Plus size={14} /> Ajouter une offre
          </button>
        )}
        {offer && (
          <button className="btn btn-ai btn-sm" onClick={onTailor}>
            <Sparkles size={14} /> Adapter ce CV à l’offre avec l’IA
          </button>
        )}
      </div>

      {report.match && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row">
            <div className="mono-label">
              mots-clés · {report.match.coverage} %
            </div>
            {offer?.analysis?.source === 'local' && (
              <span className="tag warn" style={{ marginLeft: 'auto' }} title="Analysez l’offre avec l’IA pour une extraction plus précise">
                analyse locale
              </span>
            )}
          </div>
          {report.match.missing.length > 0 && (
            <>
              <div className="label">Manquants : cliquez pour ajouter ceux que vous maîtrisez</div>
              <div className="chips" style={{ gap: 6 }}>
                {report.match.missing.map((k) => (
                  <button key={k.term} className="tag miss" style={{ border: 0, cursor: 'pointer' }} onClick={() => addSkill(k.term)} title="Ajouter à mes compétences">
                    {k.term} <span className="imp">{'●'.repeat(k.importance)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {report.match.found.length > 0 && (
            <>
              <div className="label">Présents</div>
              <div className="chips" style={{ gap: 6 }}>
                {report.match.found.map((k) => (
                  <span key={k.term} className="tag ok">
                    {k.term}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <div className="row">
          <div className="mono-label">
            contrôles
          </div>
          <div className="seg" style={{ marginLeft: 'auto' }}>
            <button className={tab === 'issues' ? 'on' : ''} onClick={() => setTab('issues')}>
              À corriger
            </button>
            <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
              Tous
            </button>
          </div>
        </div>
        <div className="checks">
          {checks.length === 0 && (
            <div className="check-item">
              <CheckCircle2 size={16} className="ic pass" />
              <div>Rien à corriger, bravo !</div>
            </div>
          )}
          {checks.map((c) => (
            <div key={c.id} className="check-item">
              {c.status === 'pass' ? <CheckCircle2 size={16} className="ic pass" /> : c.status === 'warn' ? <AlertTriangle size={16} className="ic warn" /> : <XCircle size={16} className="ic fail" />}
              <div>
                {c.label}
                <p>{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
