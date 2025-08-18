// Merge all the context providers into a single object

import { buildMemoryContext } from './memory.js';
import { scanFolder } from './environment.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve path relative to this module file (not process.cwd())
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const conscience = fs.readFileSync(path.join(__dirname, 'conscience.md'), 'utf8');

export async function buildContext(sessionId, rootDir = process.cwd()) {
  const memoryContext = await buildMemoryContext({ sessionId, rootDir });
  const environmentContext = await scanFolder(rootDir);
  return { ...memoryContext, environment: environmentContext, conscience };
}