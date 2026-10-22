import { Search, Bot, BriefcaseBusiness, FilePlus2, FileText, FileUp, LayoutGrid, Mail, Moon, Settings, Sparkles, SwatchBook } from 'lucide-react'
import { PRESETS } from '../lib/presets'
import { TOURS } from '../lib/tours'
import { launchTour, startPageTour } from './Tour'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { norm } from '../lib/ats'
import { actions } from '../lib/actions'
import { useStore } from '../store'

interface Cmd {
  id: string
  group: string
  label: string
  hint?: string
  icon: ReactNode
  run: () => void
}

export function CommandPalette() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const cmds = useMemo<Cmd[]>(() => {
    const go = s.go
    const list: Cmd[] = [
      { id: 'tour-here', group: 'aide', label: 'Tutoriel de cette page', hint: 'bouton ?', icon: <Sparkles size={17} />, run: () => setTimeout(startPageTour, 50) },
      ...TOURS.map((t) => ({ id: 'tour-' + t.id, group: 'aide', label: `Tutoriel : ${t.name}`, hint: t.summary, icon: <Sparkles size={17} />, run: () => void launchTour(t.id) })),
      { id: 'new', group: 'actions', label: 'Nouveau CV (avec mon profil s’il est rempli)', icon: <FilePlus2 size={17} />, run: () => actions.newResume() },
      { id: 'sample', group: 'actions', label: 'Créer un CV depuis l’exemple', icon: <Sparkles size={17} />, run: () => actions.newResume('atelier', true) },
      ...PRESETS.map((p) => ({ id: 'preset-' + p.id, group: 'actions' as const, label: `Preset complet : ${p.name}`, icon: <Sparkles size={17} />, run: () => actions.newFromPreset(p.id) })),
      { id: 'profile', group: 'aller à', label: 'Mon profil (infos reprises par tous les modèles)', icon: <FileText size={17} />, run: () => go({ name: 'profile' }) },
      { id: 'ats-scan', group: 'actions', label: 'Score ATS d’un CV PDF', icon: <FileText size={17} />, run: () => go({ name: 'ats-scan' }) },
      { id: 'from-image', group: 'actions', label: 'Recréer un CV depuis une image', icon: <FileUp size={17} />, run: () => go({ name: 'from-image' }) },
      { id: 'colors', group: 'actions', label: 'Explorer les modèles par couleurs', icon: <Sparkles size={17} />, run: () => go({ name: 'colors' }) },
      { id: 'import', group: 'actions', label: 'Importer un CV existant (PDF, Word, texte)', icon: <FileUp size={17} />, run: () => actions.importResume() },
      { id: 'offer', group: 'actions', label: 'Analyser une offre d’emploi', icon: <BriefcaseBusiness size={17} />, run: actions.newOffer },
      { id: 'assistant', group: 'actions', label: 'Ouvrir l’assistant IA', hint: 'Ctrl J', icon: <Bot size={17} />, run: () => s.setAssistant(true) },
      { id: 'theme', group: 'actions', label: 'Basculer thème clair / sombre', icon: <Moon size={17} />, run: actions.toggleTheme },
      { id: 'g-dash', group: 'aller à', label: 'Tableau de bord', icon: <LayoutGrid size={17} />, run: () => go({ name: 'dashboard' }) },
      { id: 'g-cv', group: 'aller à', label: 'Mes CV', icon: <FileText size={17} />, run: () => go({ name: 'resumes' }) },
      { id: 'g-tpl', group: 'aller à', label: 'Modèles', icon: <SwatchBook size={17} />, run: () => go({ name: 'templates' }) },
      { id: 'g-off', group: 'aller à', label: 'Offres & matching', icon: <BriefcaseBusiness size={17} />, run: () => go({ name: 'offers' }) },
      { id: 'g-trk', group: 'aller à', label: 'Suivi des candidatures', icon: <BriefcaseBusiness size={17} />, run: () => go({ name: 'tracker' }) },
      { id: 'g-let', group: 'aller à', label: 'Lettres de motivation', icon: <Mail size={17} />, run: () => go({ name: 'letters' }) },
      { id: 'g-set', group: 'aller à', label: 'Paramètres', icon: <Settings size={17} />, run: () => go({ name: 'settings' }) }
    ]
    for (const r of s.data.resumes)
      list.push({ id: 'r' + r.id, group: 'mes cv', label: r.title, hint: `${r.basics.firstName} ${r.basics.lastName}`, icon: <FileText size={17} />, run: () => go({ name: 'editor', id: r.id }) })
    for (const o of s.data.offers)
      list.push({ id: 'o' + o.id, group: 'offres', label: o.title || 'Offre sans titre', hint: o.company, icon: <BriefcaseBusiness size={17} />, run: () => go({ name: 'offers', id: o.id }) })
    return list
  }, [s.data.resumes, s.data.offers, s.go, s.setAssistant])

  const filtered = useMemo(() => {
    const n = norm(q)
    if (!n) return cmds
    return cmds.filter((c) => n.split(' ').every((w) => norm(`${c.label} ${c.hint ?? ''} ${c.group}`).includes(w)))
  }, [cmds, q])

  useEffect(() => {
    setIdx(0)
  }, [q])
  useEffect(() => {
    listRef.current?.querySelector('.palette-item.on')?.scrollIntoView({ block: 'nearest' })
  }, [idx])

  const exec = (c?: Cmd) => {
    if (!c) return
    s.setPalette(false)
    c.run()
  }

  let lastGroup = ''
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && s.setPalette(false)}>
      <div className="palette" role="dialog" aria-label="Palette de commandes">
        <div className="palette-input">
          <Search size={17} className="muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un CV, une offre, une action…"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIdx((i) => Math.min(i + 1, filtered.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setIdx((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter') exec(filtered[idx])
              else if (e.key === 'Escape') s.setPalette(false)
            }}
          />
          <span className="kbd">Échap</span>
        </div>
        <div className="palette-list" ref={listRef}>
          {filtered.length === 0 && <div className="empty">Aucun résultat pour « {q} »</div>}
          {filtered.map((c, i) => {
            const header = c.group !== lastGroup
            lastGroup = c.group
            return (
              <div key={c.id}>
                {header && (
                  <div className="palette-group">
                    
                    {c.group}
                  </div>
                )}
                <button className={`palette-item ${i === idx ? 'on' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => exec(c)}>
                  {c.icon}
                  {c.label}
                  {c.hint && <span className="hint">{c.hint}</span>}
                </button>
              </div>
            )
          })}
        </div>
        <div className="palette-foot">
          <span>
            <span className="kbd">↑↓</span> naviguer
          </span>
          <span>
            <span className="kbd">Entrée</span> ouvrir
          </span>
          <span>
            <span className="kbd">Ctrl J</span> assistant IA
          </span>
        </div>
      </div>
    </div>
  )
}
