// Utilitaire pour OpenAI

import { config } from '../core/config.js';
import OpenAI from 'openai';

export async function llmRequest(input) {
    // OBSERVATION: The OpenAI constructor does not accept a 'model' parameter; 'model' must be provided in the request payload.
    // REASONING: Error logs show "you must provide a model parameter" because the model is not included in the chat.completions.create call.
    // PLAN: Move 'model' from the OpenAI constructor to the request payload.

    const openai = new OpenAI({
        apiKey: config.llm.apiKey,
    });

    const response = await openai.chat.completions.create({
        model: config.llm.model,
        messages: [{ role: 'user', content: input }],
    });

    // Optionally log the response for debugging
    // console.log(response);

    return response.choices[0].message.content;
}