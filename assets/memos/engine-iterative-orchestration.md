# Engine-Centric Iterative Orchestration (MVP)

This document specifies a deterministic, machine-actionable plan to consolidate orchestration into the Engine with micro-iterations, persistence, and a standard worker contract. English-only prompts and outputs.

## 1) Scope and assumptions

- In-scope workers: `workers/vision` and `workers/interact`and `workers/coder`
- Orchestration in Engine; agents stay thin or are retired later.
- Micro-iterations (1–3 tasks/iteration), strict JSON outputs, light fail policy.

## 2) High-level flow

Analyze → Plan (micro) → Assign → Execute → Critic → Decide (Iterate/Halt).

## 3) Data contracts


### Think (context-analysis and goals-understanding)

Improves in merging execution context and user-goal comprehension, keeped in each loop to drive right progression and iteratives-advised planning.

### Plan (no executors)

```json
{
  "stage": "Plan",
  "iteration": "it-0001",
  "tasks": [
    {
      "id": "t1",
      "name": "Detect SWIFT badge",
      "objective": "Locate SWIFT badge in the input image",
      "inputs": { "image": {"ref": "context.image"}, "query": "SWIFT", "annotate": true },
      "outputs": { "coords": "box", "annotated_path": "path" },
      "actions": ["zero-shot-detect", "annotate-box"],
      "dependencies": [],
      "acceptance": ["coords != null", "score >= 0.12"],
      "risks": ["low contrast", "false positives"],
      "mitigations": ["multi-scale crops", "adaptive thresholding"]
    }
  ],
  "notes": "Short iteration; persist artifacts for audit"
}
```

### Assign (capability-aware, runnable)

```json
{
  "stage": "Assign",
  "orchestrator": "engine",
  "assignments": [
    {
      "order": 1,
      "task_id": "t1",
      "name": "Detect SWIFT badge",
      "executor": "workers/vision.detect",
      "params": { "image": {"ref":"context.image"}, "query": "SWIFT", "annotate": true },
      "timeout_ms": 60000,
      "retries": 1,
      "artifacts_in": [],
      "artifacts_out": ["coords", "annotated_path"],
      "validations": ["coords != null"]
    }
  ]
}
```

### Unified worker result envelope

```json
{
  "success": true,
  "data": { "coords": {"x":0, "y":0, "width":0, "height":0}, "score": 0.83, "annotated_path": "/abs/path" },
  "artifacts": [{ "name": "annotated_path", "type": "image", "path": "/abs/path" }],
  "logs": ["concise operational logs"],
  "meta": { "duration_ms": 1520, "retries": 0, "executor": "workers/vision.detect", "ts": "ISO-8601" }
}
```

### Critic verdict

```json
{
  "stage": "Critic",
  "task_id": "t1",
  "success": true,
  "progress": true,
  "critic": "Detection valid; continue",
  "recommendations": [],
  "next": { "action": "continue" }
}
```

### Run ledger entry (JSONL)

```json
{
  "run_id": "<engine-id>:2025-08-18T12-00-00Z",
  "iteration": "it-0001",
  "phase": "execute",
  "task_id": "t1",
  "status": "success",
  "payload": { "result_envelope": "..." },
  "ts": "ISO-8601"
}
```

## 4) Capability registry (static)

Location: `core/engine/capabilities.json`

```json
{
  "workers/vision": {
    "detect": {
      "params": ["image", "query", "annotate?", "outPath?", "threshold?"],
      "produces": ["coords", "score", "annotated_path"],
      "tags": ["vision", "zero-shot", "owlv2"],
      "timeouts": { "default_ms": 60000 }
    }
  },
  "workers/interact": {
    "orchestrate": {
      "params": ["decision", "context?"],
      "produces": ["success", "action", "data"],
      "tags": ["gui", "input"],
      "timeouts": { "default_ms": 30000 }
    }
  }
}
```

## 5) Task queue & state machine (Simplified)

- Topological sort by `dependencies`, concurrency=1.
- Task states: pending → running → success | failed | skipped | cancelled (transient retrying).
- Run states: in_progress → success | failed.
- Critic decides: continue | retry | replan | skip.

## 6) Persistence layout

`runs/<engine-id>/<ts-run-id>/`

- `context.json`
- `iteration-it-0001/plan.json`
- `iteration-it-0001/assign.json`
- `iteration-it-0001/tasks/t1/execute.json`
- `iteration-it-0001/tasks/t1/critic.json`
- `ledger.jsonl`
- `artifacts/`

Engine ID source: `kasm-data/docker/engine-id` (fallback UUID). Include in `run_id`. ( NO NEED Engine ID Source)

## 7) Prompt templates (English, JSON-only)

- Analyze: constraints, dependencies, risks, unknowns, required data/secrets.
- Plan: 1–3 tasks with id/objective/inputs/outputs/actions/dependencies/acceptance/risks/mitigations.
- Assign: map tasks to worker.function with params, timeout_ms, retries.
- Critic: evaluate vs acceptance; next.action: continue | retry | replan | skip.

## 8) Execution logic (Engine)

- Param resolution: `context` → prior outputs (future: { "ref": "tX.output" }).
- Timeout wrapper; capture duration_ms.
- Persist execute/critic; append ledger.
- Incremental thinking and iteratives maintened-logic

## 9) Fail policy (MVP)

- retries=3 default; fixed 4s backoff.
- On repeat failure: end iteration; re-enter analyze/plan with failure deltas and enhanced critisism context

## 10) Workers & tools

- Workers return unified envelope; export `capabilities` static object.
- Tools are pure modules under `tools/vision/*` and `tools/interact.js`.
- Pre-create the new worker `developer`  (fully prebuilt integration) without yet integrating him in engine orchestration

## 11) Optional

- `plan.graph.json` (adjacency) for visualization only, YES DO

## 12) Milestones

1) Engine: add `critic.js`, `execute.js`; extend `plan.js`, `assign.js`, `think.js`
2) Persistence: implement `runs/` layout and ledger.
3) Workers: normalize envelopes; add `capabilities`; static registry.
4) Pre-create `developer` worker fully plugable in future
5) Loop: per-iteration state machine, retries, critic decisions.
6) Determinism: strict JSON schemas; validate + one retry on parse error.

## 13) Aditionnals decisions

- Registry path: `core/engine/capabilities.json`. OK
- Persistence root in `core/runs/`.
- Keep secrets in .env
