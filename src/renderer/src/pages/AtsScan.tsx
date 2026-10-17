import { AlertTriangle, CheckCircle2, FileSearch, FileUp, Loader2, RefreshCw, Sparkles, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DEFAULT_ORDER } from '../../../shared/format'
import type { OfferKeyword, PdfExtraction } from '../../../shared/types'
import { ScoreRing } from '../components/ui'
import { localAnalyze, scoreColor } from '../lib/ats'
import { scanFromText, scoreExtraction, type PdfCategory } from '../lib/atsPdf'
import { getTemplate } from '../templates/registry'
import { useStore } from '../store'

const CATS: [PdfCategory, string, string][] = [
  ['read', 'Lisibilité machine', 'Texte, encodage, colonnes, pages'],
  ['structure', 'Structure', 'Intitulés, coordonnées, dates'],
  ['content', 'Contenu', 'Longueur, puces, verbes, chiffres'],
  ['keywords', 'Mots-clés de l’offre', 'Couverture des termes recherchés']
]

const SECTION_LABEL: Record<string, string> = {
  experience: 'Expérience',
  education: 'Formation',
  skills: 'Compétences',
  summary: 'Profil',
  languages: 'Langues',
  interests: 'Intérêts',
  certifications: 'Certifications',
  projects: 'Projets',
  contact: 'Contact'
}

/**
 * Score ATS d'un CV existant : on dépose un PDF (ou un DOCX), l'app le lit comme un
 * logiciel de recrutement et note ce qui passe ou bloque, avec la vue « texte lu par l'ATS ».
 */
export default function AtsScan() {
  const s = useStore()
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; ex: PdfExtraction; docx: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [offerId, setOfferId] = useState('')
  const [pasted, setPasted] = useState('')
  const [tab, setTab] = useState<'todo' | 'all'>('todo')
  const [view, setView] = useState<'read' | 'raw'>('read')
  const offers = s.data.offers

  const keywords = useMemo<OfferKeyword[] | null>(() => {
    if (offerId === 'paste') return pasted.trim().length > 60 ? localAnalyze(pasted).keywords : null
    const o = offers.find((x) => x.id === offerId)
    if (!o) return null
    return o.analysis?.keywords ?? localAnalyze(o.text).keywords
  }, [offerId, pasted, offers])

  const report = useMemo(() => (file ? scoreExtraction(file.ex, keywords, { docx: file.docx }) : null), [file, keywords])

  const load = async (f: File) => {
    setError('')
    const ext = f.name.toLowerCase().split('.').pop()
    if (ext !== 'pdf' && ext !== 'docx') return setError('Déposez un fichier PDF (ou DOCX).')
    if (f.size > 25 * 1024 * 1024) return setError('Fichier trop lourd (plus de 25 Mo).')
    setBusy(true)
    try {
      const bytes = new Uint8Array(await f.arrayBuffer())
      const ex = ext === 'pdf' ? await window.cvgen.extractPdf(bytes) : scanFromText(await window.cvgen.extractDocx(bytes), f.name, bytes.length)
      setFile({ name: f.name, bytes, ex, docx: ext === 'docx' })
      setTab('todo')
    } catch (e) {
      setError((e as Error).message || 'Lecture impossible.')
    } finally {
      setBusy(false)
    }
  }

  const pick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.docx,application/pdf'
    input.onchange = () => {
      const f = input.files?.[0]
      if (f) void load(f)
    }
    input.click()
  }

  const importIt = async () => {
    if (!file) return
    const imported = await s.run('Lecture du CV par l’IA…', () => window.cvgen.ai.importResumeBytes(file.name, file.bytes))
    if (!imported) return
    const t = getTemplate('atelier')
    const name = `${imported.basics.firstName} ${imported.basics.lastName}`.trim()
    const r = s.createResume({
      from: { ...imported, title: `CV importé${name ? ' — ' + name : ''}`, templateId: t.id, accent: t.accent, font: t.font, sectionOrder: [...DEFAULT_ORDER], hidden: [] }
    })
    s.log('import', `CV importé depuis le score ATS : ${r.title}`)
    s.toast({ kind: 'success', title: 'CV importé dans CV GEN', detail: 'Il est maintenant en modèle ATS une colonne : vérifiez chaque section.' })
    s.go({ name: 'editor', id: r.id })
  }

  const shownChecks = report ? report.checks.filter((c) => tab === 'all' || c.status !== 'pass').sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === 'fail' ? -1 : b.status === 'fail' ? 1 : a.status === 'warn' ? -1 : 1)) : []

  return (
    <div className="page">
      <div className="hero">
        <div className="mono-label">score ats</div>
        <h1>
          Votre CV passe-t-il les <em>robots</em> ?
        </h1>
        <p>Déposez votre CV en PDF : CV GEN le lit exactement comme un logiciel de recrutement (Workday, Taleo, Greenhouse…) et vous dit ce qui passe, ce qui bloque, et comment corriger. Rien n’est envoyé en ligne.</p>
      </div>

      {!file ? (
        <button
          className={`cx-drop fi-drop ${busy ? 'busy' : ''}`}
          onClick={pick}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) void load(f)
          }}
          disabled={busy}
        >
          {busy ? <Loader2 size={28} className="spin" /> : <FileUp size={28} />}
          <strong>{busy ? 'Lecture du CV…' : 'Déposez votre CV en PDF'}</strong>
          <span>ou cliquez pour choisir un fichier — PDF ou DOCX, 25 Mo maximum.</span>
          {error && <span className="ats-err">{error}</span>}
        </button>
      ) : (
        report && (
          <div className="as-grid">
            <aside className="as-side">
              <div className="as-score">
                <ScoreRing score={report.score} size={132} stroke={10} />
                <div>
                  <strong style={{ color: scoreColor(report.score) }}>
                    {report.score >= 80 ? 'Excellent' : report.score >= 60 ? 'Correct' : report.score >= 40 ? 'À améliorer' : 'Bloquant'}
                  </strong>
                  <span className="muted">{file.name}</span>
                </div>
              </div>
              <div className="as-cats">
                {CATS.filter(([k]) => k !== 'keywords' || report.categories.keywords != null).map(([k, label, hint]) => {
                  const v = report.categories[k] ?? 0
                  return (
                    <div key={k} className="as-cat">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span>
                          {label}
                          <small>{hint}</small>
                        </span>
                        <b>{v}</b>
                      </div>
                      <div className="as-bar">
                        <span style={{ width: `${v}%`, background: scoreColor(v) }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <label className="field">
                <span>Comparer à une offre</span>
                <select className="select" value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                  <option value="">Sans offre (score général)</option>
                  {offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title || 'Offre'}
                      {o.company ? ` — ${o.company}` : ''}
                    </option>
                  ))}
                  <option value="paste">Coller le texte d’une offre…</option>
                </select>
              </label>
              {offerId === 'paste' && <textarea className="input" rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Collez ici l’annonce complète…" />}
              <div className="as-stats">
                <span className="mono-tag">{report.stats.pages} page{report.stats.pages > 1 ? 's' : ''}</span>
                <span className="mono-tag">{report.stats.words} mots</span>
                {report.stats.columns && <span className="mono-tag">2 colonnes</span>}
                {report.stats.producer && <span className="mono-tag">{report.stats.producer.slice(0, 32)}</span>}
              </div>
              <div className="stack" style={{ gap: 8 }}>
                <button className="btn btn-ink" onClick={importIt} disabled={!s.settings.hasApiKey} title={s.settings.hasApiKey ? '' : 'Clé API requise (Paramètres)'}>
                  <Sparkles size={15} /> Importer et corriger dans CV GEN
                </button>
                <button className="btn btn-outline" onClick={() => setFile(null)}>
                  <RefreshCw size={14} /> Analyser un autre CV
                </button>
                {!s.settings.hasApiKey && <span className="muted" style={{ fontSize: 12.5 }}>L’import demande une clé API (gratuite avec OpenRouter) dans Paramètres.</span>}
              </div>
            </aside>

            <section className="as-checks">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="mono-label">contrôles</div>
                <div className="seg">
                  <button className={tab === 'todo' ? 'on' : ''} onClick={() => setTab('todo')}>
                    À corriger ({report.checks.filter((c) => c.status !== 'pass').length})
                  </button>
                  <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
                    Tous
                  </button>
                </div>
              </div>
              <div className="checks">
                {shownChecks.length === 0 && (
                  <div className="check-item">
                    <CheckCircle2 size={16} className="ic pass" />
                    <div>Rien à corriger : ce CV passe les filtres ATS.</div>
                  </div>
                )}
                {shownChecks.map((c) => (
                  <div key={c.id} className="check-item">
                    {c.status === 'pass' ? <CheckCircle2 size={16} className="ic pass" /> : c.status === 'warn' ? <AlertTriangle size={16} className="ic warn" /> : <XCircle size={16} className="ic fail" />}
                    <div>
                      {c.label}
                      <p>{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              {report.keywords && (
                <div className="as-kw">
                  <div className="mono-label">mots-clés de l’offre</div>
                  <div className="chips" style={{ gap: 6 }}>
                    {report.keywords.matched.map((k) => (
                      <span key={k.term} className="tag ok">
                        {k.term}
                      </span>
                    ))}
                    {report.keywords.missing.map((k) => (
                      <span key={k.term} className={`tag ${k.importance === 3 ? 'miss' : 'warn'}`}>
                        {k.term}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="as-text">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="mono-label">
                  <FileSearch size={13} /> ce que lit l’ats
                </div>
                <div className="seg">
                  <button className={view === 'read' ? 'on' : ''} onClick={() => setView('read')}>
                    Lecture
                  </button>
                  <button className={view === 'raw' ? 'on' : ''} onClick={() => setView('raw')} title="Ordre du fichier, tel que le lit un ATS simple">
                    Ordre brut
                  </button>
                </div>
              </div>
              <div className="as-paper">
                {view === 'read' ? (
                  report.lines.map((l, i) => (
                    <div key={i} className={`as-line ${l.section ? 'h' : ''} ${l.weak ? 'weak' : ''}`}>
                      {l.text}
                      {l.section && <span className="as-sec">{SECTION_LABEL[l.section]}</span>}
                      {i > 0 && report.lines[i - 1].page !== l.page && <span className="as-page">page {l.page + 1}</span>}
                    </div>
                  ))
                ) : (
                  <pre className="as-raw">{report.rawText || '(aucun texte)'}</pre>
                )}
              </div>
            </section>
          </div>
        )
      )}
    </div>
  )
}
