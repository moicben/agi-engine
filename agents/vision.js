import path from 'path';
import { fileURLToPath } from 'url';
import { takeDesktopScreenshot, analyzeScreenshot } from '../tools/screenshots.js';
import { llmRequest } from '../tools/llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Minimal visual reasoning agent
 * - Takes a screenshot of a URL
 * - Runs basic OCR keyword analysis
 * - Optionally summarizes the visible text with the LLM
 */
export async function runVisionAgent({
  accept = [],
  reject = [],
  lang = 'eng',
  summarize = false
} = {}) {
  const screenshotPath = await takeDesktopScreenshot({ label: 'vision' });
  const analysis = await analyzeScreenshot(screenshotPath, { accept, reject, lang });

  let summary = null;
  if (summarize) {
    const prompt = `You are a visual assistant. Given the OCR from a web page screenshot, write a concise 2-sentence summary in English.
OCR Text:\n${analysis.text?.slice(0, 4000) || ''}`;
    try {
      summary = await llmRequest(prompt);
    } catch {
      summary = null;
    }
  }

  return {
    screenshotPath,
    ocrText: analysis.text || '',
    verdict: analysis.verdict || { valid: false, reason: 'no-analysis' },
    summary
  };
}

export default { runVisionAgent };


