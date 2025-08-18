// Utilitaire pour OpenAI

import { config } from '../core/config.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

export async function llmRequest(input, model = config.llm.model) {
    // OBSERVATION: The OpenAI constructor does not accept a 'model' parameter; 'model' must be provided in the request payload.
    // REASONING: Error logs show "you must provide a model parameter" because the model is not included in the chat.completions.create call.
    // PLAN: Move 'model' from the OpenAI constructor to the request payload.
    console.log('model', model);
    console.log('apiKey', process.env.OPENAI_API_KEY);
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
        model: config.llm.model,
        messages: [{ role: 'user', content: input }],
    });

    // Optionally log the response for debugging
    // console.log(response);

    return response.choices[0].message.content;
}