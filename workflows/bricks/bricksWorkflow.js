import { pressKey } from '../../utils/puppeteer/pressKey.js';
import { getEmailOtp } from '../../utils/getEmailOtp.js';
import fs from 'fs';

const START_URL = 'https://app.bricks.co/register';

// Workflow spécifique à Bricks
export async function bricksWorkflow(page, accountData, preparedData) {
  console.log(`Navigating to ${START_URL}...`);
  await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Filling Registration Form...');

  await page.type('input[type="email"]', preparedData.email, { delay: 100 });
  await page.type('input[type="password"]', 'Cadeau2014!', { delay: 100 });

  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Space', 1);
  await pressKey(page, 'Tab', 3);
  await pressKey(page, 'Space', 1);

  await new Promise(resolve => setTimeout(resolve, 3000));
  await pressKey(page, 'Enter', 1);

  // Get Email OTP Code
  console.log('Getting OTP Code...');

  // Screenshot de la page
  await page.screenshot({ path: 'screenshots/bricks_otp.png' });

  await new Promise(resolve => setTimeout(resolve, 5000));

  const otp = await getEmailOtp(preparedData.email);

  if (!otp) {
    throw new Error('Failed to retrieve OTP code from email');
  }

  console.log('OTP Code Received:', otp);

  // Fill OTP Code
  await pressKey(page, 'Tab', 5);
  await page.keyboard.type(`${otp}`, {delay: 200});
  await new Promise(resolve => setTimeout(resolve, 3000));

  await pressKey(page, 'Enter', 1);
  console.log('OTP Submited, waiting for 9s...');
  await new Promise(resolve => setTimeout(resolve, 9000));

  // PAGE "Onboarding"
  console.log('Onboarding...');

  // Step 0 : Accepte les conditions d'utilisation
  await page.click(".css-1mwxp4n");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 1 - Personal Information
  // Adapter la navigation selon le sexe (F = Femme, M = Homme)
  const isWoman = accountData.sex === 'F';
  
  if (isWoman) {
    // Pour une femme: 2 tabs au début, puis 1 tab après
    await pressKey(page, 'Tab', 2);
    await pressKey(page, 'Space', 1);
    await pressKey(page, 'Tab', 1);
  } else {
    // Pour un homme: 1 tab au début, puis 2 tabs après
    await pressKey(page, 'Tab', 1);
    await pressKey(page, 'Space', 1);
    await pressKey(page, 'Tab', 2);
  }
  
  // Step 2 - First Name and Last Name
  await page.keyboard.type(`${accountData.first_name}`, {delay: 100});
  await page.keyboard.press('Tab');
  await new Promise(resolve => setTimeout(resolve, 2000));
  await page.keyboard.type(`${accountData.last_name}`, {delay: 100});
  await pressKey(page, 'Tab', 1);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3 - Phone Number
  await pressKey(page, 'Tab', 2);
  // await pressKey(page, 'Tab', 1); BROWSERBASE FIX
  await page.keyboard.type(`0612357890`, {delay: 100});
  

  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 4 - Address
  await pressKey(page, 'Tab', 2);
  await page.keyboard.type(`${preparedData.postal}`, {delay: 100});
  await pressKey(page, 'Tab', 1);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await page.keyboard.type(`${preparedData.city}`, {delay: 100});
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Click sur le pixel 200 x 200 de la page
  await page.mouse.click(200, 200);
  await new Promise(resolve => setTimeout(resolve, 2000));

  await pressKey(page, 'Tab', 1);
  await page.keyboard.type(preparedData.address, { delay: 50 });
  await pressKey(page, 'Tab', 1);

  // (Re) Click sur le pixel 200 x 200 de la page -> Defocus secure
  await page.mouse.click(200, 200);
  await new Promise(resolve => setTimeout(resolve, 2000));

  await pressKey(page, 'Tab', 5);
  await pressKey(page, 'Space', 1);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 5 - Birth Date and Place
  await pressKey(page, 'Tab', 1);
  await page.keyboard.type(`${preparedData.birth}`, {delay: 100});
  await pressKey(page, 'Tab', 1);
  
  // Utiliser le lieu de naissance du compte ou une ville par défaut
  const birthPlace = accountData.birth_place;
  await page.keyboard.type(`${birthPlace}`, {delay: 100});

  await pressKey(page, 'Tab', 3);
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  // Step 6 (Passport Upload)
  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Space', 1);
  await pressKey(page, 'ArrowDown', 1);
  await pressKey(page, 'Space', 1);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 1);
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Vérifier que les fichiers existent
  if (!fs.existsSync(preparedData.idPath)) {
    throw new Error(`ID file not found: ${preparedData.idPath}`);
  }

  // Upload des fichiers d'identité avec la méthode correcte
  console.log('Uploading ID file...');

  const fileInputs = await page.$$('input[type="file"]');
  if (fileInputs.length > 0) {
    await fileInputs[0].uploadFile(preparedData.idPath);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  await pressKey(page, 'Tab', 2);
  await pressKey(page, 'Space', 1);
  await new Promise(resolve => setTimeout(resolve, 11000));

  // Step 7 (Success)
  await pressKey(page, 'Tab', 2);
  await pressKey(page, 'Enter', 1);
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  // Page "Goals / Funds"
  console.log('Goals / Funds...');

  // Step 1
  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Space', 1);
  await pressKey(page, 'Tab', 4);
  await pressKey(page, 'Space', 1);
  await new Promise(resolve => setTimeout(resolve, 4500));

  // Steps 2-6 - Navigation through goals
  for (let i = 2; i <= 6; i++) {
    await page.click(".css-1mwxp4n");
    await new Promise(resolve => setTimeout(resolve, 4500));
  }

  // Step 7 (Confirmation)
  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Space', 1);

  // PAGE "Experience"
  console.log('Experience...');

  // Step 1
  await page.click(".css-1mwxp4n");
  await new Promise(resolve => setTimeout(resolve, 4500));

  // Step 2
  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Space', 1);
  await pressKey(page, 'Tab', 6);
  await pressKey(page, 'Space', 1);
  await new Promise(resolve => setTimeout(resolve, 4500));

  // Steps 3-5
  for (let i = 3; i <= 5; i++) {
    await page.click(".css-1mwxp4n");
    await new Promise(resolve => setTimeout(resolve, 4500));
  }

  // Step 6
  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Space', 1);
  await pressKey(page, 'Tab', 1);
  await pressKey(page, 'Space', 1);

  await pressKey(page, 'Tab', 2);
  await pressKey(page, 'Space', 1);
  await new Promise(resolve => setTimeout(resolve, 4500));

  // Step 7 (Validation)
  await pressKey(page, 'Tab', 2);
  await pressKey(page, 'Space', 1);

  await new Promise(resolve => setTimeout(resolve, 4500));
  await page.mouse.click(200, 200);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await pressKey(page, 'Tab', 2);
  await pressKey(page, 'Space', 1);

  await new Promise(resolve => setTimeout(resolve, 6000));
} 