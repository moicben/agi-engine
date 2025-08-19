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
        // Modèles par étape (facultatif). Si non défini, utilise llm.model.
        models: {
            think: 'gpt-5-mini',
            analyze: 'gpt-4o-mini', 
            plan: 'gpt-5-mini',
            assign: 'gpt-4o-mini',
            critic: 'gpt-4o-mini',
        },
        temperature: 0,
        maxTokens: 1200,
        baseURL: undefined,
    },
    engine: {
        maxIterations: 3,
        maxIterationsByIntent: {
            qa: 1,
            web: 2,
            dev: 3,
        },
        backoffMs: 1000,
        criticSampleRate: 0.25,
        // Niveau de persistance: 'full' | 'minimal'
        persistLevel: 'full',
        // Concurrence d'exécution par niveau
        maxConcurrency: 2,
        retriesByIntent: {
            qa: 0,
            web: 0,
            dev: 1,
        },
        // Délai par intent utilisé lors de l'assign si non fourni
        timeoutsByIntent: {
            qa: 30000,
            web: 45000,
            dev: 120000,
        },
        // Activation d'un fast-path QA (court-circuit plan/assign)
        qaFastpath: false,
    },
    memory: {
        maxRows: 120,
        topK: 5,
        charBudget: 1000,
        minScore: 0.1,
        decayHalfLifeDays: 3,
        domainWeights: { general: 1.0, identity: 1.2, payments: 1.2, whatsapp: 1.1 },
        mmrLambda: 0.7,
        weights: { relevance: 0.55, recency: 0.15, domain: 0.2, importance: 0.1 },
    },
    // Config pour le VPN
    vpn: {
        country: 'fr',
    },
    // Contexte et caches
    context: {
        cacheTtlMs: 60_000,
        conscienceLiteBudget: 800,
    },
    // Logs et console
    logging: {
        llmSteps: false,
        llm: false,
        truncate: 400,
    },
    // Paramètres d'exécution divers
    runtime: {
        sessionIdDefault: 'session-test-1',
    },
}