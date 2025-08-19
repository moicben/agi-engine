import { llmRequest } from '../tools/llm.js';
import { config } from '../core/config.js';

export async function answer({ question = '', context = '' } = {}) {
  const started = Date.now();
  const prompt = `Answer the user's question concisely and accurately. If context is provided, ground your answer in it.
Question: ${String(question)}
Context: ${typeof context === 'string' ? context : JSON.stringify(context)}
Return ONLY the plain text answer without JSON.`;
  const content = await llmRequest(prompt, config?.llm?.models?.qa || config?.llm?.model || 'gpt-4o-mini');
  return {
    success: true,
    data: { answer: content },
    artifacts: [],
    logs: ['qa.answer completed'],
    meta: { duration_ms: Date.now() - started }
  };
}

export default { answer };


