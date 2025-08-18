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
