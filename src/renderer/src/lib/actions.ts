import { DEFAULT_ORDER } from '../../../shared/format'
import type { CvImport } from '../../../shared/types'
import { getPreset } from './presets'
import { activeProfile, profileAs } from './profile'
import { useStore } from '../store'
import { isEmptyResume, presetAs } from './sample'
import { getTemplate } from '../templates/registry'

/** Actions globales partagées par la palette de commandes, le tableau de bord et les pages. */
export const actions = {
  /** Nouveau CV complet à partir d'un preset métier. */
  newFromPreset(presetId: string) {
    const s = useStore.getState()
    const p = getPreset(presetId)
    const r = s.createResume({ templateId: p?.templateId, from: presetAs(presetId, s.previewGender) })
    s.go({ name: 'editor', id: r.id })
    s.toast({ kind: 'success', title: `Preset « ${p?.name ?? 'métier'} » créé`, detail: 'Remplacez le contenu d’exemple par votre parcours.' })
  },

  /** Nouveau CV : avec le profil s'il est actif (sauf exemple ou page vierge demandés). */
  newResume(templateId?: string, sample = false, blank = false) {
    const s = useStore.getState()
    const profile = !sample && !blank ? activeProfile(s.data) : null
    const r = profile ? s.createResume({ templateId, from: profileAs(profile, templateId ?? 'atelier') }) : s.createResume({ templateId, sample })
    s.go({ name: 'editor', id: r.id })
  },

  /** Nouveau CV reprenant le profil, avec un modèle et éventuellement une couleur. */
  newFromProfile(templateId: string, title?: string) {
    const s = useStore.getState()
    const p = s.data.profile
    if (!p) return actions.newResume(templateId)
    const r = s.createResume({ templateId, from: profileAs(p, templateId, { title }) })
    s.go({ name: 'editor', id: r.id })
    s.toast({ kind: 'success', title: 'CV créé avec votre profil', detail: 'Adaptez le titre et le profil à l’offre visée.' })
  },

  /**
   * Lit un CV (PDF, Word, texte) : fichier choisi dans l'explorateur ou déjà fourni (glisser-déposer).
   * Lecture locale, structurée par l'IA si une clé est enregistrée. Null si annulé ou en erreur.
   */
  async readCv(file?: { name: string; bytes: Uint8Array }): Promise<CvImport | null> {
    const s = useStore.getState()
    const f = file ?? (await s.run('Ouverture du fichier…', () => window.cvgen.cv.pick()))
    if (!f) return null
    const label = s.settings.hasApiKey ? 'Lecture du CV, puis structuration par l’IA…' : 'Lecture du CV…'
    return (await s.run(label, () => window.cvgen.cv.import(f.name, f.bytes))) ?? null
  },

  /** Importe un CV existant comme nouveau CV (modèle ATS une colonne) et l'ouvre dans l'éditeur. */
  async importResume(file?: { name: string; bytes: Uint8Array }) {
    const res = await actions.readCv(file)
    if (!res) return
    const s = useStore.getState()
    const imported = res.resume
    const t = getTemplate('atelier')
    const name = `${imported.basics.firstName} ${imported.basics.lastName}`.trim()
    const r = s.createResume({
      from: { ...imported, title: `CV importé${name ? ' · ' + name : ''}`, templateId: t.id, accent: t.accent, font: t.font, sectionOrder: [...DEFAULT_ORDER], hidden: [] }
    })
    s.log('import', `CV importé : ${r.title}`)
    const counts = [
      imported.experiences.length && `${imported.experiences.length} expérience${imported.experiences.length > 1 ? 's' : ''}`,
      imported.education.length && `${imported.education.length} formation${imported.education.length > 1 ? 's' : ''}`,
      imported.skills.reduce((n, g) => n + g.items.length, 0) && `${imported.skills.reduce((n, g) => n + g.items.length, 0)} compétences`
    ].filter(Boolean)
    s.toast({
      kind: 'success',
      title: res.method === 'ai' ? 'CV importé et structuré par l’IA' : 'CV importé',
      detail: res.note ?? `${counts.join(', ') || 'Contenu repris'}. Relisez chaque rubrique : la mise en forme d’origine peut avoir mélangé certains champs.`
    })
    s.go({ name: 'editor', id: r.id })
  },

  /** Suppressions immédiates, annulables depuis la notification. */
  deleteResume(id: string) {
    const s = useStore.getState()
    const r = s.data.resumes.find((x) => x.id === id)
    if (!r) return
    if (s.route.name === 'editor' && s.route.id === id) s.go({ name: 'resumes' })
    s.withUndo(`« ${r.title} » supprimé`, () => s.deleteResume(id))
  },

  deleteEmptyResumes() {
    const s = useStore.getState()
    const empties = s.data.resumes.filter(isEmptyResume)
    if (!empties.length) return
    s.withUndo(`${empties.length} CV vide${empties.length > 1 ? 's' : ''} supprimé${empties.length > 1 ? 's' : ''}`, () => empties.forEach((r) => s.deleteResume(r.id)))
  },

  deleteOffer(id: string) {
    const s = useStore.getState()
    const o = s.data.offers.find((x) => x.id === id)
    if (!o) return
    if (s.route.name === 'offers' && s.route.id === id) s.go({ name: 'offers' })
    s.withUndo(`Offre « ${o.title || 'sans titre'} » supprimée`, () => s.deleteOffer(id))
  },

  deleteLetter(id: string) {
    const s = useStore.getState()
    const l = s.data.letters.find((x) => x.id === id)
    if (!l) return
    if (s.route.name === 'letters' && s.route.id === id) s.go({ name: 'letters' })
    s.withUndo(`Lettre « ${l.title} » supprimée`, () => s.deleteLetter(id))
  },

  newOffer() {
    useStore.getState().go({ name: 'offers', id: 'new' })
  },

  toggleTheme() {
    const s = useStore.getState()
    s.setSettings({ theme: s.dark ? 'light' : 'dark' })
  },

  /** atsVersion : exporte le contenu d'un modèle visuel dans le modèle ATS « Atelier » (une colonne, sans images). */
  async exportResume(id: string, format: 'pdf' | 'docx' | 'txt', atsVersion = false) {
    const s = useStore.getState()
    const r = s.data.resumes.find((x) => x.id === id)
    if (!r) return
    const doc = atsVersion ? { ...r, templateId: 'atelier', font: 'inter' } : r
    const res = await s.run(`Export ${format.toUpperCase()} en cours…`, () => window.cvgen.exportResume(doc, format))
    if (!res || res.canceled) return
    if (res.ok) {
      s.log('export', `Export ${format.toUpperCase()} : ${r.title}`)
      s.toast({ kind: 'success', title: `CV exporté en ${format.toUpperCase()}`, detail: res.path })
    } else s.toast({ kind: 'error', title: 'Export impossible', detail: res.error })
  }
}
