import fs from 'fs/promises';
import path from 'path';


export async function importCookies(page, file) {
  try {
    const cookies = JSON.parse(await fs.readFile(file, 'utf-8'));
    await page.setCookie(...cookies);
    console.log('Cookies imported successfully.');
  } catch (error) {
    console.error('Error importing cookies:', error.message);
    throw new Error('Failed to import cookies');
  }
}