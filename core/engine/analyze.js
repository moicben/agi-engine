import * as llm from '../../tools/llm.js';

export async function analyze(context) {
  const prompt = `Tu es l'étape Analyse d'un pipeline d'IA appliqué au développement logiciel.
Objectif (goal): ${context.goal}
Pensée préalable (self-thought): ${context.selfThought}
Conscience: ${context.conscience}
Mémoire/contextes utiles: ${context.memorySnippet}
Aperçu du dossier/projet: ${context.folderSummary}

Consigne: approfondis et clarifie la demande. Décris précisément le problème, les contraintes implicites/explicites, les dépendances, les risques et ambiguïtés. Propose des angles d'analyse techniques (architecture, données, sécurité, DX, tests, déploiement) et des pistes concrètes. Garde créativité et profondeur mais PRODUIS UNIQUEMENT un JSON strict, en français, sans aucune mise en forme Markdown ni caractères backtick. Commence par { et termine par }. Pas de champs en double, pas de virgules finales.

Schéma JSON attendu:
{
  "etape": "Analyse",
  "resume": string,
  "probleme": { "description": string, "contraintes": { "explicites": string[], "implicites": string[] } },
  "dependances": string[],
  "risques": string[],
  "ambiguities": string[],
  "angles": { "architecture": string, "donnees": string, "securite": string, "dx": string, "tests": string, "deploiement": string },
  "pistes": [ { "titre": string, "details": string } ],
  "questions_ouvertes": string[],
  "hypotheses": string[]
}`;
  const out = await llm.llmRequest(prompt);
  return out;
}

export default { analyze };
