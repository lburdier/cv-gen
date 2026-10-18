# CV GEN

Application Windows pour créer des CV lisibles par les ATS et les adapter à chaque offre avec Claude ou des modèles gratuits via OpenRouter.

**[⬇ Télécharger pour Windows](https://github.com/lburdier/cv-gen/releases/latest)** · **[Guide d’installation](INSTALLATION.md)**

## Fonctionnalités

- **DA** inspirée de bradleyziffer.com et gabrielvaldivia.com : titres immenses en Inter Display, mots d'emphase en serif italique (Crimson Pro), beaucoup d'air, liens discrets, pilules détourées, grandes cartes arrondies et tableaux à filets fins. Noir et blanc, thème clair par défaut et sombre au choix. Palette de commandes `Ctrl K`, assistant IA `Ctrl J`, nouveau CV `Ctrl N`.
- **Studio de design : 500 modèles** (50 structures × 10 palettes) inspirés des meilleurs CV réels : colonnes latérales, bandeaux, mises en page éditoriales, CV compacts, corporate ou élégants, titres à filet, icônes de contact, noms en dégradé ou en contour, expériences en cartes. Filtres par famille, couleur, fond, mise en page, en-tête et photo ; aperçus Fille / Garçon avec photos ; chaque modèle se retouche entièrement (onglet Design ou toile), se recolore dans l’explorateur par couleurs et s’exporte aussi en version ATS.
- **28 modèles** avec images d’aperçu : 12 visuels façon portfolio (Vitrine, Studio, Folio, Colonne, Sur mesure, Pop, Calque, Manifeste, Affiche, Magazine, Brutal…) et 16 modèles ATS une colonne. Couleurs (48 teintes, couleur secondaire), police et densité personnalisables, explorateur par couleurs.
- **Profil** saisi une seule fois et repris par tous les modèles, **éditeur toile** façon Canva (modèles ATS et 500 modèles du studio : texte modifié sur place, sections et entrées déplaçables, palette, structure et design en direct), **CV recréé depuis une image**, **score ATS de n’importe quel PDF**, banques d’icônes de logiciels et d’images libres de droits, tutoriels intégrés.
- **Éditeur en direct** : formulaire par sections, aperçu A4 avec repères de sauts de page, réorganisation et masquage des sections, intitulés FR/EN.
- **Score ATS local** (hors ligne) : format, contenu (verbes d'action, résultats chiffrés, longueur…) et couverture des mots-clés de l'offre, plus une « Vue ATS » du texte extrait.
- **Presets complets** : 17 CV d'exemple réalistes par métier (tech, business, création, santé, droit et finance, étudiant), chacun avec son modèle, créables en un clic depuis la page Modèles ou la palette (Ctrl K).
- **Import de CV existants (PDF, Word, texte), sans IA** : lecture locale du PDF (colonnes, puces en retrait, lignes coupées), découpage en rubriques, expériences, formations, compétences et langues. Glisser-déposer sur l'accueil ou « Mes CV ». Avec une clé IA, l'IA structure le CV et la lecture locale complète ses oublis.
- **Lettres de motivation** : angle (poste, entreprise, reconversion, alternance, spontanée), longueur, motivation saisie par la personne, expériences à mettre en avant ; brouillon guidé sans IA ou rédaction par l'IA ; en-tête complet (destinataire, lieu et date, objet), vérification (longueur, mots-clés, formules creuses) et retouches en un clic.
- **IA hors ligne** : un petit modèle (Qwen3 0.6B, 397 Mo, téléchargé à la demande) tourne sur l'ordinateur avec llama.cpp. Gratuit, sans clé ni limite ; il répond dans l'assistant, aide à rédiger les lettres (reformulation fidèle du brouillon guidé, contrôlée paragraphe par paragraphe) et prend le relais quand le fournisseur en ligne échoue.
- **IA (Claude ou OpenRouter gratuit)** : analyse d'offre, adaptation du CV avec revue avant/après, réécriture de puces, rédaction du profil, assistant conversationnel avec choix du modèle. Réponses en flux et repli automatique sur un autre modèle gratuit. Consigne stricte : ne jamais inventer d'expérience.
- **Exports** : PDF balisé (tagged PDF + signets), Word natif (styles Titre 1/2), texte brut. Les modèles visuels s'exportent aussi en « PDF version ATS » (même contenu, une colonne, sans images).

## Garanties ATS

Modèles ATS et « version ATS » des modèles visuels : une seule colonne, ordre du DOM = ordre de lecture, vrais titres et listes, aucune information dans une image ou une icône, coordonnées dans le corps du document, dates MM/AAAA, séparateurs textuels entre compétences.

## Lancer l'app depuis le code

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
