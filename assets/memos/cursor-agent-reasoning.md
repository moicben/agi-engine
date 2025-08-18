## Cursor Agent Reasoning — Guide opérationnel

### Synthèse essentielle (TL;DR)
- **Contrats d’E/S inviolables**: Zod pour toutes les sorties LLM et entrées modules; rejeter le JSON non conforme, re-prompt + backoff.
- **Exécution DAG fiable**: topo-sort, idempotence par fingerprint de tâche, retries par tâche, side-effects en deux temps (dry-run → commit).
- **Coûts/latence sous contrôle**: cache des sorties LLM (clé = prompt_hash+inputs), RAG/memo avant LLM, critic échantillonné.
- **Observabilité claire**: logs JSONL append-only par run avec spans, task_id, coûts et token usage.
- **Capacités déclaratives**: registry capability → contraintes, coûts, side-effects, rate limits; routing par policy (sécurité, compliance, coût, latence).
- **Persistence minimale utile**: runs/<run_id>/ avec think.json, plan.json, assign.json, results.json, events.jsonl.
- **Boucle d’orchestration courte**: 8 étapes de think à persist; hard cap de 7 tâches; re-prompt auto sur plan invalide.
- **Tests rapides**: smoke (3 goals), chaos (erreurs), schema-fuzz (JSON invalide) pour durcir la boucle.

---

## Phasage et point d’appui

- **Phasage**: think → analyze → plan → assign → execute → critic.
- **Neutralité d’ID**: `run_id` + JSON strict en anglais pour l’évaluation et la traçabilité.
- **Registry de capacités**: indispensable pour router les tâches proprement.

## Pour être « tight » en production

### 1) Contrats d’E/S inviolables
- Zod (ou superstruct) pour TOUTES les sorties LLM et entrées des modules.
- Rejet de tout JSON non conforme → re-prompt automatique + backoff.

### 2) DAG minimal mais robuste
- Topo-sort + idempotence (clé = `task.fingerprint`) + retries par tâche.
- Side-effects fencing: d’abord dry-run, puis commit.

### 3) Coûts et latences maîtrisés
- Cache des sorties LLM (clé = `prompt_hash+inputs`), RAG/memo avant LLM.
- Critic échantillonné (ex. 1/5 runs) + rubrics courts (checklist binaire).

### 4) Observabilité utile
- Log JSONL append-only: `events/<run_id>.jsonl` avec level, span_id, task_id, cost, token_usage.
- Un span par module, correlation-id partout.

### 5) Capacities ≠ Outils
- Registry déclaratif (capability → contraintes, coûts estimés, side-effects, rate limits).
- Router via policy (sécurité, compliance, coût, latence) plutôt que par « nom de worker ».

---

## Squelettes de contrats

```ts
// core/schemas.ts
import { z } from "zod";

export const ThinkOut = z.object({
  run_id: z.string(),
  goals: z.array(z.string()).min(1),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  deltas_ref: z.array(z.string()).default([]),
});

export const PlanOut = z.object({
  run_id: z.string(),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    inputs: z.record(z.any()).default({}),
    depends_on: z.array(z.string()).default([]),
    capability: z.string(),
    cost_sensitivity: z.enum(["low","medium","high"]).default("medium"),
  })).min(1),
});

export const AssignOut = z.object({
  run_id: z.string(),
  assignments: z.array(z.object({
    task_id: z.string(),
    worker: z.string(),
    params: z.record(z.any()).default({}),
  })).min(1),
});
```

---

## Exécuteur DAG (simple et robuste)

```js
// core/engine/execute.js
import topo from "toposort";
import { writeEvent } from "./persist.js";

export async function execute(assignments, registry, { concurrency = 1 } = {}) {
  const edges = [];
  const byId = new Map();
  for (const a of assignments) byId.set(a.task_id, a);
  for (const a of assignments) {
    const deps = (a.depends_on || []);
    deps.forEach(d => edges.push([d, a.task_id]));
  }
  const order = topo(edges).filter(id => byId.has(id));

  const results = new Map();
  for (const id of order) {
    const a = byId.get(id);
    const impl = registry[a.worker];
    if (!impl) throw new Error(`Unknown worker ${a.worker}`);
    const span = `${a.task_id}:${Date.now()}`;

    let attempt = 0, lastErr;
    while (attempt < 3) {
      attempt++;
      try {
        const out = await impl.run(a.params, { results });
        results.set(id, out);
        await writeEvent({ type:"task_success", task_id:id, span, attempt });
        break;
      } catch (e) {
        lastErr = e;
        await writeEvent({ type:"task_error", task_id:id, span, attempt, error:String(e) });
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
    if (!results.has(id)) throw lastErr;
  }
  return Object.fromEntries(results);
}
```

> Idempotence: faire porter au `worker.run` la responsabilité d’ignorer un fingerprint déjà traité (hash des params) ou d’utiliser un lock léger (ex: ligne Supabase à clé unique).

---

## Registry de capacités (déclaratif)

```json
// core/engine/capabilities.json
{
  "web.search": {
    "cost_estimate": "low",
    "side_effects": "none",
    "rate_limit": "30/m",
    "requires": ["net_access"]
  },
  "whatsapp.send": {
    "cost_estimate": "medium",
    "side_effects": "external_message",
    "rate_limit": "10/m",
    "requires": ["wa_session"]
  }
}
```

```js
// core/engine/registry.js
import caps from "./capabilities.json";
export const registry = {
  "web.search": { meta: caps["web.search"], run: async(params)=>{/* ... */} },
  "whatsapp.send": { meta: caps["whatsapp.send"], run: async(params)=>{/* ... */} },
};
```

Routing assign: refuser si `requires` manquant, rate-limit dépassé, ou si la policy de coût viole `task.cost_sensitivity`.

---

## Critic utile (peu coûteux)
- Checklist courte par capability (ex. whatsapp.send: « message non vide », « compte non banné », « destinataire formaté »).
- Sampling (ex. 20%), auto-heal: si KO, annoter le plan avec un delta et relancer uniquement les tâches impactées.

## Persistence minimale mais utile
- Dossier `runs/<run_id>/` avec: `think.json`, `plan.json`, `assign.json`, `results.json` et `events.jsonl` (append-only).
- Si Supabase: bucket `runs/` et table `events(run_id, ts, span_id, level, payload)`.
- Ne jamais bloquer l’exécution sur l’upload distant (buffer local + flush async).

---

## Boucle d’orchestration raccourcie
1. think (inputs minimalistes: goals + 5 derniers memos)
2. analyze (RAG + contraintes + risques)
3. plan (**max 7 tâches**)
4. lint-plan (Zod + policy + coût estimé)
5. assign (registry + contraintes)
6. execute (DAG + retries + idempotence)
7. critic (checklist/sampling)
8. persist + métriques

Si lint-plan échoue → re-prompt automatique avec message d’erreur synthétique (≤ 3 lignes).

---

## Tests qui comptent
- Smoke: 3 goals typiques (doc, web-action, WhatsApp) → run complet.
- Chaos: injecter des pannes (`worker.run` throw) et vérifier retries + logs.
- Schema-fuzz: invalider volontairement la sortie LLM pour tester le re-prompt.

---

## Recommandations « ultra focus valeur »
- Réduire le LLM: RAG avant LLM, cache agressif, prompts < 200 lignes, critic échantillonné.
- Limiter la complexité: `tasks <= 7`, profondeur `<= 2`. Le reste → itération suivante.
- Capacities > Tools: penser policies (coût/risque/latence) pour router automatiquement.
- Idempotence partout: un run peut être relancé sans dégâts.
- Traçabilité sobre: JSONL + spans + token usage.
- LLM bugs: valider chaque sortie via Zod pour éviter le JSON pourri en aval.
- WhatsApp: encapsuler en `whatsapp.*` tous les side-effects (envoi, sessions, quotas) avec garde-fous et dry-run.

---

## Exemple « de bout en bout »

Plan (LLM) → Assign (routage) → Execute (résultats)

```json
// plan.json
{
  "run_id": "2025-08-18T13:00:00Z#001",
  "tasks": [
    {
      "id": "t1",
      "title": "Search 5 leads Bali real-estate devs",
      "description": "Find 5 boutique developers in Bali with public emails.",
      "inputs": {"query":"Bali boutique real estate developer contact email"},
      "depends_on": [],
      "capability": "web.search",
      "cost_sensitivity": "low"
    },
    {
      "id": "t2",
      "title": "Send intro WhatsApp",
      "description": "Send a short intro message to each lead.",
      "inputs": {"template":"Hi {{name}}, quick question about raising funds via tokenization…"},
      "depends_on": ["t1"],
      "capability": "whatsapp.send",
      "cost_sensitivity": "high"
    }
  ]
}
```

```json
// assign.json
{
  "run_id": "2025-08-18T13:00:00Z#001",
  "assignments": [
    {"task_id":"t1","worker":"web.search","params":{"query":"Bali boutique real estate developer contact email","max":5}},
    {"task_id":"t2","worker":"whatsapp.send","params":{"template":"Hi {{name}}, quick question about raising funds via tokenization…"}}
  ]
}
```

Résultat attendu: `t1` produit `[{name, phone/email}]`; `t2` consomme `results.get('t1')` et rend `{sent: n, failed: m}`; le critic vérifie formats + quotas.

---

Fin.

Super base. Voilà comment tirer le max de cette logique “think → analyze → plan → assign → execute → critic”, en coupant le bruit et en maximisant la valeur opérationnelle dès maintenant.

1) Point d’appui : ce qui est déjà bon
	•	Phasage clair (penser → agir) et persistence prévue.
	•	Neutralité d’ID (run_id) et JSON strict en anglais → parfait pour l’éval et la traçabilité.
	•	Registry de capacités → indispensable pour router les tâches.

2) Ce qui manque pour être “tight” en prod
	1.	Contrats d’E/S inviolables
	•	Schémas Zod (ou superstruct) pour TOUTES les sorties LLM + entrées modules.
	•	Rejeter tout JSON non conforme → re-prompt automatique + backoff.
	2.	DAG minimal mais fiable
	•	Topo-sort + idempotence (keyed by task.fingerprint) + retries à granularité tâche.
	•	Side-effects fencing: “dry-run” puis “commit”.
	3.	Coûts & latences sous contrôle
	•	Cache de sorties LLM (clé = prompt_hash+inputs), RAG/memo avant LLM.
	•	Critic échantillonné (p.ex. 1/5 runs) + rubrics courts (checklist binaire).
	4.	Observabilité
	•	Log JSONL append-only: events/run_id.jsonl (level, span_id, task_id, cost, token_usage).
	•	Span par module, correlation-id partout.
	5.	Capacities ≠ Outils
	•	Registry déclaratif (capability → constraints, coûts estimés, side-effects, rate limits).
	•	Router par policy (sécurité, compliance, coût, latence) plutôt que par “nom de worker”.

3) Squelettes de contrats (ultra courts)

// core/schemas.ts
import { z } from "zod";

export const ThinkOut = z.object({
  run_id: z.string(),
  goals: z.array(z.string()).min(1),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  deltas_ref: z.array(z.string()).default([]),
});

export const PlanOut = z.object({
  run_id: z.string(),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    inputs: z.record(z.any()).default({}),
    depends_on: z.array(z.string()).default([]),
    capability: z.string(),          // clé du registry
    cost_sensitivity: z.enum(["low","medium","high"]).default("medium"),
  })).min(1),
});

export const AssignOut = z.object({
  run_id: z.string(),
  assignments: z.array(z.object({
    task_id: z.string(),
    worker: z.string(),
    params: z.record(z.any()).default({}),
  })).min(1),
});

4) DAG exécuteur (simple & robuste)

// core/engine/execute.js
import topo from "toposort";
import { writeEvent } from "./persist.js";

export async function execute(assignments, registry, { concurrency = 1 } = {}) {
  const edges = [];
  const byId = new Map();
  for (const a of assignments) byId.set(a.task_id, a);
  for (const a of assignments) {
    const deps = (a.depends_on || []);
    deps.forEach(d => edges.push([d, a.task_id]));
  }
  const order = topo(edges).filter(id => byId.has(id)); // topo sort

  const results = new Map();
  for (const id of order) {
    const a = byId.get(id);
    const impl = registry[a.worker];
    if (!impl) throw new Error(`Unknown worker ${a.worker}`);
    const span = `${a.task_id}:${Date.now()}`;

    let attempt = 0, lastErr;
    while (attempt < 3) {
      attempt++;
      try {
        const out = await impl.run(a.params, { results });
        results.set(id, out);
        await writeEvent({ type:"task_success", task_id:id, span, attempt });
        break;
      } catch (e) {
        lastErr = e;
        await writeEvent({ type:"task_error", task_id:id, span, attempt, error:String(e) });
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
    if (!results.has(id)) throw lastErr;
  }
  return Object.fromEntries(results);
}

Idempotence: faites porter au worker.run la responsabilité d’ignorer un fingerprint déjà traité (ex: hash des params), ou d’utiliser un lock léger (ex: Supabase row with unique key).

5) Registry de capacités (vraiment déclaratif)

// core/engine/capabilities.json
{
  "web.search": {
    "cost_estimate": "low",
    "side_effects": "none",
    "rate_limit": "30/m",
    "requires": ["net_access"]
  },
  "whatsapp.send": {
    "cost_estimate": "medium",
    "side_effects": "external_message",
    "rate_limit": "10/m",
    "requires": ["wa_session"]
  }
}

// core/engine/registry.js
import caps from "./capabilities.json";
export const registry = {
  "web.search": { meta: caps["web.search"], run: async(params)=>{/*...*/} },
  "whatsapp.send": { meta: caps["whatsapp.send"], run: async(params)=>{/*...*/} },
};

Routing assign: refuser si requires manquant, si rate-limit dépassé, ou si policy de coût viole task.cost_sensitivity.

6) “Critic” qui aide vraiment (pas cher)
	•	Utiliser une checklist courte par capability (ex. whatsapp.send: “message non vide”, “compte non banné”, “destinataire formaté”).
	•	Sampling (p.ex. 20%), et auto-heal: si KO, annoter le plan avec un delta et relancer uniquement la/les tâches impactées.

7) Persistence minimaliste mais utile
	•	runs/<run_id>/ :
	•	think.json, plan.json, assign.json, results.json
	•	events.jsonl (append)
	•	Si Supabase: buckets runs/, table events(run_id, ts, span_id, level, payload).
	•	Jamais bloquer l’exécution sur l’upload distant (buffer local + flush async).

8) “apply_patch” fiable dans Cursor
	•	Format V4A exact (pas d’espace avant “Begin Patch”) :

Begin Patch
Add File: assets/memos/engine-integration.md
# Engine Integration – Phases 1 & 2

- Created: 2025-08-18
- Context improved by Giga AI

## Summary
(…)
End Patch

	•	Chemins relatifs, dossier existant.
	•	Si 3 échecs: fallback edit_file avec target_file: assets/memos/engine-integration.md et code_edit contenu complet.

9) Boucle d’orchestration raccourcie (une passe “A/B”)
	1.	think (inputs minimalistes: goals + last 5 memos)
	2.	analyze (RAG + contraintes + risques)
	3.	plan (MAX 7 tâches; hard cap)
	4.	lint-plan (Zod + policy + coût estimé)
	5.	assign (registry + contraintes)
	6.	execute (DAG + retries + idempotence)
	7.	critic (checklist/sampling)
	8.	persist + métriques

Si lint-plan échoue → auto-reprompt du plan avec message d’erreur synthétique (3 lignes max).

10) Tests rapides qui comptent
	•	Smoke: 3 goals typiques (doc, web-action, WhatsApp) → run complet.
	•	Chaos: injecter pannes (worker.run throw), vérifier retry + logs.
	•	Schema-fuzz: invalider volontairement la sortie LLM pour tester re-prompt.

11) Recos “ultra foc valeur”
	•	Réduire le LLM: RAG avant LLM, cache agressif, prompts < 200 lignes, critic échantillonné.
	•	Limiter la complexité: tasks <= 7, depth <= 2. Tout le reste = itération suivante.
	•	Capacities > Tools: pensez policies (coût/risque/latence) pour router automatiquement.
	•	Idempotence partout: un run peut être relancé sans dégâts.
	•	Traçabilité sobre: JSONL + spans + token usage → vous saurez où ça brûle.
	•	LLM bugs: valider chaque sortie via Zod → pas de JSON pourri en aval.
	•	WhatsApp: encapsuler tous les side-effects (envoi, sessions, quotas) dans une capability whatsapp.* avec garde-fous et dry-run.

12) Mini-exemple “de bout en bout”

Plan (LLM) → Assign (routage) → Execute (résultats)

// plan.json
{
  "run_id": "2025-08-18T13:00:00Z#001",
  "tasks": [
    {
      "id": "t1",
      "title": "Search 5 leads Bali real-estate devs",
      "description": "Find 5 boutique developers in Bali with public emails.",
      "inputs": {"query":"Bali boutique real estate developer contact email"},
      "depends_on": [],
      "capability": "web.search",
      "cost_sensitivity": "low"
    },
    {
      "id": "t2",
      "title": "Send intro WhatsApp",
      "description": "Send a short intro message to each lead.",
      "inputs": {"template":"Hi {{name}}, quick question about raising funds via tokenization…"},
      "depends_on": ["t1"],
      "capability": "whatsapp.send",
      "cost_sensitivity": "high"
    }
  ]
}

// assign.json
{
  "run_id": "2025-08-18T13:00:00Z#001",
  "assignments": [
    {"task_id":"t1","worker":"web.search","params":{"query":"Bali boutique real estate developer contact email","max":5}},
    {"task_id":"t2","worker":"whatsapp.send","params":{"template":"Hi {{name}}, quick question about raising funds via tokenization…"}}
  ]
}

Résultat attendu: t1 produit [{name, phone/email}]; t2 consomme results.get('t1'), rend {sent: n, failed: m}; critic vérifie format + quotas.

⸻
