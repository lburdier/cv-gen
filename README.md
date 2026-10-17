# CV GEN

Application Windows pour créer des CV lisibles par les ATS et les adapter à chaque offre avec Claude ou des modèles gratuits via OpenRouter.

## Fonctionnalités

- **DA** inspirée de bradleyziffer.com et gabrielvaldivia.com : titres immenses en Inter Display, mots d'emphase en serif italique (Crimson Pro), beaucoup d'air, liens discrets, pilules détourées, grandes cartes arrondies et tableaux à filets fins. Noir et blanc, thème clair par défaut et sombre au choix. Palette de commandes `Ctrl K`, assistant IA `Ctrl J`, nouveau CV `Ctrl N`.
- **14 modèles** avec images d'aperçu : 4 visuels façon portfolio (Vitrine, Studio, Folio, Colonne : bandeau, photo, cartes, tuiles d'outils, galerie de rendus) et 10 modèles ATS une colonne (Essentiel, Éditorial, Rail, Mono, Atelier, Galerie, Direction, Classique, Compact, Brut ATS). Sélecteur visuel dans l'éditeur, couleur et police personnalisables.
- **Éditeur en direct** : formulaire par sections, aperçu A4 avec repères de sauts de page, réorganisation et masquage des sections, intitulés FR/EN.
- **Score ATS local** (hors ligne) : format, contenu (verbes d'action, résultats chiffrés, longueur…) et couverture des mots-clés de l'offre, plus une « Vue ATS » du texte extrait.
- **Presets complets** : 17 CV d'exemple réalistes par métier (tech, business, création, santé, droit et finance, étudiant), chacun avec son modèle, créables en un clic depuis la page Modèles ou la palette (Ctrl K).
- **IA (Claude ou OpenRouter gratuit)** : import de CV PDF/DOCX/TXT, analyse d'offre, adaptation du CV avec revue avant/après, réécriture de puces, rédaction du profil, lettres de motivation, assistant conversationnel. Consigne stricte : ne jamais inventer d'expérience.
- **Exports** : PDF balisé (tagged PDF + signets), Word natif (styles Titre 1/2), texte brut. Les modèles visuels s'exportent aussi en « PDF version ATS » (même contenu, une colonne, sans images).

## Garanties ATS

Modèles ATS et « version ATS » des modèles visuels : une seule colonne, ordre du DOM = ordre de lecture, vrais titres et listes, aucune information dans une image ou une icône, coordonnées dans le corps du document, dates MM/AAAA, séparateurs textuels entre compétences.

## Lancer l'app

Double-cliquez sur `lancer.bat` : il installe les dépendances au premier lancement, compile puis ouvre l'app. `lancer.bat dev` lance le mode développement avec rechargement à chaud.

## Développement

```bash
npm install
npm run dev        # lance l'app avec rechargement à chaud
npm run typecheck
npm run dist       # installateur NSIS + exe portable dans release/
npm run previews   # régénère les images d'aperçu des modèles (après modification d'un modèle)
```

En cas de souci, l'app consigne les erreurs dans `cvgen-erreurs.log` (dossier de données) et crée au lancement une sauvegarde horodatée dans le dossier `sauvegardes` (les 15 plus récentes, restaurables depuis Paramètres → Sauvegardes). Les suppressions et changements de modèle sont annulables depuis la notification.

La clé API se saisit dans **Paramètres** : Claude (Anthropic) ou OpenRouter (modèles gratuits, routeur `openrouter/free` par défaut). Chaque clé est chiffrée avec DPAPI (`safeStorage`) et n'est utilisée que dans le processus principal. Les données (CV, offres, lettres) sont stockées en JSON dans `%APPDATA%/CV GEN`.

## Structure

```
src/main       processus principal : fenêtre, IPC, IA (ai.ts), exports PDF/DOCX (export.ts), stockage
src/preload    pont sécurisé window.cvgen
src/shared     types et mise en forme communs (intitulés, dates, texte brut)
src/renderer   interface React : pages, composants, modèles de CV, analyse ATS (lib/ats.ts)
```
