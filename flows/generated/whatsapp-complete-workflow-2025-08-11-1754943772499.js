// Workflow généré automatiquement via MCP + Stagehand
// Date: 2025-08-11T20:22:52.499Z
// Nom: whatsapp-complete-workflow


// Workflow WhatsApp généré automatiquement
import { launchBrowserBase } from '../../utils/browserbase/launchBrowserBase.js';

export async function whatsappLoginAndPrepare() {
  console.log('🚀 Démarrage workflow WhatsApp...');
  
  const { browser, page } = await launchBrowserBase({
    viewport: { width: 1920, height: 1080 },
    useProxy: false
  });
  
  try {
    // Navigation vers WhatsApp Web
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle' });
    console.log('📱 WhatsApp Web chargé');
    
    // Attendre que la page soit prête
    await page.waitForTimeout(3000);
    
    // Vérifier si login requis ou déjà connecté
    const qrCode = await page.$('canvas[aria-label*="QR"]');
    
    if (qrCode) {
      console.log('📱 QR Code détecté - Scan requis');
      await page.screenshot({ path: 'screenshots/whatsapp-qr.png' });
      console.log('📷 Screenshot QR sauvegardé');
      
      // Attendre le login (max 60 secondes)
      await page.waitForSelector('[data-testid="chat-list"]', { timeout: 60000 });
      console.log('✅ Login réussi');
    } else {
      console.log('✅ Déjà connecté à WhatsApp');
    }
    
    // Confirmer que l'interface chat est prête
    await page.waitForSelector('[data-testid="chat-list"]');
    await page.screenshot({ path: 'screenshots/whatsapp-ready.png' });
    
    console.log('✅ WhatsApp prêt pour les actions');
    return { success: true, browser, page };
    
  } catch (error) {
    console.error('❌ Erreur workflow WhatsApp:', error.message);
    await browser.disconnect();
    throw error;
  }
}

export async function whatsappSendMessage(phoneNumber, message) {
  console.log(`📤 Envoi message à ${phoneNumber}: ${message}`);
  
  const { browser, page } = await whatsappLoginAndPrepare();
  
  try {
    // Rechercher le contact
    const searchBox = await page.waitForSelector('[data-testid="chat-list-search"]');
    await searchBox.click();
    await searchBox.type(phoneNumber);
    await page.waitForTimeout(2000);
    
    // Cliquer sur le premier résultat
    const firstContact = await page.waitForSelector('[data-testid="cell-frame-container"]');
    await firstContact.click();
    
    // Attendre que la conversation s'ouvre
    await page.waitForSelector('[data-testid="conversation-compose-box-input"]');
    
    // Taper et envoyer le message
    const messageBox = await page.$('[data-testid="conversation-compose-box-input"]');
    await messageBox.click();
    await messageBox.type(message);
    await page.keyboard.press('Enter');
    
    // Attendre la confirmation d'envoi
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/whatsapp-message-sent.png' });
    
    console.log('✅ Message envoyé avec succès');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erreur envoi message:', error.message);
    throw error;
  } finally {
    await browser.disconnect();
  }
}
