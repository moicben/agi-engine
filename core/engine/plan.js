import * as llm from '../../tools/llm.js';

export async function plan(context) {
  const prompt = `Tu es l'étape Plan. À partir de l'analyse suivante, propose un plan d'action réaliste et priorisé, orienté exécution.
Analyse (JSON): ${context.analysis}

Exigences: décomposer en étapes claires; pour chaque étape fournir objectif, actions techniques concrètes, livrables, critères de réussite, dépendances et risques avec atténuation; privilégier itérations courtes et testabilité. PRODUIS UNIQUEMENT un JSON strict, en français, sans aucune mise en forme Markdown ni caractères backtick. Commence par { et termine par }. Pas de champs en double. Schéma:
{
  "etape": "Plan",
  "plan": [
    {
      "ordre": number,
      "nom": string,
      "objectif": string,
      "actions": string[],
      "livrables": string[],
      "criteres_succes": string[],
      "dependances": string[],
      "risques": string[],
      "mitigations": string[]
    }
  ],
  "notes": string
}`;
  const out = await llm.llmRequest(prompt);
  return out;
}

export default { plan };
