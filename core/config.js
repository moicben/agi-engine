// Fichiers de configuration de /core

import dotenv from 'dotenv';
dotenv.config();

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