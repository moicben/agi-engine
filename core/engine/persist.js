import fs from 'fs';
import path from 'path';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function redact(value) {
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    // Redact common secrets: emails, long digit sequences, tokens
    return str
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
      .replace(/\b\d{12,19}\b/g, '[REDACTED_DIGITS]')
      .replace(/(sk|pk|api|token)[_-]?[a-z0-9]{16,}/gi, '[REDACTED_TOKEN]');
  } catch {
    return '[REDACTED]';
  }
}

export function appendLedger(ledgerPath, entry) {
  ensureDir(path.dirname(ledgerPath));
  const clean = { ...entry };
  if (clean.payload) clean.payload = redact(clean.payload);
  fs.appendFileSync(ledgerPath, JSON.stringify({ ...clean, ts: new Date().toISOString() }) + '\n', 'utf8');
}

export function makeRunPaths({ runId, iterationIndex }) {
  const root = path.join(process.cwd(), 'core', 'runs', runId);
  const iterDir = path.join(root, `iteration-${String(iterationIndex).padStart(4, '0')}`);
  return {
    root,
    iterDir,
    context: path.join(root, 'context.json'),
    think: path.join(iterDir, 'think.json'),
    analyze: path.join(iterDir, 'analyze.json'),
    plan: path.join(iterDir, 'plan.json'),
    planGraph: path.join(iterDir, 'plan.graph.json'),
    assign: path.join(iterDir, 'assign.json'),
    decide: path.join(iterDir, 'decide.json'),
    ledger: path.join(root, 'ledger.jsonl'),
    events: path.join(root, 'events.jsonl'),
    taskDir: (taskId) => path.join(iterDir, 'tasks', String(taskId)),
    taskExec: (taskId) => path.join(iterDir, 'tasks', String(taskId), 'execute.json'),
    taskCritic: (taskId) => path.join(iterDir, 'tasks', String(taskId), 'critic.json'),
    artifactsDir: path.join(root, 'artifacts'),
  };
}

export function appendEvent(eventsPath, event) {
  ensureDir(path.dirname(eventsPath));
  const clean = { ...event };
  if (clean.message) clean.message = redact(clean.message);
  fs.appendFileSync(eventsPath, JSON.stringify({ ...clean, ts: new Date().toISOString() }) + '\n', 'utf8');
}

export default { ensureDir, writeJson, appendLedger, makeRunPaths, appendEvent };


