import { noDash } from '../../shared/format'
import { create } from 'zustand'
import type { ActivityItem, AppData, ChatTurn, CoverLetter, Offer, Resume, Settings } from '../../shared/types'
import { blankResume, normalizeResume, sampleFor, uid, type PreviewGender } from './lib/sample'
import { getTemplate } from './templates/registry'

export type Route =
  | { name: 'dashboard' }
  | { name: 'resumes' }
  | { name: 'templates' }
  | { name: 'colors'; colors?: string[]; resumeId?: string }
  | { name: 'from-image' }
  | { name: 'ats-scan' }
  | { name: 'profile' }
  | { name: 'editor'; id: string }
  | { name: 'offers'; id?: string; tailor?: boolean }
  | { name: 'letters'; id?: string }
  | { name: 'settings' }

export interface Toast {
  id: string
  kind: 'success' | 'error' | 'info'
  title: string
  detail?: string
  action?: { label: string; run: () => void }
}

interface State {
  loaded: boolean
  initError: string | null
  data: AppData
  settings: Settings
  route: Route
  paletteOpen: boolean
  /** Profil d'exemple des aperçus et des CV créés depuis l'exemple : mixte, fille ou garçon. */
  previewGender: PreviewGender
  setPreviewGender(g: PreviewGender): void
  assistantOpen: boolean
  chat: ChatTurn[]
  toasts: Toast[]
  busy: string | null
  dark: boolean

  init(): Promise<void>
  go(route: Route): void
  setSettings(patch: Partial<Settings>): Promise<void>
  setDark(dark: boolean): void

  createResume(opts?: { templateId?: string; sample?: boolean; from?: Partial<Resume> }): Resume
  updateResume(id: string, fn: (r: Resume) => void): void
  deleteResume(id: string): void
  duplicateResume(id: string, patch?: Partial<Resume>): Resume | null

  saveOffer(offer: Offer): void
  deleteOffer(id: string): void

  saveLetter(letter: CoverLetter): void
  deleteLetter(id: string): void

  /** Applique une modification avec un toast « Annuler » qui restaure l'état précédent. */
  withUndo(title: string, fn: () => void, detail?: string): void
  /** Change le modèle d'un CV en conservant couleur et police personnalisées. */
  applyTemplate(id: string, templateId: string): void
  /** Modifie le profil maître (créé vide au premier appel). */
  updateProfile(fn: (r: Resume) => void): void
  setProfile(r: Resume | undefined): void
  setProfileMode(on: boolean): void
  clearActivity(): void
  replaceData(data: AppData, title: string): void

  log(kind: ActivityItem['kind'], label: string): void
  toast(t: Omit<Toast, 'id'>): void
  dismiss(id: string): void
  /** Exécute une tâche longue avec la pastille d'activité et un toast d'erreur. */
  run<T>(label: string, fn: () => Promise<T>): Promise<T | undefined>

  setPalette(open: boolean): void
  setAssistant(open: boolean): void
  setChat(chat: ChatTurn[]): void
}

const emptyData: AppData = { version: 1, resumes: [], offers: [], letters: [], activity: [] }
const defaultSettings: Settings = {
  hasApiKey: false,
  hasClaudeKey: false,
  hasOpenRouterKey: false,
  provider: 'anthropic',
  model: 'claude-opus-5-5',
  orModel: 'openrouter/free',
  localModel: 'qwen3-0.6b',
  hasLocalModel: false,
  claudeAuth: 'key',
  hasClaudeLogin: false,
  theme: 'light',
  userName: '',
  encryptionAvailable: true
}

let saveTimer: ReturnType<typeof setTimeout> | undefined
let dirty = false

export const useStore = create<State>((set, get) => {
  const persist = () => {
    clearTimeout(saveTimer)
    dirty = true
    saveTimer = setTimeout(() => {
      dirty = false
      window.cvgen.saveData(get().data).catch((e: Error) => {
        dirty = true
        get().toast({ kind: 'error', title: 'Enregistrement impossible', detail: e.message })
      })
    }, 350)
  }
  // Fermeture de la fenêtre pendant le délai d'enregistrement : on enregistre tout de suite.
  window.addEventListener('beforeunload', () => {
    if (!dirty || !get().loaded) return
    clearTimeout(saveTimer)
    window.cvgen.saveDataSync(get().data)
  })
  const setData = (fn: (d: AppData) => AppData) => {
    set({ data: fn(get().data) })
    persist()
  }

  return {
    loaded: false,
    initError: null,
    data: emptyData,
    settings: defaultSettings,
    route: { name: 'dashboard' },
    paletteOpen: false,
    previewGender: readGender(),
    assistantOpen: false,
    chat: [],
    toasts: [],
    busy: null,
    dark: false,

    async init() {
      try {
        if (!window.cvgen) throw new Error('Le pont avec Windows (preload) n’a pas été chargé.')
        const [data, settings] = await Promise.all([window.cvgen.loadData(), window.cvgen.getSettings()])
        set({
          data: {
            ...data,
            resumes: data.resumes.map(normalizeResume),
            letters: data.letters.map((l) => ({ ...l, title: noDash(l.title, ' · '), body: noDash(l.body) })),
            ...(data.profile ? { profile: normalizeResume(data.profile) } : {})
          },
          settings,
          route: restoredRoute() ?? get().route,
          loaded: true,
          initError: null
        })
      } catch (e) {
        const msg = (e as Error).message || String(e)
        window.cvgen?.logError?.('Démarrage : ' + msg)
        set({ initError: msg })
      }
    },

    go(route) {
      set({ route, paletteOpen: false })
    },

    async setSettings(patch) {
      const settings = await window.cvgen.setSettings(patch)
      set({ settings })
    },

    setDark(dark) {
      set({ dark })
    },

    createResume(opts = {}) {
      const base = opts.sample ? sampleFor(opts.templateId ?? 'atelier', get().previewGender) : blankResume(opts.templateId)
      const r: Resume = { ...base, ...opts.from, id: uid(), createdAt: Date.now(), updatedAt: Date.now() }
      setData((d) => ({ ...d, resumes: [r, ...d.resumes] }))
      get().log('create', `CV créé : ${r.title}`)
      return r
    },

    updateResume(id, fn) {
      setData((d) => ({
        ...d,
        resumes: d.resumes.map((r) => {
          if (r.id !== id) return r
          const copy = structuredClone(r)
          fn(copy)
          copy.updatedAt = Date.now()
          return copy
        })
      }))
    },

    deleteResume(id) {
      setData((d) => ({ ...d, resumes: d.resumes.filter((r) => r.id !== id), letters: d.letters.filter((l) => l.resumeId !== id) }))
    },

    duplicateResume(id, patch) {
      const src = get().data.resumes.find((r) => r.id === id)
      if (!src) return null
      const r: Resume = { ...structuredClone(src), title: `${src.title} (copie)`, ...patch, id: uid(), createdAt: Date.now(), updatedAt: Date.now() }
      setData((d) => ({ ...d, resumes: [r, ...d.resumes] }))
      return r
    },

    saveOffer(offer) {
      setData((d) => ({
        ...d,
        offers: d.offers.some((o) => o.id === offer.id) ? d.offers.map((o) => (o.id === offer.id ? offer : o)) : [offer, ...d.offers]
      }))
    },

    deleteOffer(id) {
      setData((d) => ({
        ...d,
        offers: d.offers.filter((o) => o.id !== id),
        resumes: d.resumes.map((r) => (r.offerId === id ? { ...r, offerId: undefined } : r))
      }))
    },

    saveLetter(letter) {
      setData((d) => ({
        ...d,
        letters: d.letters.some((l) => l.id === letter.id) ? d.letters.map((l) => (l.id === letter.id ? letter : l)) : [letter, ...d.letters]
      }))
    },

    deleteLetter(id) {
      setData((d) => ({ ...d, letters: d.letters.filter((l) => l.id !== id) }))
    },

    withUndo(title, fn, detail) {
      const before = get().data
      fn()
      // Une seule annulation possible : la précédente restaurerait un état plus ancien
      // et effacerait les actions faites depuis.
      set({ toasts: get().toasts.filter((t) => t.action?.label !== 'Annuler') })
      get().toast({ kind: 'success', title, detail, action: { label: 'Annuler', run: () => setData(() => before) } })
    },

    updateProfile(fn) {
      setData((d) => {
        const copy = structuredClone(d.profile ?? { ...blankResume('vitrine'), id: 'profile', title: 'Mon profil' })
        fn(copy)
        copy.updatedAt = Date.now()
        return { ...d, profile: copy }
      })
    },

    setProfile(r) {
      setData((d) => {
        const { profile: _old, ...rest } = d
        void _old
        return r ? { ...rest, profile: { ...r, id: 'profile', title: 'Mon profil', templateId: 'vitrine', updatedAt: Date.now() } } : rest
      })
    },

    setProfileMode(on) {
      setData((d) => ({ ...d, profileMode: on }))
    },

    applyTemplate(id, templateId) {
      const r = get().data.resumes.find((x) => x.id === id)
      if (!r || r.templateId === templateId) return
      const prev = getTemplate(r.templateId)
      const next = getTemplate(templateId)
      get().withUndo(`Modèle « ${next.name} » appliqué`, () =>
        get().updateResume(id, (x) => {
          x.templateId = next.id
          // La couleur et la police ne suivent le modèle que si elles n'ont pas été personnalisées.
          if (x.accent.toLowerCase() === prev.accent.toLowerCase()) x.accent = next.accent
          if (x.font === prev.font) x.font = next.font
        })
      )
    },

    replaceData(data, title) {
      get().withUndo(title, () => setData(() => ({ ...data, resumes: data.resumes.map(normalizeResume) })))
    },

    clearActivity() {
      get().withUndo('Historique effacé', () => setData((d) => ({ ...d, activity: [] })))
    },

    log(kind, label) {
      setData((d) => ({ ...d, activity: [{ id: uid(), at: Date.now(), kind, label }, ...d.activity].slice(0, 60) }))
    },

    toast(t) {
      const id = uid()
      set({ toasts: [...get().toasts, { ...t, id }] })
      // Les notifications avec « Annuler » restent plus longtemps.
      setTimeout(() => get().dismiss(id), t.action ? 9000 : t.kind === 'error' ? 7000 : 4200)
    },

    dismiss(id) {
      set({ toasts: get().toasts.filter((t) => t.id !== id) })
    },

    async run(label, fn) {
      set({ busy: label })
      try {
        return await fn()
      } catch (e) {
        // Message d'erreur sans le préfixe technique d'Electron (« Error invoking remote method … »).
        const msg = (e as Error).message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '')
        get().toast({
          kind: 'error',
          title: 'Action impossible',
          detail: msg,
          action: /clé API/i.test(msg) ? { label: 'Paramètres', run: () => get().go({ name: 'settings' }) } : undefined
        })
        return undefined
      } finally {
        set({ busy: null })
      }
    },

    setPreviewGender(g) {
      try {
        localStorage.setItem('cvgen.previewGender', g)
      } catch {
        /* préférence non mémorisée */
      }
      set({ previewGender: g })
    },

    setPalette(open) {
      set({ paletteOpen: open })
    },
    setAssistant(open) {
      set({ assistantOpen: open })
    },
    setChat(chat) {
      set({ chat })
    }
  }
})

declare global {
  interface Window {
    cvgen: import('../../shared/types').CvGenApi
  }
}

/** Page à rouvrir après un rechargement automatique (voir reloadIfStale). */
function restoredRoute(): Route | null {
  try {
    const raw = sessionStorage.getItem('cvgen.route')
    sessionStorage.removeItem('cvgen.route')
    return raw ? (JSON.parse(raw) as Route) : null
  } catch {
    return null
  }
}

function readGender(): PreviewGender {
  try {
    const g = localStorage.getItem('cvgen.previewGender')
    return g === 'f' || g === 'm' ? g : 'all'
  } catch {
    return 'all'
  }
}
