// Exemple de création de workflow WhatsApp avec MCP + Stagehand
import { startMCPSession, endMCPSession, createWorkflowFromInstructions } from '../mcpLauncher.js';

/**
 * Exemple 1: Créer un workflow de login WhatsApp
 */
export async function createWhatsAppLoginWorkflow() {
  const instructions = `
    1. Navigate to https://web.whatsapp.com
    2. Wait for the page to load completely
    3. Check if QR code is present for new login
    4. If QR code exists, wait for user to scan with phone
    5. Wait for successful login and chat interface to appear
    6. Take a screenshot to confirm login success
  `;
  
  return await createWorkflowFromInstructions(instructions, 'whatsapp-login');
}

/**
 * Exemple 2: Créer un workflow d'envoi de message
 */
export async function createWhatsAppSendMessageWorkflow() {
  const instructions = `
    1. Assume WhatsApp Web is already logged in
    2. Click on the search box to find contacts
    3. Type the phone number or contact name provided by user
    4. Click on the first matching contact
    5. Wait for chat window to open
    6. Click on the message input field
    7. Type the message content provided by user  
    8. Press Enter to send the message
    9. Wait for message to be delivered (single tick -> double tick)
    10. Take a screenshot of the sent message for confirmation
  `;
  
  return await createWorkflowFromInstructions(instructions, 'whatsapp-send-message');
}

/**
 * Exemple 3: Session manuelle pour développement guidé
 */
export async function createWhatsAppWorkflowManual() {
  console.log('🚀 Démarrage session manuelle WhatsApp...');
  
  const { stagehand } = await startMCPSession();
  
  try {
    // Navigation initiale
    await stagehand.page.goto('https://web.whatsapp.com');
    console.log('📱 WhatsApp Web chargé');
    
    // Attendre et analyser la page
    await stagehand.page.waitForTimeout(3000);
    
    // Utiliser l'agent IA pour des actions intelligentes
    console.log('🤖 Analyse de la page WhatsApp...');
    const analysis = await stagehand.agent('Analyze the current WhatsApp page and identify if user needs to login or if already logged in');
    console.log('📊 Analyse:', analysis);
    
    // Exemple d'actions conditionnelles avec l'IA
    console.log('🤖 Gestion du login WhatsApp...');
    const loginResult = await stagehand.agent(`
      If there is a QR code on the page:
      - Take a screenshot for the user to scan
      - Wait up to 30 seconds for login to complete
      If already logged in:
      - Confirm the chat interface is visible
      - Take a screenshot of the main interface
    `);
    console.log('🔐 Résultat login:', loginResult);
    
    // Générer le code final basé sur les actions effectuées
    const generatedCode = `
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
  console.log(\`📤 Envoi message à \${phoneNumber}: \${message}\`);
  
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
`;
    
    // Sauvegarder le workflow généré
    const savedPath = await endMCPSession(stagehand, generatedCode, 'whatsapp-complete-workflow');
    console.log('✅ Workflow WhatsApp sauvegardé:', savedPath);
    
    return savedPath;
    
  } catch (error) {
    console.error('❌ Erreur session manuelle:', error.message);
    await stagehand.close();
    throw error;
  }
}

/**
 * Exemple d'usage avec intégration dans votre projet existant
 */
export async function integrateWithExistingWorkflows() {
  console.log('🔗 Intégration avec workflows existants...');
  
  // Vous pouvez maintenant utiliser ces workflows générés dans vos runners existants
  // Par exemple, dans runners/sender.js :
  
  const examples = `
// Dans runners/sender.js - Exemple d'intégration

import { whatsappSendMessage } from '../workflows/generated/whatsapp-complete-workflow-TIMESTAMP.js';
import { extractIdentities } from '../utils/identity/extractIdentities.js';

export async function sendWhatsAppCampaign(phoneNumbers, message) {
  console.log('📢 Démarrage campagne WhatsApp...');
  
  for (const phoneNumber of phoneNumbers) {
    try {
      // Utiliser le workflow généré par IA
      await whatsappSendMessage(phoneNumber, message);
      console.log(\`✅ Message envoyé à \${phoneNumber}\`);
      
      // Intégrer avec vos utilitaires existants
      await storeMessageLog(phoneNumber, message, 'sent');
      
      // Pause entre les messages
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(\`❌ Erreur pour \${phoneNumber}:\`, error.message);
      await storeMessageLog(phoneNumber, message, 'failed');
    }
  }
}
  `;
  
  console.log('💡 Exemple d\'intégration:');
  console.log(examples);
}

// Test des exemples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Test des exemples WhatsApp...');
  
  // Décommentez l'exemple que vous voulez tester :
  
  // await createWhatsAppLoginWorkflow();
  // await createWhatsAppSendMessageWorkflow();
  await createWhatsAppWorkflowManual();
  // await integrateWithExistingWorkflows();
}
