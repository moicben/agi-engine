import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';
import { createPayment } from '../../tools/supabase/storePayments.js';
import { updateOrder } from '../../tools/supabase/updateOrder.js';

// Configuration variables
const endpoint = "https://production-sfo.browserless.io/chrome/bql";
const token = "S1AMT3E9fOmOF332e325829abd823a1975bff5acdf";
const proxyString = "&proxy=residential&proxyCountry=fr";
const optionsString = "&adBlock=true&blockConsentModals=true";

// Query configuration
const queryFileName = 'rentoFlow.graphql';
const operationName = 'rentoFlow';

// File paths
const queryPath = join('./', queryFileName);

// Read the GraphQL query from file
const query = readFileSync(queryPath, 'utf8');

/**
 * Main function that executes the GraphQL query using the provided card and amount info.
 */
async function rentoFlow(orderNumber, paymentNumber, cardDetails, cardNumber, cardExpiry, cardCvx, billingName, amount) {
  console.log('----- Rento Flow -----');
  console.log('Order Number:', orderNumber);
  console.log('Payment Number:', paymentNumber);
  console.log('Amount:', amount);
  console.log('Card Details:', cardDetails);
  console.log('-----');

  // Initial status set to pending
  let status = 'initiated';

  // Remove spaces in card number and adjust amount (remove 2% fees)
  cardNumber = cardNumber.replace(/\s+/g, '');
  amount = Math.floor(amount * 0.98).toString();

  const variables = { cardNumber, cardExpiry, cardCvx, billingName, amount };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      operationName,
      variables
    })
  };

  const url = `${endpoint}?token=${token}${proxyString}${optionsString}`;
  console.log('Fetching URL:', url);

  let data;
  try {
    const response = await fetch(url, options);
    const rawText = await response.text();
    //console.log('Raw response:', rawText);

    data = JSON.parse(rawText);
    if (data.errors) {
      throw new Error(JSON.stringify(data.errors));
    }
    // If the GraphQL response contains a finalStatus field, update the status variable.
    if (data && data.data && data.data.finalStatus) {
      status = data.data.finalStatus.value;
    }
  } catch (error) {
    console.error('Error fetching GraphQL endpoint:', error);
    throw new Error('Failed to fetch GraphQL endpoint');
  } finally {
    // Pass the (possibly updated) status to both updateOrder and createPayment
    await updateOrder(orderNumber, cardDetails, status);
    await createPayment(orderNumber, paymentNumber, status, amount, cardDetails);
    console.log(`Transaction completed. Status: ${status}`);
    console.log('----- End Rento Flow -----');
  }

  // Save screenshots if available in the GraphQL response
  // Ensure "screenshots" directory exists
  const screenshotsDir = join('.', 'screenshots');
  if (!existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir);
  }
  const screenshotFields = [
    'login',
    'portfolio',
    'deposit',
    'amount',
    'cardDetails',
    'submited',
    'pending',
    'final'
  ];
  // The GraphQL response is assumed to be in data.data
  if (data && data.data) {
    screenshotFields.forEach(field => {
      if (data.data[field] && data.data[field].base64) {
        const buffer = Buffer.from(data.data[field].base64, 'base64');
        // Include the paymentNumber with a dash before the field name
        const filepath = join(screenshotsDir, `${paymentNumber}-${field}.jpg`);
        writeFileSync(filepath, buffer);
        //console.log(`Screenshot saved: ${filepath}`);
      }
    });
  }
  return data;
}

/**
 * Express handler for the rentoFlow endpoint.
 * Expected request body:
 * {
 *   "orderNumber": 11,
 *   "paymentNumber": 17,
 *   "amount": 20,
 *   "cardDetails": {
 *       "cardNumber": "5355 8424 5606 3291",
 *       "cardOwner": "test",
 *       "cardExpiration": "04/30",
 *       "cardCVC": "024"
 *   }
 * }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderNumber, paymentNumber, amount, cardDetails } = req.body;
  if (!orderNumber || !paymentNumber || !amount || !cardDetails) {
    return res.status(400).json({ error: 'Missing required order, payment, amount or card details.' });
  }
  const { cardNumber, cardOwner, cardExpiration, cardCVC } = cardDetails;
  if (!cardNumber || !cardOwner || !cardExpiration || !cardCVC) {
    return res.status(400).json({ error: 'Incomplete card details provided.' });
  }

  try {
    const data = await rentoFlow(orderNumber, paymentNumber, cardDetails, cardNumber, cardExpiration, cardCVC, cardOwner, amount);
    //console.log('GraphQL Response:', data);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}