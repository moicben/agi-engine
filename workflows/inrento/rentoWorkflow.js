import { pressKey } from '../../utils/puppeteer/pressKey.js';
import { getEmailOtp } from '../../utils/getEmailOtp.js';
import { waitForCaptcha, solveCaptchaAndApply } from '../../services/captcha-service.js';
import fs from 'fs';

const START_URL = 'https://inrento.com/account-registration/';

// Workflow spécifique à Rento
export async function rentoWorkflow(page, accountData, preparedData) {
  console.log(`Navigating to ${START_URL}...`);
  await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Filling Registration Form...');

  await page.type('input[type="email"]', preparedData.email, { delay: 100 });
  await new Promise(resolve => setTimeout(resolve, 250));
  await pressKey(page, 'Tab', 1);

  await page.keyboard.type('Cadeau2014!', { delay: 100 });
  await new Promise(resolve => setTimeout(resolve, 250));
  await pressKey(page, 'Tab', 1);

  await page.keyboard.type('Cadeau2014!', { delay: 100 });
  await new Promise(resolve => setTimeout(resolve, 500));
  await pressKey(page, 'Tab', 1);

  await pressKey(page, 'Space', 1);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Captcha Solving
  try {
    console.log('Solving Captcha...');
    const hasCaptcha = await waitForCaptcha(page, 15000);
    
    if (hasCaptcha) {
      console.log('🔐 Captcha détecté, résolution en cours...');
      const success = await solveCaptchaAndApply(page);
      
      if (success) {
        console.log('✅ Captcha résolu avec succès !');
      } else {
        throw new Error('Échec de la résolution du captcha');
      }
    } else {
      console.log('ℹ️ Aucun captcha détecté, continuation du processus...');
    }
  } catch (captchaError) {
    console.error('❌ Erreur lors de la résolution du captcha:', captchaError);
    throw new Error(`Captcha resolution failed: ${captchaError.message}`);
  }

  await new Promise(resolve => setTimeout(resolve, 4000));
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 12000));
  
  //

  //

  // PAGE "Onboarding"
  console.log("Starting the onboarding...");

  // Step 1 - Account type
  await page.mouse.click(300, 500);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Step 1.1 Newsletter Preferences
  await page.mouse.click(300, 500);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 6);
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 4000));

  await page.goto('https://inrento.com/personal-info', { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  // Step 2 - Personal Information
  await page.mouse.click(300, 300);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 1);
  
  await page.keyboard.type(`${accountData.first_name}`, {delay: 100});
  await page.keyboard.press('Tab');
  await page.keyboard.type(`${accountData.last_name}`, {delay: 100});
  await pressKey(page, 'Tab', 1);
  await page.keyboard.type(`${preparedData.phone}`, {delay: 100});
  await pressKey(page, 'Tab', 1);
  await page.keyboard.type('France', {delay: 100});
  await pressKey(page, 'Tab', 2);
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 5000));


  // Step 3 - Gateway Method
  await page.mouse.click(300, 500);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Space', 1);
  await pressKey(page, 'Tab', 2);
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 4 - Verification KYC
  await page.mouse.click(300, 500);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 4);
  await pressKey(page, 'Enter', 1);

  // Step 4.1 - Ondato: Accept Politics
  await page.mouse.click(300, 500);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 2);
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 4000));


  // Step 4.2 - Ondato: Choose documents
  // Cliquer sur le premier element : a.card.document-card
  await page.click("a.card.document-card");
  await new Promise(resolve => setTimeout(resolve, 3000000));


  // Step 4.3 - Ondato: Upload passport
  await page.mouse.click(200, 200);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 1);
  


  //

  await new Promise(resolve => setTimeout(resolve, 6000));
} 