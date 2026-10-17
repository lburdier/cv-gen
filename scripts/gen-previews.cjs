// Génère les images d'aperçu des modèles (src/renderer/src/assets/previews/<id>.jpg)
// à partir du CV d'exemple. Prérequis : `npm run build`. Usage : `npm run previews`.
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'src', 'renderer', 'src', 'assets', 'previews')
const registry = fs.readFileSync(path.join(ROOT, 'src', 'renderer', 'src', 'templates', 'registry.ts'), 'utf8')
const block = registry.slice(registry.indexOf('export const TEMPLATES'), registry.indexOf('export const TEMPLATE_TAGS'))
const ids = [...block.matchAll(/id: '([\w-]+)'/g)].map((m) => m[1])
// `npm run previews -- vitrine studio` : seulement ces modèles.
const only = process.argv.slice(2).filter((x) => ids.includes(x))
if (only.length) ids.splice(0, ids.length, ...only)

const W = 794
const H = 1123

app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  // Rendu hors écran : la netteté suit l'échelle d'affichage de Windows (1,5× à 150 %).
  const win = new BrowserWindow({ show: false, width: W, height: H, enableLargerThanScreen: true, webPreferences: { offscreen: true } })
  for (const id of ids) {
    // Paramètre distinct : sans lui, seul le #hash change et la page n'est pas rechargée.
    await win.loadFile(path.join(ROOT, 'out', 'renderer', 'index.html'), { hash: `/preview/${id}`, query: { t: id } })
    win.setContentSize(W, H)
    for (let i = 0; i < 50; i++) {
      if (await win.webContents.executeJavaScript('document.body.dataset.ready === "1"')) break
      await new Promise((r) => setTimeout(r, 100))
    }
    await new Promise((r) => setTimeout(r, 400))
    const img = await win.webContents.capturePage()
    const jpg = img.resize({ width: 900, quality: 'best' }).toJPEG(84)
    fs.writeFileSync(path.join(OUT, `${id}.jpg`), jpg)
    console.log(id.padEnd(12), Math.round(jpg.length / 1024) + ' Ko')
  }
  app.exit(0)
})
