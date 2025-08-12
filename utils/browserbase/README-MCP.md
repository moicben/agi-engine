# Configuration MCP + Browserbase + Stagehand

## 🎯 **Objectif**
Créer des workflows d'automatisation guidés par l'IA en langage naturel, puis générer automatiquement le code JavaScript équivalent.

## ✅ **Setup Complet**

### 1. **Fichiers configurés**
- `utils/browserbase/mcpLauncher.js` - Launcher principal
- `/Users/ben/.cursor/mcp.json` - Configuration MCP pour Cursor
- `workflows/generated/` - Dossier pour les workflows générés
- `package.json` - Dépendances installées

### 2. **Variables d'environnement requises**
```bash
export BROWSERBASE_API_KEY="bb_live_m-T9VnahBkG3X3JgErytfc-VUFY"
export BROWSERBASE_PROJECT_ID="df923009-d142-47d6-b496-a335041e601f" 
export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyCgQQMHAfoEIym04SADY6zO5bDJbt0muyM"
```

### 3. **Dépendances installées**
- `@browserbasehq/stagehand` - IA pour automatisation web
- `@browserbasehq/mcp-server-browserbase` - Serveur MCP
- `zod` - Validation de schémas

## 🚀 **Utilisation**

### Test de configuration
```bash
node utils/browserbase/mcpLauncher.js
```

### Créer un workflow guidé
```javascript
import { startMCPSession, endMCPSession } from './utils/browserbase/mcpLauncher.js';

// Démarrer une session
const { stagehand } = await startMCPSession();

// Utiliser l'agent IA avec des instructions naturelles
const result = await stagehand.agent('Navigate to WhatsApp web and login');

// Générer le code et sauvegarder
const code = `// Workflow généré
export async function loginWhatsApp() {
  // Code basé sur les actions effectuées
}`;
await endMCPSession(stagehand, code, 'whatsapp-login');
```

### Intégration avec Cursor (MCP)
Votre configuration MCP permet d'utiliser l'IA directement dans Cursor :
1. Ouvrez le chat IA dans Cursor
2. L'IA peut maintenant contrôler Browserbase via MCP
3. Donnez des instructions en français pour l'automatisation

## 🔧 **API Disponibles**

### `startMCPSession(options)`
- Démarre une session Browserbase + Stagehand
- Retourne `{ stagehand, browser, page, sessionId }`

### `stagehand.agent(instruction)`
- Fonction IA principale pour les instructions naturelles
- Exemple : `"Click on the login button and enter credentials"`

### `endMCPSession(stagehand, code, name)`
- Ferme la session et sauvegarde le code généré
- Fichiers sauvés dans `workflows/generated/`

### `createWorkflowFromInstructions(instructions, name)`
- Fonction complète pour créer un workflow depuis des instructions
- Génère automatiquement le code JS équivalent

## 💡 **Exemples d'usage**

### Workflow WhatsApp
```javascript
const instructions = `
1. Open WhatsApp Web
2. Wait for QR code or login form
3. Handle authentication flow
4. Navigate to a specific contact
5. Send a message
`;

await createWorkflowFromInstructions(instructions, 'whatsapp-send-message');
```

### Workflow Western Union
```javascript
const instructions = `
1. Navigate to Western Union website
2. Fill payment form with provided details
3. Handle 3D-Secure verification
4. Complete transaction
`;

await createWorkflowFromInstructions(instructions, 'western-union-payment');
```

## 🎯 **Prochaines étapes**

1. **Test avec vos workflows existants** : Intégrez dans `workflows/whatsapp/` ou `workflows/westernunion/`
2. **Utilisation via Cursor** : Testez les commandes MCP directement dans l'IDE
3. **Optimisation** : Affinez les instructions pour des workflows plus précis
4. **Intégration** : Connectez avec vos scripts existants dans `runners/`

## 🔗 **Liens utiles**
- [Documentation Browserbase](https://docs.browserbase.com)
- [Documentation Stagehand](https://docs.stagehand.dev) 
- [MCP Protocol](https://modelcontextprotocol.io)
