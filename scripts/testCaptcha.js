import puppeteer from 'puppeteer';
import { solveCaptchaAndApply, waitForCaptcha } from './utils/solveCaptcha.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

/**
 * Script de test pour débugger solveCaptcha sur InRento
 */
async function testCaptcha() {
  let browser;
  let page;

  try {
    console.log('🚀 Démarrage du test de captcha...');
    
    // Lancer le navigateur en mode visible pour le débogage
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    page = await browser.newPage();
    
    // Configurer le User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('🌐 Navigation vers la page d\'inscription InRento...');
    await page.goto('https://inrento.com/account-registration/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page chargée avec succès');
    
    // Attendre que la page soit entièrement chargée
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Vérifier les éléments présents sur la page
    console.log('🔍 Analyse des éléments de la page...');
    
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasRecaptchaIframe: !!document.querySelector('iframe[src*="recaptcha"]'),
        hasRecaptchaDiv: !!document.querySelector('.g-recaptcha'),
        hasSitekeyAttribute: !!document.querySelector('[data-sitekey]'),
        hasRecaptchaTextarea: !!document.querySelector('textarea[name="g-recaptcha-response"]'),
        formElements: {
          emailInput: !!document.querySelector('input[type="email"], input[name*="email"], input[id*="email"]'),
          submitButton: !!document.querySelector('button[type="submit"], input[type="submit"]'),
          forms: document.forms.length
        }
      };
    });
    
    console.log('📋 Informations de la page:');
    console.log(`   - URL: ${pageInfo.url}`);
    console.log(`   - Titre: ${pageInfo.title}`);
    console.log(`   - Iframe reCAPTCHA: ${pageInfo.hasRecaptchaIframe ? '✅' : '❌'}`);
    console.log(`   - Div .g-recaptcha: ${pageInfo.hasRecaptchaDiv ? '✅' : '❌'}`);
    console.log(`   - Attribut data-sitekey: ${pageInfo.hasSitekeyAttribute ? '✅' : '❌'}`);
    console.log(`   - Textarea reCAPTCHA: ${pageInfo.hasRecaptchaTextarea ? '✅' : '❌'}`);
    console.log(`   - Input email: ${pageInfo.formElements.emailInput ? '✅' : '❌'}`);
    console.log(`   - Bouton submit: ${pageInfo.formElements.submitButton ? '✅' : '❌'}`);
    console.log(`   - Nombre de formulaires: ${pageInfo.formElements.forms}`);
    
    // Remplir le formulaire d'abord pour déclencher le captcha
    console.log('📝 Remplissage du formulaire de test...');
    
    try {
      // Remplir l'email
      const emailInput = await page.$('input[type="email"], input[name*="email"], input[id*="email"]');
      if (emailInput) {
        await emailInput.type('test@example.com');
        console.log('✅ Email rempli');
      }
      
      // Remplir le mot de passe si présent
      const passwordInputs = await page.$$('input[type="password"]');
      for (let i = 0; i < passwordInputs.length; i++) {
        await passwordInputs[i].type('TestPassword123!');
        console.log(`✅ Mot de passe ${i + 1} rempli`);
      }
      
      // Cocher les cases à cocher si présentes
      const checkboxes = await page.$$('input[type="checkbox"]');
      for (const checkbox of checkboxes) {
        await checkbox.click();
        console.log('✅ Case cochée');
      }
      
    } catch (error) {
      console.log('⚠️ Erreur lors du remplissage du formulaire:', error.message);
    }
    
    // Attendre l'apparition du captcha
    console.log('⏳ Attente de l\'apparition du captcha...');
    const captchaFound = await waitForCaptcha(page, 15000);
    
    if (!captchaFound) {
      console.log('⚠️ Aucun captcha détecté, tentative de déclenchement...');
      
      // Essayer de cliquer sur le bouton submit pour déclencher le captcha
      try {
        const submitButton = await page.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          console.log('🔘 Bouton submit cliqué');
          
          // Attendre à nouveau l'apparition du captcha
          await new Promise(resolve => setTimeout(resolve, 3000));
          await waitForCaptcha(page, 10000);
        }
      } catch (error) {
        console.log('⚠️ Impossible de cliquer sur le bouton submit:', error.message);
      }
    }
    
    // Essayer de détecter et résoudre le captcha
    console.log('🔐 Tentative de résolution du captcha...');
    
    try {
      const success = await solveCaptchaAndApply(page);
      
      if (success) {
        console.log('🎉 Captcha résolu avec succès !');
        
        // Vérification détaillée du statut final
        const finalStatus = await page.evaluate(() => {
          const textarea = document.querySelector('textarea[name="g-recaptcha-response"]');
          const widgets = document.querySelectorAll('.g-recaptcha');
          const forms = document.querySelectorAll('form');
          
          // Vérifier l'état visuel du captcha
          let visualStatus = 'unknown';
          if (widgets.length > 0) {
            const widget = widgets[0];
            const iframe = widget.querySelector('iframe');
            const checkmark = widget.querySelector('.recaptcha-solved');
            
            if (checkmark) {
              visualStatus = 'marked_solved';
            } else if (iframe) {
              visualStatus = 'iframe_present';
            }
          }
          
          return {
            hasToken: textarea && textarea.value.length > 0,
            tokenLength: textarea ? textarea.value.length : 0,
            tokenPreview: textarea ? textarea.value.substring(0, 30) + '...' : '',
            textareaVisible: textarea ? textarea.style.display !== 'none' : false,
            widgetCount: widgets.length,
            formCount: forms.length,
            visualStatus,
            isFormValid: forms.length > 0 ? forms[0].checkValidity() : false
          };
        });
        
        console.log('📊 Statut final du captcha:');
        console.log(`   - Token présent: ${finalStatus.hasToken ? '✅' : '❌'}`);
        console.log(`   - Longueur du token: ${finalStatus.tokenLength}`);
        console.log(`   - Aperçu token: ${finalStatus.tokenPreview}`);
        console.log(`   - Textarea visible: ${finalStatus.textareaVisible ? '✅' : '❌'}`);
        console.log(`   - Widgets reCAPTCHA: ${finalStatus.widgetCount}`);
        console.log(`   - Statut visuel: ${finalStatus.visualStatus}`);
        console.log(`   - Formulaires: ${finalStatus.formCount}`);
        console.log(`   - Formulaire valide: ${finalStatus.isFormValid ? '✅' : '❌'}`);
        
        // Test de soumission du formulaire (optionnel)
        if (finalStatus.hasToken) {
          console.log('🧪 Test de soumission du formulaire...');
          console.log('ℹ️ Le captcha est résolu ! Vous pouvez maintenant cliquer manuellement sur "Create account" dans le navigateur ouvert.');
          console.log('ℹ️ Le token reCAPTCHA est correctement injecté et le formulaire devrait s\'envoyer normalement.');
        }
        
      } else {
        console.log('❌ Échec de la résolution du captcha');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la résolution du captcha:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Attendre avant de fermer pour permettre l'inspection manuelle
    console.log('🔍 Test terminé. Fenêtre du navigateur ouverte pour inspection manuelle.');
    console.log('Appuyez sur Entrée pour fermer le navigateur...');
    
    // En mode interactif, attendre une entrée utilisateur
    if (process.stdin.isTTY) {
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
    } else {
      // En mode non-interactif, attendre 30 secondes
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Navigateur fermé');
    }
  }
}

// Lancer le test
testCaptcha().catch(console.error); 