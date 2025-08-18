import fs from 'fs';
import path from 'path';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return null; }
}

function writeFileSafe(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function backupFile(filePath) {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.bak.${ts}`;
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath);
    return backupPath;
  } catch { return null; }
}

function applySingleEdit(originalText, edit) {
  // Supported minimal schema:
  // { type: 'replace', old_string: string, new_string: string }
  // { type: 'insert', index: number, new_string: string }
  // { type: 'delete', start: number, end: number }
  const type = edit?.type || 'replace';
  if (type === 'replace') {
    const oldStr = String(edit.old_string ?? '');
    const newStr = String(edit.new_string ?? '');
    if (!oldStr) return { ok: false, text: originalText, reason: 'old_string_empty' };
    const idx = originalText.indexOf(oldStr);
    if (idx === -1) return { ok: false, text: originalText, reason: 'old_string_not_found' };
    const before = originalText.slice(0, idx);
    const after = originalText.slice(idx + oldStr.length);
    return { ok: true, text: before + newStr + after };
  }
  if (type === 'insert') {
    const index = Number(edit.index ?? 0);
    const newStr = String(edit.new_string ?? '');
    const safeIdx = Math.max(0, Math.min(originalText.length, index));
    return { ok: true, text: originalText.slice(0, safeIdx) + newStr + originalText.slice(safeIdx) };
  }
  if (type === 'delete') {
    const start = Math.max(0, Number(edit.start ?? 0));
    const end = Math.max(start, Number(edit.end ?? start));
    return { ok: true, text: originalText.slice(0, start) + originalText.slice(end) };
  }
  return { ok: false, text: originalText, reason: 'unsupported_type' };
}

export async function applyEdits({ edits = [] } = {}) {
  const started = Date.now();
  if (!Array.isArray(edits)) {
    return { success: false, error: 'invalid_edits', data: { applied: 0 } };
  }

  const logs = [];
  let applied = 0;
  const artifacts = [];

  for (const e of edits) {
    try {
      const target = String(e?.target_file || e?.file || '');
      if (!target) { logs.push('skip: missing target_file'); continue; }

      const absolute = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
      const existing = readFileSafe(absolute);
      if (existing === null) {
        if (e?.type === 'create' && typeof e?.new_string === 'string') {
          ensureDir(path.dirname(absolute));
          writeFileSafe(absolute, String(e.new_string));
          applied++; logs.push(`created: ${absolute}`);
          artifacts.push({ type: 'file', path: absolute });
          continue;
        } else {
          logs.push(`skip: file_not_found ${absolute}`);
          continue;
        }
      }

      const backup = backupFile(absolute);
      const res = applySingleEdit(existing, e);
      if (res.ok) {
        writeFileSafe(absolute, res.text);
        applied++; logs.push(`edited: ${absolute}${backup ? ` (backup: ${path.basename(backup)})` : ''}`);
        artifacts.push({ type: 'file', path: absolute, backup });
      } else {
        logs.push(`skip: ${absolute} reason=${res.reason || 'unknown'}`);
      }
    } catch (err) {
      logs.push(`error: ${err.message}`);
    }
  }

  return {
    success: applied > 0,
    data: { applied },
    artifacts,
    logs,
    meta: { duration_ms: Date.now() - started }
  };
}

export default { applyEdits };


