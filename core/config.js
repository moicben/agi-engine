// Fichiers de configuration de /core

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import url from 'url';

let loaded = false;
try { loaded = !!dotenv.config().parsed; } catch {}
if (!loaded) {
  try {
    const thisDir = path.dirname(url.fileURLToPath(import.meta.url));
    const root = path.resolve(thisDir, '..');
    const dotenvPath = path.join(root, '.env');
    if (fs.existsSync(dotenvPath)) {
      dotenv.config({ path: dotenvPath });
    }
  } catch {}
}

export const config = {
    // Config pour le LLM
    llm: {
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
    },
    // Config pour le VPN
    vpn: {
        country: 'fr',
    },
}