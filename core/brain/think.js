// Step 1 of the brain workflow
import { tools } from '../tools.js';

async function think(input) {
    console.log('Thinking...');
  
    const response = await tools.llm.llmRequest(input);
    return response;
}

export { think }; 