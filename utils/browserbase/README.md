# browserbase - Modules de Navigation Cloud

Ce répertoire contient deux modules pour utiliser **BrowserBase**, une plateforme de navigateurs headless dans le cloud, similaire à Browserless mais avec l'API REST de BrowserBase.

## 📁 Fichiers

- `launchBrowserBase.js` - Module principal pour lancer des navigateurs BrowserBase
- `testBrowserBase.js` - Module de test pour vérifier le fonctionnement
- `README.md` - Cette documentation

## 🚀 Installation et Configuration

### 1. Variables d'environnement

Ajoutez ces variables à votre fichier `.env` :

```bash
# Configuration BrowserBase
BROWSERBASE_API_KEY=votre_api_key_ici
BROWSERBASE_PROJECT_ID=votre_project_id_ici
```

### 2. Obtenir les clés API

1. Créez un compte sur [BrowserBase](https://browserbase.com)
2. Récupérez votre **API Key** et **Project ID** depuis votre tableau de bord
3. Ajoutez-les à votre fichier `.env`

## 🛠️ Utilisation

### Import du module

```javascript
import { 
  launchBrowserBase, 
  waitForTimeout, 
  closeBrowserBase,
  getBrowserBaseSession
} from './utils/browserbase/launchBrowserBase.js';
```

### Lancer un navigateur simple

```javascript
const { browser, page, sessionId } = await launchBrowserBase();

// Naviguer vers un site
await page.goto('https://example.com');

// Fermer le navigateur
await closeBrowserBase(browser, sessionId);
```

### Lancer avec des options avancées

```javascript
const { browser, page, sessionId } = await launchBrowserBase({
  useProxy: true,                    // Activer les proxies résidentiels
  region: 'us-east-1',              // Région du serveur (us-east-1, eu-west-1, etc.)
  viewport: { width: 1920, height: 1080 },
  timeout: 3600,                     // Timeout de session en secondes (max 21600)
  puppeteerTimeout: 60000,           // Timeout de connexion Puppeteer en millisecondes
  keepAlive: false,                  // Maintenir la session active
  userAgent: 'Custom User Agent'     // User agent personnalisé
});
```

### Fonctions utilitaires

```javascript
// Attendre un délai
await waitForTimeout(5000);

// Obtenir des informations sur la session
const sessionInfo = await getBrowserBaseSession(sessionId);

// Fermer proprement (avec fermeture de session)
await closeBrowserBase(browser, sessionId);
```

## 🧪 Test des modules

Pour tester les modules, exécutez :

```bash
node utils/browserbase/testBrowserBase.js
```

Le test :
- Lance un navigateur BrowserBase avec proxy
- Navigue vers Google
- Prend une capture d'écran
- Teste la géolocalisation sur mylocation.org
- Sauvegarde les captures d'écran dans le répertoire racine
- Ferme proprement la session

## 📊 Fonctionnalités

### ✅ Disponibles

- **API REST** : Création de sessions via l'API BrowserBase
- **Connexion WebSocket** : Connexion Puppeteer standard
- **Proxies résidentiels** : Support des proxies BrowserBase
- **Régions multiples** : Choix de la région du serveur
- **Anti-détection** : Scripts pour éviter la détection d'automation
- **Gestion de session** : Création, utilisation et fermeture propre
- **User agents aléatoires** : Utilisation du fichier sessions.json
- **Headers français** : Configuration pour la France

### 🔧 Configuration par défaut

- **Région** : `us-east-1`
- **Viewport** : `1920x1080`
- **Timeout** : `120000ms` (2 minutes)
- **Proxy** : Désactivé par défaut
- **User Agent** : Aléatoire depuis sessions.json
- **Langue** : Français (fr-FR)

## 🆚 Comparaison avec les autres modules

| Fonctionnalité | BrowserBase | Browserless | Puppeteer Local |
|---|---|---|---|
| Infrastructure | Cloud BrowserBase | Cloud Browserless | Local |
| Proxy | Natif | Natif | Configuration manuelle |
| Scalabilité | Excellent | Excellent | Limité |
| Coût | Payant | Payant | Gratuit |
| Maintenance | Aucune | Aucune | Système local |

## 🔗 Liens utiles

- [Documentation BrowserBase](https://docs.browserbase.com)
- [API Reference](https://docs.browserbase.com/reference/api/overview)
- [Tableau de bord](https://browserbase.com/dashboard)

## 🚨 Notes importantes

1. **Clés API** : Assurez-vous d'avoir configuré `BROWSERBASE_API_KEY` et `BROWSERBASE_PROJECT_ID`
2. **Quotas** : Respectez les limites de votre plan BrowserBase
3. **Fermeture** : Utilisez toujours `closeBrowserBase()` pour éviter les sessions orphelines
4. **Gestion d'erreurs** : Implémentez une gestion d'erreurs robuste pour les appels API

## 🔧 Intégration dans vos projets

Vous pouvez maintenant utiliser ces modules dans vos autres scripts à la place de `launchBrowser()` ou `launchBrowserless()` :

```javascript
// Ancienne méthode
import { launchBrowser } from './utils/puppeteer/launchBrowser.js';

// Nouvelle méthode BrowserBase
import { launchBrowserBase } from './utils/browserbase/launchBrowserBase.js';

// Utilisation identique
const { browser, page } = await launchBrowserBase();
``` 