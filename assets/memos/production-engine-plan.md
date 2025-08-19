# Production Engine – Minimal Vertical Plan (v0.1)

## Goals

- Remove demo/fallbacks; use real LLM flows with strict JSON.
- Define the size of iterative loop depending the user request, adapt retries and backoff.
- Minimal workers; high reuse via shared tools (`tools/editor.js`, `tools/github.js`).
- Unified worker IO contract: `{ success, data, artifacts, logs, meta }`.
- Simpler capability registry (actions only), intent-aware assignment.
- Concise, readable logs.

## Scope (Minimal Vertical Changes)

1) Engine loop

- [ ] Add intent-aware iteration caps: QA=1, WEB=2-3, DEV=2–4 (`MAX_ITERATIONS_INTENT_QA`, etc.).
- [ ] Backoff and retries: `BACKOFF_MS=1000`, default retries: QA/WEB=0, DEV=1.
- [ ] Critic sampling: `CRITIC_SAMPLE_RATE=0.25`; skip critic on obvious QA success.
- [ ] Decide fast-path: if QA answer non-empty → `halt`.

2) Capabilities (Simplify)

- [ ] Replace verbose JSON with action lists only:

```json
{
  "workers/qa": ["answer"],
  "workers/web": ["search"],
  "workers/developer": ["integrate", "generateCode"],
  "workers/editor": ["applyEdits"],
  "workers/vision": ["detect", "findText", "findAndClick"],
  "workers/interact": ["orchestrate"]
}
```

- [ ] Timeouts/tags/produces moved into code defaults and ENV.

3) Assign (Intent-aware, concise)

- [ ] Rules:
  - intent=qa → `workers/qa.answer` with `{ question: Goal }` → halt on non-empty answer.
  - intent=web → `workers/web.search` (optional summarize via `qa.answer`).
  - intent=dev → `workers/developer.integrate` (integrates + commits).
  - Only use `vision`/`interact` if Plan actions demand it.
- [ ] Prompt updates to reflect simplified capabilities and rules.

4) Developer worker

- [ ] `integrate({ spec, options })`: applies standard `edits` via `tools/editor`, commits baseline+final via `tools/github`.
- [ ] `generateCode({ spec })`: returns `edits` only (optional planning step).
- [ ] Keep IO contract unified.

5) Tools (modular)

- [ ] `tools/editor.js`: `applyEdits`, `backupFile`, `readFile`, `writeFile` (done; keep as single source of file writes).
- [ ] `tools/github.js`: `ensureUser`, `commitAll`, `currentBranch`, `push` (done; keep minimal sync shell).

6) Logging (concise)

- [ ] Use `[engine]`, `[qa]`, `[web]`, `[dev]`, `[vision]` prefixes.
- [ ] Default `LOG_LLM_STEPS=0`, keep final response + per-iteration summaries.
- [ ] Truncate to `LOG_TRUNCATE` (default 300–400 chars).

7) Strict production behavior

- [ ] No LLM fallbacks; throw if `OPENAI_API_KEY` missing.
- [ ] Validate Plan/Assign JSON; re-prompt once on parse error (future step).

8) Vision Axis (Minimal Vertical)

- [ ] Actions only: `workers/vision` exposes `detect`, `findText`, `findAndClick`.
- [ ] Unified IO contract `{ success, data, artifacts, logs, meta }`.
  - `data.best` returns normalized coordinates: `coords.abs` (screen), `coords.rel` (0..1), `coords.box` (px), and `alternatives` (top-k).
  - `artifacts.annotated` (image overlays) and `artifacts.trace` (labels/scores/thresholds).
- [ ] Platform constraint: on non-Linux, `findAndClick` does not click; returns coordinates and artifacts deterministically.
- [ ] Integration guideline: prefer `findText`/`findAndClick` to replace brittle sleeps in WU/Google Ads/WhatsApp when Plan actions require GUI steps.

9) Store all configurations in /core/config.js (defaults preferences)

- `MAX_ITERATIONS` (fallback); `MAX_ITERATIONS_INTENT_QA=1`, `WEB=2`, `DEV=3`
- `DEFAULT_RETRIES_QA=0`, `WEB=0`, `DEV=1`
- `BACKOFF_MS=1000`
- `CRITIC_SAMPLE_RATE=0.25`
- `LOG_LLM=1`, `LOG_LLM_STEPS=0`, `LOG_TRUNCATE=400`

- `VISION_THRESHOLD=0.12`
- `VISION_ARTIFACTS_DIR=screenshots/vision`
- `VISION_ANNOTATE=1`
- `VISION_TOPK=5`
- `VISION_WAIT_TIMEOUT_MS=30000`

## Tests (smoke)

- [ ] QA: `node run.js "question simple"` → single iteration, halt, answer non-empty.
- [ ] WEB: `node run.js "recherche X"` → search results; optional summary.
- [ ] DEV: `node run.js "implémente Y"` with `spec.edits` → edits applied + commits.
- [ ] VISION: `node tests/worker-vision.spec.js` → detect returns structured result and artifacts present.

## Next Steps (optional)

- Re-prompt on invalid JSON (Plan/Assign) with single retry.
- Add deadline: `ENGINE_DEADLINE_MS` to abort long runs.
- Persistent event log (JSONL) with span ids and token usage.

---

Changelog seed:

- Removed demo fallbacks; robust JSON parsing.
- Iterative loop implemented; intent extraction added.
- Developer integrates and commits via modular tools.
- Capability registry to be simplified to action lists.
