import fs from 'fs';
import path from 'path';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

export function backupFile(filePath) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${filePath}.bak.${ts}`;
  if (fs.existsSync(filePath)) fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function applySingleEdit(originalText, edit) {
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

export function applyEdits(edits = []) {
  const logs = [];
  let applied = 0;
  const artifacts = [];
  if (!Array.isArray(edits)) {
    return { success: false, data: { applied: 0 }, artifacts, logs: ['invalid_edits_input'] };
  }
  for (const e of edits) {
    try {
      const target = String(e?.target_file || e?.file || '');
      if (!target) { logs.push('skip: missing target_file'); continue; }
      const absolute = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
      const existing = fs.existsSync(absolute) ? readFile(absolute) : null;
      if (existing === null) {
        if (e?.type === 'create' && typeof e?.new_string === 'string') {
          writeFile(absolute, String(e.new_string));
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
        writeFile(absolute, res.text);
        applied++; logs.push(`edited: ${absolute}${backup ? ` (backup: ${path.basename(backup)})` : ''}`);
        artifacts.push({ type: 'file', path: absolute, backup });
      } else {
        logs.push(`skip: ${absolute} reason=${res.reason || 'unknown'}`);
      }
    } catch (err) {
      logs.push(`error: ${err.message}`);
    }
  }
  return { success: applied > 0, data: { applied }, artifacts, logs };
}

export default { ensureDir, readFile, writeFile, backupFile, applyEdits };


