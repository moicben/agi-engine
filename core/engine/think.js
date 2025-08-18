import * as llm from '../../tools/llm.js';

// Think step: simple free-thinking string passthrough to LLM
async function think(input) {
  const response = await llm.llmRequest(input);
  return response;
}

export { think };