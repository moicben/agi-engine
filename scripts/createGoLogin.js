import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration GoLogin API
 */
const GOLOGIN_CONFIG = {
  token: process.env.GOLOGIN_API_KEY,
  apiUrl: 'https://api.gologin.com',
  targetCountry: 'FR' // Proxy français
};

console.log('🔧 Configuration GoLogin:', GOLOGIN_CONFIG);

/**
 * Vérifie la validité du token API GoLogin
 */
export async function checkGoLoginToken() {
  console.log('🔐 Vérification du token API...');
  
  try {
    const response = await fetch(`${GOLOGIN_CONFIG.apiUrl}/browser`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GOLOGIN_CONFIG.token}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Token API valide');
      const profiles = await response.json();
      console.log(`📊 ${profiles.length} profil(s) existant(s)`);
      return true;
    } else {
      console.error('❌ Token API invalide:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Détails de l\'erreur:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du token:', error.message);
    return false;
  }
}

/**
 * Crée un nouveau profil GoLogin avec proxy français
 */
export async function createGoLoginProfile() {
  console.log('🔧 Création d\'un nouveau profil GoLogin avec proxy français...');
  
  const profileConfig = {
    name: `Profile_FR_${Date.now()}`,
    os: 'win',
    browserType: 'chrome',
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      resolution: '1920x1080',
      language: 'fr-FR,fr;q=0.9,en;q=0.8',
      platform: 'Win32',
      hardwareConcurrency: 8
    },
    // Proxy français via GoLogin
    proxy: {
      mode: 'gologin',
      autoProxyRegion: 'FR'
    },
    // Géolocalisation française
    geolocation: {
      mode: 'manual',
      enabled: true,
      customize: true,
      latitude: 48.8566, // Paris
      longitude: 2.3522,
      accuracy: 100
    },
    // Timezone française
    timezone: {
      enabled: true,
      fillBasedOnIp: true,
      timezone: 'Europe/Paris'
    },
    // WebRTC configuration
    webRTC: {
      mode: 'alerted',
      enabled: true,
      customize: true,
      localIpMasking: true,
      fillBasedOnIp: true
    },
    // Empreinte digitale
    canvas: {
      mode: 'noise'
    },
    webGL: {
      mode: 'noise'
    },
    audioContext: {
      mode: 'noise'
    }
  };
    try {
    console.log('📤 Envoi de la configuration:', JSON.stringify(profileConfig, null, 2));
    
    const response = await fetch(`${GOLOGIN_CONFIG.apiUrl}/browser`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOLOGIN_CONFIG.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileConfig)
    });
    
    console.log('📊 Status de réponse:', response.status);
    console.log('📊 Headers de réponse:', Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Réponse d\'erreur:', errorText);
      throw new Error(`Erreur API GoLogin: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const profile = await response.json();
    console.log('📥 Réponse API complète:', JSON.stringify(profile, null, 2));
    console.log('✅ Profil GoLogin créé avec succès!');
    console.log('🆔 ID du profil:', profile.id);
    console.log('📍 Nom du profil:', profile.name);
    console.log('🌍 Configuration proxy:', profile.proxy);
    
    return {
      id: profile.id,
      name: profile.name,
      proxy: profile.proxy,
      geolocation: profile.geolocation,
      timezone: profile.timezone
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du profil:', error);
    
    // Log plus détaillé pour le debugging
    if (error.message.includes('fetch')) {
      console.error('❌ Erreur de connexion - vérifiez votre connexion internet et l\'URL de l\'API');
    }
    if (error.message.includes('401')) {
      console.error('❌ Erreur d\'authentification - vérifiez votre token API');
    }
    if (error.message.includes('400')) {
      console.error('❌ Erreur de configuration - vérifiez les paramètres du profil');
    }
    
    throw error;
  }
}

/**
 * Supprime un profil GoLogin
 */
export async function deleteGoLoginProfile(profileId) {
  console.log('🗑️ Suppression du profil GoLogin:', profileId);
  
  try {
    const response = await fetch(`${GOLOGIN_CONFIG.apiUrl}/browser/${profileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${GOLOGIN_CONFIG.token}`
      }
    });
    
    if (!response.ok) {
      console.warn(`Attention: Erreur suppression profil: ${response.status}`);
      return false;
    } else {
      console.log('✅ Profil supprimé avec succès');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du profil:', error);
    return false;
  }
}

/**
 * Liste tous les profils GoLogin
 */
export async function listGoLoginProfiles() {
  console.log('📋 Récupération de la liste des profils...');
  
  try {
    const response = await fetch(`${GOLOGIN_CONFIG.apiUrl}/browser`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GOLOGIN_CONFIG.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }
    
    const profiles = await response.json();
    console.log(`📊 ${profiles.length} profil(s) trouvé(s)`);
    
    profiles.forEach(profile => {
      console.log(`- ${profile.name} (${profile.id}) - ${profile.proxy?.mode || 'Sans proxy'}`);
    });
    
    return profiles;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des profils:', error);
    throw error;
  }
}

/**
 * Fonction principale de démonstration
 */
async function main() {
  console.log('🎯 Création d\'un profil GoLogin avec proxy français...');
  
  try {
    // Vérifier le token API
    if (GOLOGIN_CONFIG.token === 'YOUR_GOLOGIN_API_TOKEN' || !GOLOGIN_CONFIG.token) {
      throw new Error('⚠️ Veuillez configurer votre token GoLogin API dans le fichier .env (GOLOGIN_API_KEY)');
    }
    
    // Vérifier la validité du token
    const isTokenValid = await checkGoLoginToken();
    if (!isTokenValid) {
      throw new Error('⚠️ Token API invalide. Vérifiez votre clé dans le fichier .env');
    }
    
    // Créer le profil
    const profile = await createGoLoginProfile();
    
    console.log('\n🎉 Profil créé avec succès!');
    console.log('Vous pouvez maintenant utiliser ce profil dans GoLogin ou via l\'API.');
    console.log(`ID du profil: ${profile.id}`);
    
    // Optionnel: supprimer le profil après test
    const shouldDelete = false; // Changer en true pour supprimer automatiquement
    if (shouldDelete) {
      console.log('\n🧹 Suppression du profil de test...');
      await deleteGoLoginProfile(profile.id);
    }
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
const isMainModule = process.argv[1] && process.argv[1].endsWith('createGoLogin.js');

if (isMainModule) {
  main();
}