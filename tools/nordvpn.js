/**
 * Ancien fichier nordvpn.js - REDIRIGÉ VERS NOUVELLE ARCHITECTURE
 *
 * Ce fichier utilise maintenant le nouveau service NordVPN modulaire.
 * Pour migrer votre code:
 *
 * ❌ ANCIEN:
 * import { getRandomServer, connectToServer } from './tools/nordvpn.js';
 * await connectToServer('ca');
 *
 * ✅ NOUVEAU:
 * import { nordVPNService } from './tools/nordvpn/index.js';
 * await nordVPNService.initialize();
 * await nordVPNService.connectToCountry('ca');
 *
 * 📖 Documentation complète: tools/nordvpn/README.md
 */

// Redirection vers le nouveau service
export * from './tools/nordvpn/legacy-bridge.js';

// Message de migration
console.log('⚠️  ATTENTION: Ce fichier utilise maintenant la nouvelle architecture NordVPN');
console.log('💡 Pour la meilleure expérience, migrez vers:');
console.log('   import { nordVPNService } from "./tools/nordvpn/index.js"');
console.log('📖 Documentation: tools/nordvpn/README.md\n');
