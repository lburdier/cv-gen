# Installer CV GEN

Guide pas à pas pour installer CV GEN sur un PC Windows, sans rien connaître au code. Comptez 2 minutes.

**Il faut :** Windows 10 ou 11 (64 bits) et environ 400 Mo d’espace libre. Internet n’est utile que pour télécharger l’app, l’IA et la banque de photos : tout le reste fonctionne hors ligne.

---

## 1. Télécharger

Ouvrez la page des versions : **https://github.com/lburdier/cv-gen/releases/latest**

Dans la partie **Assets**, cliquez sur l’un des deux fichiers :

| Fichier | Pour qui |
| --- | --- |
| **`CV-GEN-Setup-x.y.z.exe`** (recommandé) | Installe l’app avec un raccourci sur le Bureau et dans le menu Démarrer, et se met à jour toute seule. |
| `CV-GEN-x.y.z-portable.exe` | Aucune installation : l’app se lance directement, depuis une clé USB par exemple. Le démarrage est un peu plus lent. |

Le fichier pèse environ 120 Mo.

### Le navigateur bloque le téléchargement ?

Edge peut afficher : *« CV-GEN-Setup-x.y.z.exe n’est pas fréquemment téléchargé. Assurez-vous que vous faites confiance à … avant de l’ouvrir. »*

Ce n’est **pas une erreur de l’app** : le navigateur prévient simplement que peu de gens ont déjà téléchargé ce fichier (l’app est indépendante et n’a pas de signature numérique payante). Pour le garder :

- **Edge** : survolez le téléchargement, cliquez sur **…** puis **Conserver**. Si une seconde fenêtre s’ouvre, cliquez sur **Afficher plus** puis **Conserver quand même**.
- **Chrome** : dans la liste des téléchargements, cliquez sur **Conserver** (ou ouvrez `chrome://downloads` et choisissez **Télécharger le fichier dangereux**).

Le fichier se trouve ensuite dans le dossier **Téléchargements**. S’il porte un nom comme `CV-GEN-Setup-x.y.z (1).exe`, c’est qu’il a été téléchargé deux fois : n’importe lequel des deux fonctionne.

> Déjà installée ? Inutile de retélécharger : l’app se met à jour toute seule (voir la partie 7).

## 2. Passer l’avertissement de Windows

L’app n’a pas de signature numérique payante, donc Windows affiche un écran bleu au premier lancement :

> **Windows a protégé votre ordinateur**

C’est normal pour une app indépendante. Pour continuer :

1. Cliquez sur **Informations complémentaires**.
2. Cliquez sur **Exécuter quand même**.

Cet écran n’apparaît qu’une fois.

## 3. Installer (fichier Setup)

1. Choisissez l’installation **pour l’utilisateur actuel uniquement**, puis **Suivant**.
2. Gardez le dossier proposé (ou choisissez-en un autre), puis **Installer**.
3. Laissez cochée la case qui lance CV GEN, puis **Terminer**.

Ensuite, l’app s’ouvre depuis l’icône **CV GEN** du Bureau ou du menu Démarrer.

## 4. Premier lancement

- Un tutoriel apparaît à la première visite de chaque page. Le bouton **?** en haut à droite le relance à tout moment.
- **Commencez par votre profil** : cliquez sur le rond en haut à droite et remplissez vos informations une seule fois. Tous les modèles les reprennent.
- Créez ensuite un CV depuis **Modèles**, ou importez un CV existant (PDF ou Word) depuis **Mes CV › Importer**.
- `Ctrl K` permet de tout retrouver : pages, modèles, presets, actions.

## 5. Activer l’IA (facultatif, peut être gratuit)

Sans IA, l’app fonctionne entièrement : création, modèles, score ATS, import de CV, brouillon de lettre, exports PDF et Word. L’IA ajoute l’adaptation du CV à une offre, la réécriture, la rédaction des lettres et l’assistant.

**Option hors ligne, sans compte : l’IA sur cet ordinateur**

1. Dans **Paramètres › Intelligence artificielle**, choisissez **Sur cet ordinateur**.
2. Cliquez sur **Télécharger** à côté de « Mini · Qwen3 0.6B » (397 Mo, une seule fois).

Le modèle tourne sur votre PC : gratuit, sans clé, sans limite, rien n’est envoyé en ligne. Il répond aux questions dans l’assistant et aide à rédiger les lettres : il part du brouillon guidé (vos vrais faits) et reformule chaque paragraphe, sans jamais changer un chiffre ni un nom. Il est trop petit pour analyser des offres ou adapter un CV. Installé, il sert aussi de secours automatique quand l’IA en ligne ne répond pas.

**Option gratuite : OpenRouter**

1. Créez un compte sur **https://openrouter.ai**.
2. Ouvrez **https://openrouter.ai/keys**, puis **Create Key**, et copiez la clé (elle commence par `sk-or-`).
3. Dans CV GEN, ouvrez **Paramètres** (roue dentée en haut à droite), choisissez **OpenRouter · gratuit**, collez la clé dans **Clé API**, puis cliquez sur **Enregistrer**.
4. Dans **Modèle**, laissez **Automatique (recommandé)**.

**Option payante, plus précise : Claude (Anthropic)**

Deux façons, toutes deux avec un compte développeur Claude Console (usage facturé sur les crédits API) :

- **Se connecter** : dans Paramètres, choisissez **Claude**, puis **Compte Anthropic › Se connecter avec Anthropic**. La page de connexion s’ouvre dans le navigateur ; l’app télécharge au premier clic l’outil officiel d’Anthropic (13 Mo) et la session se renouvelle toute seule.
- **Clé API** : créez une clé sur **https://platform.claude.com**, choisissez **Claude › Clé API** dans Paramètres et collez-la.

Un abonnement Claude Pro ou Max ne peut pas être utilisé par une autre application que celles d’Anthropic.

> La clé est chiffrée par Windows sur votre PC. Elle n’est envoyée qu’au fournisseur choisi. Ne la partagez avec personne.

## 6. Où sont mes données ?

Vos CV, offres et lettres restent **sur votre ordinateur**, dans `%APPDATA%\CV GEN`. Pour y accéder : **Paramètres › Données › Ouvrir le dossier des données**.

Une sauvegarde automatique est créée à chaque lancement (les 15 plus récentes), restaurable depuis **Paramètres › Sauvegardes**.

## 7. Mettre à jour

**Version installée (Setup) : rien à faire.** Depuis la version 1.1.0, CV GEN vérifie les nouvelles versions au démarrage puis toutes les 6 heures. Il les télécharge en arrière-plan et les installe quand vous fermez l’app. Une notification propose aussi **Redémarrer** pour installer tout de suite. L’état est affiché dans **Paramètres › Mises à jour**. Vos CV sont conservés.

> Vous avez installé la **1.0.0** ? Elle n’a pas encore ce système. Installez une fois la dernière version depuis la page de l’étape 1, par-dessus l’ancienne. Les mises à jour suivantes seront automatiques.

**Version portable :** l’app signale qu’une nouvelle version est disponible et ouvre la page de téléchargement. Remplacez simplement l’ancien fichier.

## 8. Désinstaller

**Paramètres Windows › Applications › Applications installées › CV GEN › Désinstaller**. Vos données restent dans `%APPDATA%\CV GEN`. Supprimez ce dossier pour tout effacer.

---

## Problèmes fréquents

**« L’app est déjà ouverte » ou rien ne se passe au double-clic**
CV GEN est déjà lancé, peut-être réduit dans la barre des tâches. Cherchez son icône. Sinon, fermez-le depuis le Gestionnaire des tâches (`Ctrl Maj Échap`) et relancez.

**L’antivirus bloque le fichier**
Même cause que l’avertissement Windows : l’app n’est pas signée. Le code source est public sur ce dépôt. Ajoutez une exception ou utilisez la version portable.

**L’IA répond « clé invalide » ou « limite atteinte »**
Vérifiez la clé dans Paramètres. Les modèles gratuits d’OpenRouter ont un quota par jour : réessayez plus tard ou choisissez un autre modèle gratuit dans la liste.

**La banque de photos ne charge rien**
Elle a besoin d’Internet. Les visuels « assortis » fonctionnent hors ligne.
