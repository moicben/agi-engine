import * as llm from '../../tools/llm.js';

export async function assign(context) {
  const prompt = `Tu es l'étape Assign. À partir du plan ci-dessous, produis une répartition d'exécution très explicite dans un contexte de dev.
Plan (JSON): ${context.plan}
Objectif: ${context.goal}
Contexte: ${JSON.stringify(context.context || {}, null, 2)}

Pour chaque étape du plan, précise exécuteur, actions concrètes, artefacts et validations. PRODUIS UNIQUEMENT un JSON strict, en français, sans aucune mise en forme Markdown ni caractères backtick. Commence par { et termine par }. Schéma:
{
  "etape": "Assign",
  "orchestrateur": "cursor-cli" | "script-node" | "api" | "humain" | string,
  "assignments": [
    {
      "ordre": number,
      "nom": string,
      "executant": string,
      "actions": string[],
      "artefacts": string[],
      "validations": string[]
    }
  ]
}`;
  const out = await llm.llmRequest(prompt);
  return out;
}

export default { assign };
