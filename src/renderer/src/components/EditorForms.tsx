import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Eye, EyeOff, Loader2, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { CEFR, CEFR_HINT, cefrLevel, experienceGaps, MIN_MISSIONS, SECTION_TITLES, SOFT_SKILLS, SUMMARY_MAX, SUMMARY_MIN } from '../../../shared/format'
import type { BulletVariants, Offer, Resume, SectionKey } from '../../../shared/types'
import { useStore } from '../store'
import { uid } from '../lib/sample'
import { isVisual } from '../templates/registry'
import { usesDesignEngine } from '../templates/designCatalog'
import { isReplica } from '../templates/CvReplica'
import { AutoTextarea, Modal, TagsInput } from './ui'
import { Select } from './Select'
import { IconEditor, VisualFields } from './VisualForms'

type Up = (fn: (r: Resume) => void) => void

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint}
    </label>
  )
}

export function move<T>(arr: T[], i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

function ItemCard({
  title,
  subtitle,
  open,
  onToggle,
  onUp,
  onDown,
  onDelete,
  children
}: {
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  onUp?: () => void
  onDown?: () => void
  onDelete: () => void
  children: ReactNode
}) {
  return (
    <div className="item-card">
      <div className="item-head" onClick={onToggle}>
        {open ? <ChevronDown size={16} className="muted" /> : <ChevronRight size={16} className="muted" />}
        <div className="t">
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
        <div className="row" style={{ gap: 2 }} onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn sm" onClick={onUp} disabled={!onUp} title="Monter">
            <ArrowUp size={14} />
          </button>
          <button className="icon-btn sm" onClick={onDown} disabled={!onDown} title="Descendre">
            <ArrowDown size={14} />
          </button>
          <button className="icon-btn sm" onClick={onDelete} title="Supprimer">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {open && <div className="item-body">{children}</div>}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="form-section-title">
      <h3>{children}</h3>
      <div className="actions">{action}</div>
    </div>
  )
}

// ---------- Identité ----------

export function IdentityForm({ r, up }: { r: Resume; up: Up }) {
  const b = r.basics
  type TextKey = Exclude<keyof Resume['basics'], 'bannerHeight'>
  const set = (k: TextKey) => (e: { target: { value: string } }) => up((x) => void (x.basics[k] = e.target.value))
  // Suggestions de candidature : l'offre liée au CV, puis les formules courantes.
  const offer = useStore((s) => s.data.offers.find((o) => o.id === r.offerId))
  const targetIdeas = [
    offer && (r.lang === 'en' ? `Applying for: ${offer.title}${offer.company ? ` at ${offer.company}` : ''}` : `Candidature : ${offer.title}${offer.company ? ` chez ${offer.company}` : ''}`),
    ...(b.target?.trim() ? [] : r.lang === 'en' ? ['6-month internship from March', 'Work-study (2 years)', 'Full-time position'] : ['Stage de 6 mois dès mars', 'Alternance de 2 ans', 'CDI, disponible immédiatement'])
  ].filter((t): t is string => Boolean(t) && t !== b.target)
  return (
    <>
      <SectionTitle>Identité & coordonnées</SectionTitle>
      <div className="grid-2">
        <Field label="Prénom">
          <input className="input" value={b.firstName} data-field="firstName" onChange={set('firstName')} placeholder="Camille" />
        </Field>
        <Field label="Nom">
          <input className="input" value={b.lastName} data-field="lastName" onChange={set('lastName')} placeholder="Laurent" />
        </Field>
      </div>
      <Field label="Titre du poste visé" hint={<span className="counter">Reprenez l’intitulé exact de l’offre</span>}>
        <input className="input" value={b.headline} data-field="headline" onChange={set('headline')} placeholder="Développeuse Full-Stack React / Node.js" />
      </Field>
      <Field label="Ce que vous recherchez" hint={<span className="counter">Stage, alternance ou poste visé, durée et date : lu juste sous votre titre</span>}>
        <input className="input" value={b.target ?? ''} data-field="target" onChange={set('target')} placeholder="Stage de 6 mois dès mars 2027" />
      </Field>
      {targetIdeas.length > 0 && (
        <div className="chips">
          {targetIdeas.map((t) => (
            <button key={t} type="button" className="chip" onClick={() => up((x) => void (x.basics.target = t))}>
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="grid-2">
        <Field label="E-mail">
          <input className="input" type="email" value={b.email} data-field="email" onChange={set('email')} placeholder="prenom.nom@email.fr" />
        </Field>
        <Field label="Téléphone">
          <input className="input" value={b.phone} data-field="phone" onChange={set('phone')} placeholder="06 12 34 56 78" />
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Ville">
          <input className="input" value={b.location} data-field="location" onChange={set('location')} placeholder="Lyon, France" />
        </Field>
        <Field label="Mobilité">
          <input className="input" value={b.mobility ?? ''} data-field="mobility" onChange={set('mobility')} placeholder="Lyon, Paris, télétravail" />
        </Field>
      </div>
      <Field label="LinkedIn">
        <input className="input" value={b.linkedin} data-field="linkedin" onChange={set('linkedin')} placeholder="linkedin.com/in/…" />
      </Field>
      <div className="grid-2">
        <Field label="GitHub / Portfolio">
          <input className="input" value={b.github} data-field="github" onChange={set('github')} placeholder="github.com/…" />
        </Field>
        <Field label="Site web">
          <input className="input" value={b.website} data-field="website" onChange={set('website')} placeholder="monsite.fr" />
        </Field>
      </div>
      <VisualFields r={r} up={up} />
    </>
  )
}

// ---------- Profil ----------

export function SummaryForm({ r, up, offer }: { r: Resume; up: Up; offer?: Offer }) {
  const s = useStore()
  const len = r.basics.summary.trim().length
  const write = async () => {
    const text = await s.run('Rédaction du profil…', () => window.cvgen.ai.writeSummary(r, offer))
    if (text) up((x) => void (x.basics.summary = text))
  }
  return (
    <>
      <SectionTitle
        action={
          <button className="btn btn-ai btn-sm" onClick={write} disabled={Boolean(s.busy)}>
            <Sparkles size={14} /> {len ? 'Réécrire' : 'Rédiger'} avec l’IA
          </button>
        }
      >
        Profil
      </SectionTitle>
      <AutoTextarea
        className="textarea"
        style={{ minHeight: 140 }}
        value={r.basics.summary}
        data-field="summary"
        onChange={(e) => up((x) => void (x.basics.summary = e.target.value))}
        placeholder="Votre accroche en 3 à 4 lignes, pas plus : qui vous êtes, ce que vous savez faire, ce que vous apportez."
      />
      <div className={`counter ${len >= SUMMARY_MIN && len <= SUMMARY_MAX ? 'ok' : len ? 'warn' : ''}`}>
        {len} / {SUMMARY_MAX} caractères max (3 à 4 lignes){len > SUMMARY_MAX ? ' : trop long, un recruteur lit un CV en 6 secondes' : ''}
      </div>
      {offer && <div className="mono-label">L’IA s’appuiera sur l’offre « {offer.title} ».</div>}
    </>
  )
}

// ---------- Expériences ----------

function BulletImprover({ bullet, context, lang, onPick, onClose }: { bullet: string; context: string; lang: Resume['lang']; onPick: (v: string) => void; onClose: () => void }) {
  const [res, setRes] = useState<BulletVariants | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    window.cvgen.ai
      .improveBullet(bullet, context, lang)
      .then((v) => alive && setRes(v))
      .catch((e: Error) => alive && setErr(e.message))
    return () => {
      alive = false
    }
  }, [bullet, context, lang])
  return (
    <Modal title="Améliorer la réalisation" icon={<Wand2 size={16} />} onClose={onClose}>
      <div className="stack">
        <div className="diff-block" style={{ background: 'var(--bg-sunk)', border: 0 }}>
          <div className="mono-label">
            actuelle
          </div>
          <div>{bullet}</div>
        </div>
        {!res && !err && (
          <div className="row muted">
            <Loader2 size={16} className="spin" /> Génération de 3 variantes…
          </div>
        )}
        {err && <div className="callout warn">{err}</div>}
        {res && (
          <>
            {res.variants.map((v, i) => (
              <button key={i} className="offer-item" style={{ fontSize: 14, gap: 6 }} onClick={() => onPick(v)}>
                <span className="mono-label">
                  variante {i + 1} : cliquer pour remplacer
                </span>
                <span style={{ color: 'var(--text)', fontSize: 14 }}>{v}</span>
              </button>
            ))}
            {res.tip && (
              <div className="callout">
                <Sparkles size={15} />
                <span>{res.tip}</span>
              </div>
            )}
            <div className="mono-label">Remplacez les marqueurs [X] par vos vrais chiffres.</div>
          </>
        )}
      </div>
    </Modal>
  )
}

export function ExperienceForm({ r, up }: { r: Resume; up: Up }) {
  const [open, setOpen] = useState<string | null>(r.experiences[0]?.id ?? null)
  const [improve, setImprove] = useState<{ expId: string; index: number } | null>(null)
  const hasKey = useStore((s) => s.settings.hasApiKey)
  const add = () => {
    const id = uid()
    up((x) => void x.experiences.unshift({ id, role: '', company: '', location: '', start: '', end: '', current: false, bullets: Array(MIN_MISSIONS).fill('') }))
    setOpen(id)
  }
  const target = improve && r.experiences.find((e) => e.id === improve.expId)
  const gaps = experienceGaps
  return (
    <>
      <SectionTitle
        action={
          <button className="btn btn-soft btn-sm" onClick={add}>
            <Plus size={14} /> Ajouter
          </button>
        }
      >
        Expérience professionnelle
      </SectionTitle>
      {r.experiences.length === 0 && <div className="empty">Ajoutez vos postes, du plus récent au plus ancien.</div>}
      {r.experiences.map((e, i) => (
        <ItemCard
          key={e.id}
          title={e.role || 'Nouveau poste'}
          subtitle={[e.company, e.start && `${e.start.slice(0, 4)}–${e.current ? 'auj.' : e.end.slice(0, 4)}`, gaps(e).length > 0 && `À compléter : ${gaps(e).join(', ')}`].filter(Boolean).join(' · ')}
          open={open === e.id}
          onToggle={() => setOpen(open === e.id ? null : e.id)}
          onUp={i > 0 ? () => up((x) => move(x.experiences, i, -1)) : undefined}
          onDown={i < r.experiences.length - 1 ? () => up((x) => move(x.experiences, i, 1)) : undefined}
          onDelete={() => up((x) => void x.experiences.splice(i, 1))}
        >
          <Field label="Intitulé du poste">
            <input className="input" value={e.role} onChange={(ev) => up((x) => void (x.experiences[i].role = ev.target.value))} />
          </Field>
          <div className="grid-2">
            <Field label="Entreprise">
              <input className="input" value={e.company} onChange={(ev) => up((x) => void (x.experiences[i].company = ev.target.value))} />
            </Field>
            <Field label="Lieu">
              <input className="input" value={e.location} onChange={(ev) => up((x) => void (x.experiences[i].location = ev.target.value))} />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Début">
              <input className="input" type="month" value={e.start} onChange={(ev) => up((x) => void (x.experiences[i].start = ev.target.value))} />
            </Field>
            <Field label="Fin">
              <input className="input" type="month" value={e.end} disabled={e.current} onChange={(ev) => up((x) => void (x.experiences[i].end = ev.target.value))} />
            </Field>
          </div>
          <label className="check">
            <input type="checkbox" checked={e.current} onChange={(ev) => up((x) => void (x.experiences[i].current = ev.target.checked))} /> Poste actuel
          </label>
          <div className="label">Missions et réalisations ({MIN_MISSIONS} minimum, détaillées)</div>
          {e.bullets.map((b, j) => {
            const words = b.trim() ? b.trim().split(/\s+/).length : 0
            return (
              <div key={j}>
                <div className="bullet-row">
                  <span className="dot" />
                  <AutoTextarea
                    className="textarea"
                    value={b}
                    placeholder="Verbe d’action + ce que vous avez fait + résultat chiffré"
                    onChange={(ev) => up((x) => void (x.experiences[i].bullets[j] = ev.target.value.replace(/\n/g, ' ')))}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') {
                        ev.preventDefault()
                        up((x) => void x.experiences[i].bullets.splice(j + 1, 0, ''))
                      }
                    }}
                  />
                  <div className="bullet-tools">
                    <button className="icon-btn sm" title={hasKey ? 'Améliorer avec l’IA' : 'Clé API requise'} disabled={!b.trim()} onClick={() => setImprove({ expId: e.id, index: j })}>
                      <Wand2 size={14} />
                    </button>
                    <button className="icon-btn sm" title="Supprimer" onClick={() => up((x) => void x.experiences[i].bullets.splice(j, 1))}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {words > 38 && <div className="bullet-hint warn">{words} mots : scindez en deux puces</div>}
              </div>
            )
          })}
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => up((x) => void x.experiences[i].bullets.push(''))}>
            <Plus size={14} /> Ajouter une mission
          </button>
          {gaps(e).length > 0 && <div className="bullet-hint warn">À compléter : {gaps(e).join(', ')}</div>}
        </ItemCard>
      ))}
      {improve && target && (
        <BulletImprover
          bullet={target.bullets[improve.index]}
          context={`${target.role} chez ${target.company}`}
          lang={r.lang}
          onClose={() => setImprove(null)}
          onPick={(v) => {
            up((x) => {
              const ex = x.experiences.find((y) => y.id === improve.expId)
              if (ex) ex.bullets[improve.index] = v
            })
            setImprove(null)
          }}
        />
      )}
    </>
  )
}

// ---------- Formation ----------

export function EducationForm({ r, up }: { r: Resume; up: Up }) {
  const [open, setOpen] = useState<string | null>(r.education[0]?.id ?? null)
  const add = () => {
    const id = uid()
    up((x) => void x.education.unshift({ id, degree: '', school: '', location: '', start: '', end: '', details: '' }))
    setOpen(id)
  }
  return (
    <>
      <SectionTitle
        action={
          <button className="btn btn-soft btn-sm" onClick={add}>
            <Plus size={14} /> Ajouter
          </button>
        }
      >
        Formation
      </SectionTitle>
      {r.education.length === 0 && <div className="empty">Ajoutez vos diplômes, du plus récent au plus ancien.</div>}
      {r.education.map((e, i) => (
        <ItemCard
          key={e.id}
          title={e.degree || 'Nouveau diplôme'}
          subtitle={e.school}
          open={open === e.id}
          onToggle={() => setOpen(open === e.id ? null : e.id)}
          onUp={i > 0 ? () => up((x) => move(x.education, i, -1)) : undefined}
          onDown={i < r.education.length - 1 ? () => up((x) => move(x.education, i, 1)) : undefined}
          onDelete={() => up((x) => void x.education.splice(i, 1))}
        >
          <Field label="Diplôme">
            <input className="input" value={e.degree} onChange={(ev) => up((x) => void (x.education[i].degree = ev.target.value))} placeholder="Master Informatique" />
          </Field>
          <div className="grid-2">
            <Field label="École / Université">
              <input className="input" value={e.school} onChange={(ev) => up((x) => void (x.education[i].school = ev.target.value))} />
            </Field>
            <Field label="Lieu">
              <input className="input" value={e.location} onChange={(ev) => up((x) => void (x.education[i].location = ev.target.value))} />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Début">
              <input className="input" type="month" value={e.start} onChange={(ev) => up((x) => void (x.education[i].start = ev.target.value))} />
            </Field>
            <Field label="Fin">
              <input className="input" type="month" value={e.end} onChange={(ev) => up((x) => void (x.education[i].end = ev.target.value))} />
            </Field>
          </div>
          <Field label="Détails (mention, spécialité)">
            <AutoTextarea className="textarea" style={{ minHeight: 60 }} value={e.details} onChange={(ev) => up((x) => void (x.education[i].details = ev.target.value))} />
          </Field>
          <div className="field">
            <span>{!e.end || e.end >= new Date().toISOString().slice(0, 7) ? 'Les 3 principaux cours de cette année (rassurent le recruteur)' : 'Les 3 principaux cours suivis'}</span>
            <TagsInput
              value={e.courses ?? []}
              onChange={(v) => up((x) => void (x.education[i].courses = v.slice(0, 3)))}
              placeholder={(e.courses ?? []).length >= 3 ? '3 cours maximum' : 'Développement web, Gestion de projet, UX design…'}
            />
          </div>
        </ItemCard>
      ))}
    </>
  )
}

// ---------- Compétences ----------

export function SkillsForm({ r, up }: { r: Resume; up: Up }) {
  const visual = isVisual(r.templateId)
  // Modèles visuels « portfolio » (Vitrine, Studio…) : la présentation en tuiles affiche toujours les icônes.
  const tileModel = visual && !usesDesignEngine(r.templateId) && !isReplica(r.templateId)
  // Groupe « Savoir-être » (ou « Soft skills ») : créé au premier clic sur un exemple.
  const SOFT_NAME = r.lang === 'en' ? 'Soft skills' : 'Savoir-être'
  const isSoft = (name: string) => /^(savoir[- ]?[êe]tre|soft skills?|qualit[ée]s)/i.test(name.trim())
  const softIndex = r.skills.findIndex((g) => isSoft(g.name))
  const toggleSoft = (q: string) =>
    up((x) => {
      let g = x.skills.find((y) => isSoft(y.name))
      if (!g) x.skills.push((g = { id: uid(), name: SOFT_NAME, items: [] }))
      g.items = g.items.includes(q) ? g.items.filter((y) => y !== q) : [...g.items, q]
      if (!g.items.length) x.skills.splice(x.skills.indexOf(g), 1)
    })
  return (
    <>
      <SectionTitle
        action={
          <button className="btn btn-soft btn-sm" onClick={() => up((x) => void x.skills.push({ id: uid(), name: '', items: [] }))}>
            <Plus size={14} /> Groupe
          </button>
        }
      >
        Compétences
      </SectionTitle>
      <div className="mono-label">Écrivez les compétences exactement comme dans les offres (ex. « React.js », « Gestion de projet »). Entrée ou virgule pour valider.</div>
      {r.skills.length === 0 && <div className="empty">Ajoutez un groupe : Langages, Outils, Méthodes, Savoir-être…</div>}
      <div className="item-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="label">Savoir-être : choisissez-en 3 à 5 (cliquez pour ajouter ou retirer)</div>
        <div className="chips">
          {SOFT_SKILLS[r.lang].map((q) => {
            const on = r.skills[softIndex]?.items.includes(q) ?? false
            return (
              <button key={q} type="button" className={`chip ${on ? 'active' : ''}`} onClick={() => toggleSoft(q)}>
                {q}
              </button>
            )
          })}
        </div>
      </div>
      {r.skills.map((g, i) => (
        <div key={g.id} className="item-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row">
            <input
              className="input"
              style={{ fontWeight: 600 }}
              value={g.name}
              placeholder="Nom du groupe (facultatif)"
              onChange={(ev) => up((x) => void (x.skills[i].name = ev.target.value))}
            />
            <button className="icon-btn sm" disabled={i === 0} onClick={() => up((x) => move(x.skills, i, -1))}>
              <ArrowUp size={14} />
            </button>
            <button className="icon-btn sm" disabled={i === r.skills.length - 1} onClick={() => up((x) => move(x.skills, i, 1))}>
              <ArrowDown size={14} />
            </button>
            <button className="icon-btn sm" onClick={() => up((x) => void x.skills.splice(i, 1))}>
              <Trash2 size={14} />
            </button>
          </div>
          <TagsInput value={g.items} onChange={(v) => up((x) => void (x.skills[i].items = v))} placeholder="TypeScript, React, SQL…" />
          {visual && (
            <div className="seg" style={{ alignSelf: 'flex-start' }} title="Présentation dans le modèle visuel">
              {(
                [
                  ['tiles', 'Tuiles d’outils'],
                  ['chips', 'Pastilles'],
                  ['list', 'Texte']
                ] as const
              ).map(([v, label]) => (
                <button key={v} className={(g.display ?? 'list') === v ? 'on' : ''} onClick={() => up((x) => void (x.skills[i].display = v))}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {(() => {
            const tiles = tileModel && (g.display ?? 'list') === 'tiles'
            return (
              <>
                <label className="check" style={{ alignSelf: 'flex-start' }} title={tiles ? 'Toujours affichées en tuiles d’outils' : 'Petite icône devant chaque logiciel, sur tous les modèles'}>
                  <input type="checkbox" checked={tiles || Boolean(g.showIcons)} disabled={tiles} onChange={(e) => up((x) => void (x.skills[i].showIcons = e.target.checked))} /> Icônes des logiciels
                </label>
                {!visual && g.showIcons && <span className="muted" style={{ fontSize: 12 }}>Décoratives : le nom reste en texte, les ATS le lisent normalement.</span>}
              </>
            )
          })()}
          {(g.showIcons || (visual && (g.display ?? 'list') === 'tiles')) && (
            <>
              <span className="mono-label">Icônes des logiciels : banque d’icônes, ou déposez votre propre image</span>
              <IconEditor r={r} groupIndex={i} up={up} />
            </>
          )}
        </div>
      ))}
    </>
  )
}

// ---------- Projets, certifications, langues, intérêts ----------

export function ExtrasForm({ r, up }: { r: Resume; up: Up }) {
  return (
    <>
      <SectionTitle
        action={
          <button className="btn btn-soft btn-sm" onClick={() => up((x) => void x.projects.push({ id: uid(), name: '', link: '', description: '' }))}>
            <Plus size={14} /> Projet
          </button>
        }
      >
        Projets
      </SectionTitle>
      {r.projects.map((p, i) => (
        <div key={p.id} className="item-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row">
            <input className="input" style={{ fontWeight: 600 }} value={p.name} placeholder="Nom du projet" onChange={(ev) => up((x) => void (x.projects[i].name = ev.target.value))} />
            <button className="icon-btn sm" onClick={() => up((x) => void x.projects.splice(i, 1))}>
              <Trash2 size={14} />
            </button>
          </div>
          <input className="input" value={p.link} placeholder="Lien (facultatif)" onChange={(ev) => up((x) => void (x.projects[i].link = ev.target.value))} />
          <AutoTextarea className="textarea" style={{ minHeight: 50 }} value={p.description} placeholder="Description courte, technologies, résultat" onChange={(ev) => up((x) => void (x.projects[i].description = ev.target.value))} />
        </div>
      ))}

      <SectionTitle
        action={
          <button className="btn btn-soft btn-sm" onClick={() => up((x) => void x.certifications.push({ id: uid(), name: '', issuer: '', date: '' }))}>
            <Plus size={14} /> Certification
          </button>
        }
      >
        Certifications
      </SectionTitle>
      {r.certifications.map((c, i) => (
        <div key={c.id} className="item-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row">
            <input className="input" style={{ fontWeight: 600 }} value={c.name} placeholder="Intitulé exact de la certification" onChange={(ev) => up((x) => void (x.certifications[i].name = ev.target.value))} />
            <button className="icon-btn sm" onClick={() => up((x) => void x.certifications.splice(i, 1))}>
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid-2">
            <input className="input" value={c.issuer} placeholder="Organisme" onChange={(ev) => up((x) => void (x.certifications[i].issuer = ev.target.value))} />
            <input className="input" type="month" value={c.date} onChange={(ev) => up((x) => void (x.certifications[i].date = ev.target.value))} />
          </div>
        </div>
      ))}

      <SectionTitle
        action={
          <button className="btn btn-soft btn-sm" onClick={() => up((x) => void x.languages.push({ id: uid(), name: '', level: '' }))}>
            <Plus size={14} /> Langue
          </button>
        }
      >
        Langues
      </SectionTitle>
      <div className="mono-label">Niveaux du cadre européen obligatoires (A1 à C2). Inutile d’indiquer {r.lang === 'en' ? 'English' : 'le français'} : le CV est rédigé dans cette langue.</div>
      {r.languages.map((l, i) => {
        // Niveau CECRL + certification facultative (« C1, TOEIC 945 »).
        const level = cefrLevel(l.level, r.lang)
        const code = (CEFR as readonly string[]).includes(level.slice(0, 2)) ? level.slice(0, 2) : /maternelle|native/i.test(level) ? 'native' : ''
        const cert = code === 'native' ? '' : level.replace(code, '').replace(/^[\s,]+/, '')
        const native = r.lang === 'en' ? 'Native' : 'Langue maternelle'
        const setLevel = (c: string, ce: string) => up((x) => void (x.languages[i].level = c === 'native' ? native : [c, ce.trim()].filter(Boolean).join(', ')))
        return (
          <div key={l.id} className="row">
            <input className="input" value={l.name} placeholder="Anglais" onChange={(ev) => up((x) => void (x.languages[i].name = ev.target.value))} />
            <Select value={code} onChange={(ev) => setLevel(ev.target.value, cert)} aria-label="Niveau CECRL">
              <option value="">Niveau…</option>
              {CEFR.map((c) => (
                <option key={c} value={c}>
                  {c} · {CEFR_HINT[r.lang][c]}
                </option>
              ))}
              <option value="native">{native}</option>
            </Select>
            <input className="input" value={cert} disabled={code === 'native'} placeholder="TOEIC 900 (facultatif)" onChange={(ev) => setLevel(code, ev.target.value)} />
            <button className="icon-btn sm" onClick={() => up((x) => void x.languages.splice(i, 1))}>
              <Trash2 size={14} />
            </button>
          </div>
        )
      })}

      <SectionTitle>Centres d’intérêt</SectionTitle>
      <input className="input" value={r.interests} placeholder="Facultatif : ce qui vous distingue" onChange={(ev) => up((x) => void (x.interests = ev.target.value))} />
    </>
  )
}

// ---------- Mise en page ----------

export function LayoutForm({ r, up }: { r: Resume; up: Up }) {
  const t = SECTION_TITLES[r.lang]
  const toggle = (k: SectionKey) => up((x) => void (x.hidden = x.hidden.includes(k) ? x.hidden.filter((h) => h !== k) : [...x.hidden, k]))
  return (
    <>
      <SectionTitle>Ordre et visibilité des sections</SectionTitle>
      <div className="mono-label">L’ordre recommandé pour un ATS : Profil, Expérience, Compétences, Formation.</div>
      {r.sectionOrder.map((k, i) => {
        const hidden = r.hidden.includes(k)
        return (
          <div key={k} className="item-card row" style={{ padding: '8px 8px 8px 14px', opacity: hidden ? 0.55 : 1 }}>
            <span className="mono muted" style={{ fontSize: 12, width: 18 }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, fontWeight: 550 }}>{t[k]}</span>
            <button className="icon-btn sm" disabled={i === 0} onClick={() => up((x) => move(x.sectionOrder, i, -1))}>
              <ArrowUp size={14} />
            </button>
            <button className="icon-btn sm" disabled={i === r.sectionOrder.length - 1} onClick={() => up((x) => move(x.sectionOrder, i, 1))}>
              <ArrowDown size={14} />
            </button>
            <button className="icon-btn sm" onClick={() => toggle(k)} title={hidden ? 'Afficher' : 'Masquer'}>
              {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        )
      })}
    </>
  )
}
