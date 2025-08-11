import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration pour les variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Résout un captcha reCAPTCHA V2 via l'API Capsolver
 * @param {Object} page - Instance de la page Puppeteer
 * @param {string} sitekey - Clé du site reCAPTCHA (data-sitekey)
 * @param {string} pageurl - URL de la page contenant le captcha
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<string>} Token de résolution du captcha
 */
export async function solveCaptcha(page, sitekey, pageurl, options = {}) {
  const apiKey = process.env.CAPSOLVER_KEY;
  
  if (!apiKey) {
    throw new Error('CAPSOLVER_KEY non trouvée dans les variables d\'environnement');
  }

  const {
    timeout = 120000, // 2 minutes par défaut
    pollInterval = 3000, // 3 secondes entre les vérifications
    proxy = null,
    userAgent = null
  } = options;

  console.log('🔐 Début de la résolution du captcha...');
  console.log(`   Sitekey: ${sitekey}`);
  console.log(`   Page URL: ${pageurl}`);

  try {
    // Étape 1: Créer une tâche de résolution de captcha
    const taskData = {
      clientKey: apiKey,
      task: {
        type: 'ReCaptchaV2TaskProxyless',
        websiteURL: pageurl,
        websiteKey: sitekey,
        ...(userAgent && { userAgent }),
        ...(proxy && { 
          proxyType: proxy.type || 'http',
          proxyAddress: proxy.address,
          proxyPort: proxy.port,
          ...(proxy.login && { proxyLogin: proxy.login }),
          ...(proxy.password && { proxyPassword: proxy.password })
        })
      }
    };

    console.log('📤 Envoi de la tâche à Capsolver...');
    const createTaskResponse = await axios.post('https://api.capsolver.com/createTask', taskData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (createTaskResponse.data.errorId !== 0) {
      throw new Error(`Erreur lors de la création de la tâche: ${createTaskResponse.data.errorDescription}`);
    }

    const taskId = createTaskResponse.data.taskId;
    console.log(`✅ Tâche créée avec l'ID: ${taskId}`);

    // Étape 2: Attendre la résolution du captcha
    const startTime = Date.now();
    let solution = null;

    while (!solution && (Date.now() - startTime) < timeout) {
      console.log('⏳ Vérification du statut de la résolution...');
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const getResultResponse = await axios.post('https://api.capsolver.com/getTaskResult', {
        clientKey: apiKey,
        taskId: taskId
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (getResultResponse.data.errorId !== 0) {
        throw new Error(`Erreur lors de la récupération du résultat: ${getResultResponse.data.errorDescription}`);
      }

      if (getResultResponse.data.status === 'ready') {
        solution = getResultResponse.data.solution.gRecaptchaResponse;
        console.log('✅ Captcha résolu avec succès !');
        break;
      } else if (getResultResponse.data.status === 'processing') {
        console.log('🔄 Résolution en cours...');
      } else {
        throw new Error(`Statut inattendu: ${getResultResponse.data.status}`);
      }
    }

    if (!solution) {
      throw new Error('Timeout: Le captcha n\'a pas pu être résolu dans le délai imparti');
    }

    return solution;

  } catch (error) {
    console.error('❌ Erreur lors de la résolution du captcha:', error.message);
    throw error;
  }
}

/**
 * Résout et applique automatiquement un captcha reCAPTCHA V2 sur une page
 * @param {Object} page - Instance de la page Puppeteer
 * @param {string} sitekey - Clé du site reCAPTCHA (optionnel, sera détectée automatiquement)
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<boolean>} True si le captcha a été résolu et appliqué
 */
export async function solveCaptchaAndApply(page, sitekey = null, options = {}) {
  try {
    const pageurl = page.url();
    
    // Détecter automatiquement la sitekey si non fournie
    if (!sitekey) {
      console.log('🔍 Détection automatique de la sitekey...');
      sitekey = await page.evaluate(() => {
        // Chercher dans les iframes reCAPTCHA
        const recaptchaFrame = document.querySelector('iframe[src*="recaptcha"]');
        if (recaptchaFrame) {
          const src = recaptchaFrame.src;
          const match = src.match(/k=([^&]+)/);
          if (match) return match[1];
        }
        
        // Chercher dans les divs avec data-sitekey
        const recaptchaDiv = document.querySelector('[data-sitekey]');
        if (recaptchaDiv) {
          return recaptchaDiv.getAttribute('data-sitekey');
        }
        
        // Chercher dans les scripts
        const scripts = Array.from(document.scripts);
        for (const script of scripts) {
          const match = script.textContent.match(/sitekey['"]\s*:\s*['"]([^'"]+)['"]/);
          if (match) return match[1];
        }
        
        return null;
      });
      
      if (!sitekey) {
        throw new Error('Impossible de détecter automatiquement la sitekey du captcha');
      }
      
      console.log(`✅ Sitekey détectée: ${sitekey}`);
    }

    // Résoudre le captcha
    const solution = await solveCaptcha(page, sitekey, pageurl, options);

    // Appliquer la solution sur la page
    console.log('🔧 Application de la solution sur la page...');
    
    await page.evaluate((token) => {
      console.log('🔧 Injection du token reCAPTCHA...');
      
      // Méthode 1: Injecter directement dans le textarea (principal)
      const textareas = document.querySelectorAll('textarea[name="g-recaptcha-response"]');
      let injected = false;
      
      textareas.forEach((textarea, index) => {
        if (textarea) {
          console.log(`📝 Injection dans textarea ${index + 1}:`, textarea);
          textarea.value = token;
          textarea.style.display = 'block';
          textarea.innerHTML = token; // Fallback
          
          // Déclencher les événements
          const events = ['input', 'change', 'blur', 'focus'];
          events.forEach(eventType => {
            try {
              const event = new Event(eventType, { bubbles: true, cancelable: true });
              textarea.dispatchEvent(event);
            } catch (e) {
              console.log(`Erreur événement ${eventType}:`, e.message);
            }
          });
          
          injected = true;
        }
      });
      
      if (!injected) {
        console.log('⚠️ Aucun textarea g-recaptcha-response trouvé');
      }
      
      // Méthode 2: Simuler la validation du captcha via l'API reCAPTCHA
      if (window.grecaptcha && window.grecaptcha.getResponse) {
        try {
          const widgets = document.querySelectorAll('.g-recaptcha');
          widgets.forEach((widget, index) => {
            console.log(`🎯 Widget reCAPTCHA ${index + 1} trouvé:`, widget);
            
            // Essayer de définir la réponse directement
            const widgetId = widget.getAttribute('data-widget-id') || index;
            
            // Marquer le widget comme résolu visuellement
            const iframe = widget.querySelector('iframe');
            if (iframe) {
              console.log('🖼️ Iframe reCAPTCHA trouvée, tentative de marquage visuel...');
              
              // Créer un élément pour indiquer que le captcha est résolu
              const checkmark = widget.querySelector('.recaptcha-solved') || document.createElement('div');
              if (!widget.querySelector('.recaptcha-solved')) {
                checkmark.className = 'recaptcha-solved';
                checkmark.style.cssText = `
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  color: green;
                  font-size: 24px;
                  z-index: 9999;
                  pointer-events: none;
                `;
                checkmark.innerHTML = '✓';
                widget.style.position = 'relative';
                widget.appendChild(checkmark);
              }
            }
          });
        } catch (e) {
          console.log('⚠️ Erreur lors de la manipulation des widgets:', e.message);
        }
      }
      
      // Méthode 3: Appeler les callbacks potentielles
      if (window.recaptchaCallback) {
        console.log('📞 Appel de recaptchaCallback...');
        try {
          window.recaptchaCallback(token);
        } catch (e) {
          console.log('⚠️ Erreur callback:', e.message);
        }
      }
      
      // Méthode 4: Déclencher les événements personnalisés
      try {
        const customEvent = new CustomEvent('recaptchaResolved', { 
          detail: { token },
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(customEvent);
        
        // Événement spécifique pour les formulaires
        const formEvent = new CustomEvent('recaptchaSuccess', {
          detail: { token },
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(formEvent);
        
        console.log('✅ Événements personnalisés déclenchés');
      } catch (e) {
        console.log('⚠️ Erreur événements personnalisés:', e.message);
      }
      
      // Méthode 5: Forcer la validation du formulaire
      const forms = document.querySelectorAll('form');
      forms.forEach((form, index) => {
        console.log(`📋 Formulaire ${index + 1} trouvé, marquage comme valide...`);
        form.setAttribute('data-recaptcha-validated', 'true');
      });
      
      console.log('🎉 Application du token terminée');
      return { success: true, injected, tokenLength: token.length };
      
    }, solution);

    // Attendre un peu pour que la solution soit prise en compte
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Vérifier que le token a été correctement appliqué
    const verificationResult = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[name="g-recaptcha-response"]');
      const hasToken = textarea && textarea.value.length > 0;
      const tokenLength = textarea ? textarea.value.length : 0;
      const tokenPreview = textarea ? textarea.value.substring(0, 50) + '...' : '';
      
      return {
        hasToken,
        tokenLength,
        tokenPreview,
        textareaVisible: textarea ? textarea.style.display !== 'none' : false,
        textareaExists: !!textarea
      };
    });

    console.log('📊 Vérification de l\'application du token:');
    console.log(`   - Textarea existe: ${verificationResult.textareaExists ? '✅' : '❌'}`);
    console.log(`   - Token présent: ${verificationResult.hasToken ? '✅' : '❌'}`);
    console.log(`   - Longueur token: ${verificationResult.tokenLength}`);
    console.log(`   - Aperçu token: ${verificationResult.tokenPreview}`);
    console.log(`   - Textarea visible: ${verificationResult.textareaVisible ? '✅' : '❌'}`);

    if (verificationResult.hasToken) {
      console.log('✅ Captcha résolu et appliqué avec succès !');
      return true;
    } else {
      console.log('⚠️ Le token n\'a pas été correctement appliqué');
      return false;
    }

  } catch (error) {
    console.error('❌ Erreur lors de la résolution et application du captcha:', error.message);
    throw error;
  }
}

/**
 * Fonction utilitaire pour attendre qu'un captcha apparaisse sur la page
 * @param {Object} page - Instance de la page Puppeteer
 * @param {number} timeout - Timeout en millisecondes
 * @returns {Promise<boolean>} True si un captcha est détecté
 */
export async function waitForCaptcha(page, timeout = 10000) {
  try {
    console.log('⏳ Attente de l\'apparition d\'un captcha...');
    
    await page.waitForFunction(() => {
      // Vérifier la présence d'éléments reCAPTCHA
      return document.querySelector('iframe[src*="recaptcha"]') ||
             document.querySelector('.g-recaptcha') ||
             document.querySelector('[data-sitekey]') ||
             document.querySelector('textarea[name="g-recaptcha-response"]');
    }, { timeout });
    
    console.log('✅ Captcha détecté sur la page');
    return true;
    
  } catch (error) {
    console.log('ℹ️ Aucun captcha détecté dans le délai imparti');
    return false;
  }
}