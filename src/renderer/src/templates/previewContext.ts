import { createContext, useContext } from 'react'

/** Vrai dans l'aperçu de l'éditeur et les miniatures : affiche des textes indicatifs si le CV est vide. */
export const PreviewContext = createContext(false)

export function usePlaceholders() {
  const preview = useContext(PreviewContext)
  return {
    first: (v: string) => v || (preview ? 'Prénom' : ''),
    last: (v: string) => v || (preview ? 'Nom' : ''),
    headline: (v: string) => v || (preview ? 'Titre du poste visé' : '')
  }
}

/** Vrai uniquement dans l'aperçu de l'éditeur : les éléments deviennent cliquables pour être modifiés. */
export const EditableContext = createContext(false)
