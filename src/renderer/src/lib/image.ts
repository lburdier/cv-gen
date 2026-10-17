// Import d'images (photo, bandeau, galerie).
// Le fichier est lu en data URL : les adresses blob: sont bloquées par la politique de
// sécurité de la page (img-src 'self' data:), ce qui empêchait tout import auparavant.

const MAX_BYTES = 30 * 1024 * 1024

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Ce fichier n’est pas une image lisible.'))
    img.src = src
  })
}

/** Vrai si l'image contient des pixels transparents (échantillonnage). */
function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data
  const step = Math.max(4, Math.floor(data.length / 4 / 40000) * 4)
  for (let i = 3; i < data.length; i += step) if (data[i] < 250) return true
  return false
}

/**
 * Redimensionne une image et la renvoie en data URL.
 * Les images avec transparence (PNG détouré, logo) restent en PNG ; les autres passent en JPEG.
 */
export async function processImageFile(file: File, maxSide = 1400, quality = 0.88): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(`« ${file.name} » n’est pas une image (PNG, JPEG, WebP…).`)
  if (file.size > MAX_BYTES) throw new Error(`Image trop lourde (${Math.round(file.size / 1024 / 1024)} Mo, 30 Mo maximum).`)
  const src = await readAsDataUrl(file)
  const img = await loadImage(src)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) throw new Error('Image vide ou illisible.')
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  if (hasAlpha(ctx, canvas.width, canvas.height)) return canvas.toDataURL('image/png')
  return canvas.toDataURL('image/jpeg', quality)
}

/** Ouvre le sélecteur de fichiers. Renvoie null si l'utilisateur annule ; lève une erreur lisible sinon. */
export function pickImage(maxSide = 1400, quality = 0.88): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.addEventListener('cancel', () => resolve(null))
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      processImageFile(file, maxSide, quality).then(resolve, reject)
    }
    input.click()
  })
}

/**
 * Choisit une image (sélecteur) ou traite un fichier déposé, avec un message clair en cas d'erreur.
 * Partagé par les formulaires et l'édition directe dans l'aperçu.
 */
export async function chooseImage(maxSide: number, file?: File): Promise<string | null> {
  try {
    return file ? await processImageFile(file, maxSide) : await pickImage(maxSide)
  } catch (e) {
    const { useStore } = await import('../store')
    useStore.getState().toast({ kind: 'error', title: 'Image non importée', detail: (e as Error).message })
    return null
  }
}
