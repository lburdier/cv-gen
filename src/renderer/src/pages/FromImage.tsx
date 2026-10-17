import { ArrowRight, Check, ImagePlus, Loader2, RefreshCw, SlidersHorizontal, Sparkles, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DEFAULT_ORDER } from '../../../shared/format'
import type { CvImageAnalysis, DesignSpec, Resume } from '../../../shared/types'
import { DesignForm } from '../components/DesignForm'
import { PaperThumb } from '../components/PaperThumb'
import { analyzeImageLocal } from '../lib/cvVision'
import { chooseImage } from '../lib/image'
import { activeProfile } from '../lib/profile'
import { isEmptyResume, sampleResume } from '../lib/sample'
import { useStore } from '../store'

type Step = { id: string; label: string; state: 'wait' | 'run' | 'done' | 'skip' | 'error'; detail?: string }
type Content = 'read' | 'sample' | string

/** Recadre la photo repérée par l'IA (cadre en %) pour la réutiliser dans le CV. */
async function cropPhoto(src: string, box: NonNullable<CvImageAnalysis['photoBox']>): Promise<string> {
  const img = new Image()
  img.src = src
  await img.decode()
  const sx = (box.x / 100) * img.naturalWidth
  const sy = (box.y / 100) * img.naturalHeight
  const sw = (box.w / 100) * img.naturalWidth
  const sh = (box.h / 100) * img.naturalHeight
  const k = Math.min(1, 600 / Math.max(sw, sh))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(sw * k))
  c.height = Math.max(1, Math.round(sh * k))
  c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.9)
}

/**
 * Recréer un CV depuis une image : l'algorithme local mesure les pixels (fonds, colonne,
 * bandeau, photo, couleurs) puis l'IA en vision affine le design (titres, polices, détails)
 * et peut lire tout le texte. Le résultat est un CV « Sur mesure » modifiable.
 */
export default function FromImage() {
  const s = useStore()
  const mine = useMemo(() => s.data.resumes.filter((r) => !isEmptyResume(r)).sort((a, b) => b.updatedAt - a.updatedAt), [s.data.resumes])
  const hasAi = s.settings.hasApiKey
  const [image, setImage] = useState<string | null>(null)
  const [content, setContent] = useState<Content>(activeProfile(s.data) ? 'profile' : hasAi ? 'read' : (mine[0]?.id ?? 'sample'))
  const [useAi, setUseAi] = useState(hasAi)
  const [steps, setSteps] = useState<Step[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ design: DesignSpec; notes: string[]; content?: CvImageAnalysis['content']; photo?: string } | null>(null)
  const [tweak, setTweak] = useState(false)

  const mark = (id: string, state: Step['state'], detail?: string) => setSteps((cur) => cur.map((x) => (x.id === id ? { ...x, state, detail: detail ?? x.detail } : x)))

  const analyze = async (src = image) => {
    if (!src) return
    const ai = useAi && hasAi
    const read = ai && content === 'read'
    setBusy(true)
    setResult(null)
    setSteps([
      { id: 'px', label: 'Lecture des pixels : fonds, colonne, bandeau, photo, couleurs', state: 'run' },
      { id: 'ai', label: ai ? 'Analyse du design par l’IA : titres, polices, détails' : 'Analyse IA (désactivée)', state: ai ? 'wait' : 'skip' },
      { id: 'txt', label: read ? 'Lecture du texte du CV par l’IA' : 'Texte du CV : contenu choisi ci-dessous', state: read ? 'wait' : 'skip' }
    ])
    try {
      const local = await analyzeImageLocal(src)
      mark('px', 'done', local.notes.join(' · '))
      let design = local.design
      let notes = local.notes
      let text: CvImageAnalysis['content']
      let photo: string | undefined
      if (ai) {
        mark('ai', 'run')
        if (read) mark('txt', 'run')
        try {
          const res = await window.cvgen.ai.analyzeCvImage(src, read, local.design)
          design = res.design
          notes = res.notes.length ? res.notes : notes
          text = res.content
          if (res.photoBox) photo = await cropPhoto(src, res.photoBox).catch(() => undefined)
          mark('ai', 'done', notes.slice(0, 3).join(' · '))
          if (read) mark('txt', text ? 'done' : 'error', text ? `${text.experiences.length} expériences, ${text.education.length} formations, ${text.skills.reduce((n, g) => n + g.items.length, 0)} compétences` : 'Texte non lu')
        } catch (e) {
          mark('ai', 'error', (e as Error).message + ' — design de l’analyse locale conservé')
          if (read) mark('txt', 'error', 'Non lu')
        }
      }
      setResult({ design, notes, content: text, photo })
    } catch (e) {
      mark('px', 'error', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const pick = async (file?: File) => {
    const src = await chooseImage(2000, file)
    if (!src) return
    setImage(src)
    void analyze(src)
  }

  // CV généré : contenu (lu sur l'image, un de mes CV ou l'exemple) + design recréé.
  const preview = useMemo<Resume | null>(() => {
    if (!result) return null
    const sample = sampleResume('sur-mesure')
    let base: Resume = sample
    if (content === 'read' && result.content) {
      const c = result.content
      base = {
        ...sample,
        ...c,
        basics: { ...c.basics, photo: result.photo },
        title: `CV recréé${c.basics.firstName ? ' — ' + `${c.basics.firstName} ${c.basics.lastName}`.trim() : ''}`,
        links: [],
        gallery: [],
        sectionOrder: [...DEFAULT_ORDER],
        hidden: []
      }
    } else if (content === 'profile' && s.data.profile) {
      base = { ...s.data.profile, title: 'CV recréé — mon profil' }
    } else if (content !== 'read' && content !== 'sample') {
      const r = mine.find((x) => x.id === content)
      if (r) base = { ...r, title: `${r.title} — Sur mesure` }
    }
    return { ...base, templateId: 'sur-mesure', design: result.design, accent: result.design.colors.primary, accent2: result.design.colors.secondary }
  }, [result, content, mine, s.data.profile])

  const create = () => {
    if (!preview) return
    const r = s.createResume({ templateId: 'sur-mesure', from: preview })
    s.log('import', `CV recréé depuis une image : ${r.title}`)
    s.toast({ kind: 'success', title: 'CV recréé depuis l’image', detail: 'Ajustez le design dans l’onglet « Design » de l’éditeur.' })
    s.go({ name: 'editor', id: r.id })
  }

  const setDesign = (design: DesignSpec) => setResult((cur) => (cur ? { ...cur, design } : cur))

  return (
    <div className="page">
      <div className="hero">
        <div className="mono-label">recréer depuis une image</div>
        <h1>
          Un CV vous plaît ? <em>Recréez-le.</em>
        </h1>
        <p>Envoyez une capture ou une photo d’un CV : l’app mesure sa mise en page et ses couleurs, l’IA reconnaît les titres, les polices et peut lire tout le texte. Vous obtenez un CV modifiable et exportable, avec sa version ATS.</p>
      </div>

      <div className="fi-options">
        <label className="field">
          <span>Contenu du CV généré</span>
          <select className="select" value={content} onChange={(e) => setContent(e.target.value)}>
            <option value="read" disabled={!hasAi}>
              Lire le texte de l’image (IA){hasAi ? '' : ' — clé API requise'}
            </option>
            {mine.map((r) => (
              <option key={r.id} value={r.id}>
                Mon CV : {r.title}
              </option>
            ))}
            {s.data.profile && <option value="profile">Mon profil</option>}
            <option value="sample">Contenu d’exemple</option>
          </select>
        </label>
        <label className={`check fi-ai ${hasAi ? '' : 'off'}`} title={hasAi ? '' : 'Ajoutez une clé (gratuite avec OpenRouter) dans Paramètres'}>
          <input type="checkbox" checked={useAi && hasAi} disabled={!hasAi} onChange={(e) => setUseAi(e.target.checked)} />
          <span>
            <b>Analyse IA du design</b>
            <small>{hasAi ? (s.settings.provider === 'openrouter' ? 'Modèle gratuit OpenRouter avec vision' : 'Claude en vision') : 'Sans clé : analyse locale des pixels uniquement'}</small>
          </span>
        </label>
        {!hasAi && (
          <button className="btn btn-ghost btn-sm" onClick={() => s.go({ name: 'settings' })}>
            Ajouter une clé <ArrowRight size={14} />
          </button>
        )}
      </div>

      {!image ? (
        <button
          className="cx-drop fi-drop"
          onClick={() => pick()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) void pick(f)
          }}
        >
          <ImagePlus size={28} />
          <strong>Déposez l’image d’un CV</strong>
          <span>PNG, JPEG ou WebP — capture d’écran, photo, export Canva ou Behance. Plus l’image est nette, plus le résultat est fidèle.</span>
        </button>
      ) : (
        <div className="fi-grid">
          <div className="fi-col">
            <div className="mono-label">image envoyée</div>
            <div className="fi-original">
              <img src={image} alt="CV d’origine" />
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={() => pick()} disabled={busy}>
                <ImagePlus size={14} /> Autre image
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => analyze()} disabled={busy}>
                <RefreshCw size={14} /> Relancer l’analyse
              </button>
            </div>
          </div>
          <div className="fi-col">
            <div className="mono-label">cv recréé</div>
            {preview ? (
              <div className="fi-result">
                <PaperThumb resume={preview} rounded />
              </div>
            ) : (
              <div className="fi-steps">
                {steps.map((st) => (
                  <div key={st.id} className={`fi-step ${st.state}`}>
                    <span className="fi-ic">
                      {st.state === 'run' ? <Loader2 size={15} className="spin" /> : st.state === 'done' ? <Check size={15} /> : st.state === 'error' ? <TriangleAlert size={15} /> : <span className="fi-dot" />}
                    </span>
                    <div>
                      <strong>{st.label}</strong>
                      {st.detail && <small>{st.detail}</small>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {result && preview && (
        <div className="fi-after">
          <div className="fi-notes">
            <div className="mono-label">ce qui a été reconnu</div>
            <div className="chips" style={{ gap: 6 }}>
              {result.notes.map((n, i) => (
                <span key={i} className="mono-tag">
                  {n}
                </span>
              ))}
            </div>
            {steps.some((x) => x.state === 'error') && (
              <div className="callout" style={{ fontSize: 13 }}>
                <TriangleAlert size={16} />
                <span>{steps.find((x) => x.state === 'error')?.detail}</span>
              </div>
            )}
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button className="btn btn-outline" onClick={() => setTweak((v) => !v)}>
              <SlidersHorizontal size={15} /> {tweak ? 'Masquer les réglages' : 'Ajuster le design'}
            </button>
            <button className="btn btn-ink" onClick={create}>
              <Sparkles size={15} /> Créer ce CV
            </button>
          </div>
          {tweak && (
            <div className="fi-tweak">
              <DesignForm design={result.design} onChange={setDesign} />
            </div>
          )}
        </div>
      )}

      {!image && (
        <div className="fi-how">
          {[
            ['1', 'Lecture des pixels', 'Fond de page, colonne latérale, bandeau d’en-tête, photo et couleurs d’accent sont mesurés directement sur l’image, même hors ligne.'],
            ['2', 'Analyse IA en vision', 'Style des titres, polices, frise, pastilles, sections de la colonne : l’IA complète et corrige les mesures.'],
            ['3', 'Lecture du texte', 'Avec votre propre CV en image, tout le contenu est retranscrit et la photo recadrée automatiquement.'],
            ['4', 'CV modifiable', 'Le résultat est un modèle « Sur mesure » : chaque réglage reste modifiable, export PDF, Word et version ATS.']
          ].map(([n, title, text]) => (
            <div key={n} className="fi-how-item">
              <span className="fi-n">{n}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
