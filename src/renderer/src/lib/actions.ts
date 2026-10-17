import { DEFAULT_ORDER } from '../../../shared/format'
import { getPreset } from './presets'
import { activeProfile, profileAs } from './profile'
import { useStore } from '../store'
import { isEmptyResume, presetResume } from './sample'
import { getTemplate } from '../templates/registry'

/** Actions globales partagées par la palette de commandes, le tableau de bord et les pages. */
export const actions = {
  /** Nouveau CV complet à partir d'un preset métier. */
  newFromPreset(presetId: string) {
    const s = useStore.getState()
    const p = getPreset(presetId)
    const r = s.createResume({ templateId: p?.templateId, from: presetResume(presetId) })
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

  async importResume() {
    const s = useStore.getState()
    const imported = await s.run('Lecture du CV par l’IA…', () => window.cvgen.ai.importResume())
    if (!imported) return
    const t = getTemplate('atelier')
    const name = `${imported.basics.firstName} ${imported.basics.lastName}`.trim()
    const r = s.createResume({
      from: { ...imported, title: `CV importé${name ? ' — ' + name : ''}`, templateId: t.id, accent: t.accent, font: t.font, sectionOrder: [...DEFAULT_ORDER], hidden: [] }
    })
    s.log('import', `CV importé : ${r.title}`)
    s.toast({ kind: 'success', title: 'CV importé', detail: 'Vérifiez chaque section : l’IA a structuré votre document.' })
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
