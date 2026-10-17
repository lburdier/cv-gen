import { createRoot } from 'react-dom/client'
// Inter avec l'axe de taille optique : les grands titres passent en « Display ».
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/crimson-pro/wght.css'
import '@fontsource-variable/crimson-pro/wght-italic.css'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/source-serif-4'
import './styles/app.css'
import './styles/cv.css'
import './styles/cv-visual.css'
import './styles/cv-custom.css'
import App from './App'
import PreviewPage from './pages/Preview'
import PrintPage from './pages/Print'
import { useStore } from './store'
import { launchTour, useTour } from './components/Tour'

// Accès au store pour le débogage depuis les DevTools.
Object.assign(window, { __cvgenStore: useStore, __cvgenTour: { useTour, launchTour } })

// Toute erreur non rattrapée est consignée dans cvgen-erreurs.log.
window.addEventListener('error', (e) => window.cvgen?.logError?.(`${e.message} @ ${e.filename}:${e.lineno}`))
window.addEventListener('unhandledrejection', (e) => window.cvgen?.logError?.(`Promesse rejetée : ${(e.reason as Error)?.stack ?? String(e.reason)}`))

// Un fichier déposé hors d'une zone prévue ne doit pas remplacer l'app par l'image.
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('drop', (e) => e.preventDefault())

const printMatch = /^#\/print\/(\w+)/.exec(location.hash)
const previewMatch = /^#\/preview\/([\w-]+)/.exec(location.hash)

createRoot(document.getElementById('root')!).render(
  printMatch ? <PrintPage token={printMatch[1]} /> : previewMatch ? <PreviewPage templateId={previewMatch[1]} /> : <App />
)
