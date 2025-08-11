import { readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

// Configuration variables
const endpoint = "https://production-sfo.browserless.io/chrome/bql";
const token = "S1AMT3E9fOmOF332e325829abd823a1975bff5acdf";
const proxyString = "&proxy=residential&proxyCountry=fr";
const optionsString = "&adBlock=true&blockConsentModals=true";

// Query configuration
const queryFileName = 'rentoDebug.graphql';
const operationName = 'rentoDebug';

// File paths
const queryPath = join('./', queryFileName);

// Read the GraphQL query from file
const query = readFileSync(queryPath, 'utf8');

/**
 * Simplified function that executes the GraphQL query and returns the current URL.
 */
async function rentoDebug() {
  const variables = {}; // No variables needed for this simplified query
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, operationName, variables })
  };

  const url = `${endpoint}?token=${token}${proxyString}${optionsString}`;
  console.log('Fetching URL:', url);

  const response = await fetch(url, options);
  const rawText = await response.text();
  console.log('Raw response:', rawText);

  const data = JSON.parse(rawText);
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }

  // Retrieve the URL from the GraphQL response
  const currentUrl = data.data.currentUrl.value;
  console.log('Current URL from evaluation:', currentUrl);
  return currentUrl;
}

// For example, call the function if running this module directly:
rentoDebug().catch(err => {
  console.error('Error in rentoDebug:', err);
});