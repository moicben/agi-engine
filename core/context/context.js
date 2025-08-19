// Merge all the context providers into a single object

import { buildMemoryContext } from './memory.js';
import { scanFolder } from './environment.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../core/config.js';

// Resolve path relative to this module file (not process.cwd())
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const conscience = fs.readFileSync(path.join(__dirname, 'conscience.md'), 'utf8');

// Simple caches with TTL to avoid repeated expensive reads within short windows
const memoryCache = new Map(); // key: sessionId|rootDir|goal -> { ts, value }
const envCache = new Map(); // key: rootDir -> { ts, value }
const DEFAULT_TTL_MS = Number(config?.context?.cacheTtlMs ?? 60_000);

export async function buildContext(sessionId, rootDir = process.cwd(), goal = '') {
  const memKey = `${sessionId}|${rootDir}|${goal}`;
  const envKey = `${rootDir}`;

  const now = Date.now();
  let memoryContext;
  let environmentContext;

  // Fetch memory and environment in parallel with lightweight caching
  const memPromise = (async () => {
    const cached = memoryCache.get(memKey);
    if (cached && (now - cached.ts) < DEFAULT_TTL_MS) return cached.value;
    const v = await buildMemoryContext({ sessionId, rootDir, goal });
    memoryCache.set(memKey, { ts: Date.now(), value: v });
    return v;
  })();

  const envPromise = (async () => {
    const cached = envCache.get(envKey);
    if (cached && (now - cached.ts) < DEFAULT_TTL_MS) return cached.value;
    const v = await scanFolder(rootDir);
    envCache.set(envKey, { ts: Date.now(), value: v });
    return v;
  })();

  [memoryContext, environmentContext] = await Promise.all([memPromise, envPromise]);

  // Provide a short conscience excerpt and a very short folder summary for prompts
  const conscienceLite = String(conscience || '').slice(0, Number(config?.context?.conscienceLiteBudget ?? 800));

  // Compute a compact folder summary (top-level items only, capped)
  let folderSummaryShort = '';
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true }).slice(0, 20);
    const dirs = entries.filter(e => e.isDirectory()).map(e => `dir:${e.name}`).slice(0, 8);
    const files = entries.filter(e => !e.isDirectory()).map(e => `file:${e.name}`).slice(0, 8);
    folderSummaryShort = [...dirs, ...files].join(', ');
  } catch {
    folderSummaryShort = '';
  }

  return { ...memoryContext, environment: environmentContext, conscience, conscienceLite, folderSummaryShort };
}