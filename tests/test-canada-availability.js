/**
 * Script simple pour vérifier la disponibilité des numéros canadiens chez SMS-Activate
 */

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const SMS_API_URL = 'https://api.sms-activate.org/stubs/handler_api.php';
const CANADA_COUNTRY_CODE = 36; // Code pays pour le Canada
const WHATSAPP_SERVICE = 'wa';

async function checkCanadaAvailability() {
  const apiKey = process.env.SMS_ACTIVATE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ SMS_ACTIVATE_API_KEY manquante dans le fichier .env');
    return;
  }

  console.log('🇨🇦 VÉRIFICATION DISPONIBILITÉ NUMÉROS CANADA\n');
  console.log('═'.repeat(50));

  try {
    // 1. Vérifier le solde
    console.log('💳 Vérification du solde...');
    const balanceResponse = await axios.get(SMS_API_URL, {
      params: { 
        api_key: apiKey, 
        action: 'getBalance' 
      }
    });
    
    const balance = balanceResponse.data.replace('ACCESS_BALANCE:', '');
    console.log(`💰 Solde disponible: ${balance}₽`);
    
    // 2. Vérifier les prix et stock pour le Canada
    console.log('\n📊 Vérification stock Canada...');
    const pricesResponse = await axios.get(SMS_API_URL, {
      params: { 
        api_key: apiKey, 
        action: 'getPrices', 
        service: WHATSAPP_SERVICE, 
        country: CANADA_COUNTRY_CODE 
      }
    });
    
    const priceData = pricesResponse.data;
    
    if (priceData[CANADA_COUNTRY_CODE] && priceData[CANADA_COUNTRY_CODE][WHATSAPP_SERVICE]) {
      const canadaWA = priceData[CANADA_COUNTRY_CODE][WHATSAPP_SERVICE];
      
      console.log(`✅ CANADA DISPONIBLE:`);
      console.log(`   💰 Prix: ${canadaWA.cost}₽ par numéro`);
      console.log(`   📱 Stock total: ${canadaWA.count} numéros`);
      console.log(`   🔢 Stock physique: ${canadaWA.physicalCount || 'N/A'} numéros`);
      
      if (canadaWA.count > 0) {
        console.log(`\n🟢 STATUT: NUMÉROS DISPONIBLES (${canadaWA.count} en stock)`);
      } else {
        console.log(`\n🔴 STATUT: AUCUN NUMÉRO DISPONIBLE`);
      }
      
    } else {
      console.log('❌ CANADA NON DISPONIBLE pour WhatsApp');
    }
    
    // 3. Vérification détaillée du statut
    console.log('\n📋 Statut détaillé des services Canada...');
    const statusResponse = await axios.get(SMS_API_URL, {
      params: { 
        api_key: apiKey, 
        action: 'getNumbersStatus', 
        country: CANADA_COUNTRY_CODE,
        service: WHATSAPP_SERVICE
      }
    });
    
    const statusData = statusResponse.data;
    
    if (statusData && statusData[WHATSAPP_SERVICE] !== undefined) {
      const waStatus = statusData[WHATSAPP_SERVICE];
      console.log(`📊 WhatsApp Canada - Statut: ${waStatus > 0 ? '✅ Disponible' : '❌ Indisponible'} (${waStatus})`);
    } else {
      console.log('❌ Impossible de récupérer le statut détaillé');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    
    if (error.response) {
      console.error('🔍 Détails de l\'erreur:', error.response.data);
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ Vérification terminée');
}

// Exécuter le script
if (require.main === module) {
  checkCanadaAvailability();
}

module.exports = { checkCanadaAvailability };