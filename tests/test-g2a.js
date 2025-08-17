// Test de lancement de browser avec runpod
import { initiateG2AWorkflow } from '../workers/g2a/initiate.js';
import { payG2AWorkflow } from '../workers/g2a/proceed.js';
import path from 'path';

(async () => {

  // 5 USD Gift Card Link
  const product = 'https://www.g2a.com/fr/rewarble-visa-gift-card-5-usd-by-rewarble-key-global-i10000502992002?uuid=b989334e-1997-4366-a9ab-0b6aade9c478';
  const parameters = '&___currency=EUR&___store=english&___locale=fr';
  const productUrl = product + parameters;

  const { sessionPath } = await initiateG2AWorkflow(productUrl);

  await payG2AWorkflow({ sessionPath, cardDetails: {
    cardNumber: '4242424242424242',
    cardExpiry: '12/25',
    cardCvc: '123',
    cardHolder: 'John Doe'
  } });
})();