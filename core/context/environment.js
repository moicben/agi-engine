import fs from 'fs';
import path from 'path';

// Scan the folder project and return a summary of the files and directories
export async function scanFolder(folderPath) {
  const summary = [];
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);
    summary.push({
      name: file,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
    });
  }
  return summary;
}

// Optional compact summary for prompts
export function summarizeFolderShort(folderPath, limit = 20) {
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true }).slice(0, limit);
    const dirs = entries.filter(e => e.isDirectory()).map(e => `dir:${e.name}`).slice(0, 8);
    const files = entries.filter(e => !e.isDirectory()).map(e => `file:${e.name}`).slice(0, 8);
    return [...dirs, ...files].join(', ');
  } catch { return ''; }
}
