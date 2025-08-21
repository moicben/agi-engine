// Test G2A en automation :
import { saveCardG2AWorkflow } from '../scripts/puppeteer/g2a/save-card.js';

const cardDetails = {
  cardNumber: '4111111111111111',
  cardExpiry: '12/25',
  cardCvc: '123',
  cardHolder: 'John'
};

await saveCardG2AWorkflow({ cardDetails, paymentId: "test1" });
