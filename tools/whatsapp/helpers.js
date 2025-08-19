/**
 * Helpers minimalistes
 * Fonctions utilitaires essentielles
 */

import { executeCommand } from './adb.js';
import { exec, execSync } from 'child_process';

/**z
 * Attendre un délai en ms
 */
export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


export async function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve(typeof stdout === 'string' ? stdout : { stdout, stderr });
    });
  });
}

export async function randomSleep(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  //console.log(`⌛️ Délai de ${delay}ms...`);
  return await sleep(delay);
}

/**
 * Réessayer une fonction avec backoff
 */
export async function retry(fn, attempts = 3, delay = 1000) {
  for (let i = 0; i < attempts; i++) {
        try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      
      console.log(`⚠️ Tentative ${i + 1}/${attempts} échouée, retry dans ${delay}ms`);
      await sleep(delay);
      delay *= 1.5; // Backoff exponentiel
    }
    }
}

// Noms de compte aléatoires
export async function randomName() {
const randomNames = ['John', 'Jane', 'Jim', 'Jill', 'Jack', 'Jill', 'Jim', 'Jane', 'John', 'Jack'];
    const randomSurnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    return randomNames[Math.floor(Math.random() * randomNames.length)] + ' ' + randomSurnames[Math.floor(Math.random() * randomSurnames.length)];
}

/**
 * Parser un numéro de téléphone
 */
export function parsePhone(country, number) {
  const countryPrefixes = {
    'FR': '+33',
    'UK': '+44',
    'US': '+1',
    'PH': '+63',
    'DE': '+49',
    'ES': '+34'
  };
  
  // Nettoyer le numéro
  const cleaned = number.replace(/[^\d]/g, '');
  
  // Ajouter le préfixe si nécessaire
  const prefix = countryPrefixes[country] || '+1';
  if (!number.startsWith('+')) {
    return prefix + cleaned;
    }

  return '+' + cleaned;
}

/**
 * Gestionnaire d'erreurs simple
 */
export function errorHandler(error, context = '') {
  const message = error.message || 'Erreur inconnue';
  const code = error.code || 'UNKNOWN';
  
  console.error(`❌ ${context}: ${message} (${code})`);
  
        return {
    success: false,
    error: message,
    code,
            context
  };
}

/**
 * Vérifier si une erreur est retriable
 */
export function isRetryableError(error) {
  const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
  const retryableMessages = ['timeout', 'network', 'temporarily'];
  
  return retryableCodes.includes(error.code) ||
  retryableMessages.some(msg => error.message?.toLowerCase().includes(msg));
}


// Fonction utilitaire pour tap
export async function tap(device, coords) {
  // Si coords est un objet avec x et y
  if (typeof coords === 'object' && coords.x !== undefined && coords.y !== undefined) {
    await executeCommand(device, `shell input tap ${coords.x} ${coords.y}`);
  } 
  // Sinon si ce sont des paramètres séparés (pour compatibilité)
  else {
    const x = coords;
    const y = arguments[2];
    await executeCommand(device, `shell input tap ${x} ${y}`);
  }
}

// Fonction utilitaire pour appuyer sur espace, tab ou enter
export async function press(device, key, repeat = 1) {
  for (let i = 0; i < repeat; i++) {
    await executeCommand(device, `shell input keyevent ${key}`);
    await sleep(100);
  }
}


// Fonction utilitaire pour écrire une phrase entière avec espace
export async function writeContent(device, sentence) {
  // Nettoyer et échapper le texte de manière robuste
  const cleanSentence = sentence
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[æ]/g, 'ae')
    .replace(/[œ]/g, 'oe')
    .replace(/[À-ÿ]/g, '') // Supprimer les autres caractères spéciaux
    .replace(/['"`]/g, '') // Supprimer les apostrophes et guillemets
    .replace(/[^\w\s\-.,!?]/g, ''); // Garder seulement lettres, chiffres, espaces et ponctuation basique
  
  // Échapper pour le shell
  const formattedSentence = cleanSentence.replace(/ /g, '\\ ');
  
  // Écrire la phrase
  if (formattedSentence.trim().length > 0) {
    await executeCommand(device, `shell input text "${formattedSentence}"`);
  }

  
}

// Fonction utilitaire pour parser les arguments nommés
export function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      
      // Si c'est l'argument device, parser les devices séparés par virgules
      if (key === 'device' && value) {
        if (value.includes(',')) {
          args[key] = value.split(',').map(d => d.trim());
        } 
        else if (value === 'all') {
          try {
            // Faire la commande "adb devices" et récupérer tous les devices
            const stdout = execSync('adb devices', { encoding: 'utf8' });
            const devices = stdout
              .split('\n')
              .filter(line => line.includes('\tdevice'))
              .map(line => line.split('\t')[0].trim())
              .filter(device => device.length > 0);
            args[key] = devices;
          } catch (error) {
            console.error(`Erreur lors de l'exécution de adb devices: ${error.message}`);
            args[key] = [];
          }
        }
        else {
          args[key] = value;
        }
      } else {
        args[key] = value;
      }
    }
  });
  return args;
}
        

