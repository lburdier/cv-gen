import { createContext, type KeyboardEvent } from 'react'

/** Mode « toile » : édition directe du CV (fournie par CanvasEditor, absente à l'export). */
export interface CanvasApi {
  /** Enregistre la valeur d'un champ (chemin du type « experiences.0.bullets.2 »). */
  commit(path: string, value: string): void
  /** Raccourcis clavier dans un champ : Entrée, Retour arrière, Échap. */
  key(path: string, e: KeyboardEvent<HTMLElement>): void
}

export const CanvasContext = createContext<CanvasApi | null>(null)
