import fs from 'fs/promises';
import path from 'path';

export async function pressKey(page, key, count) {
    for (let i = 0; i < count; i++) {
      await page.keyboard.press(key);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }


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

export const browserSession = {
    browser: null,
    page: null,
    paymentUrl: null,
    status: 'inactive',
};