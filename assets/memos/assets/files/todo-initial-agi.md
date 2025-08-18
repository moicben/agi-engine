# To-do d’implémentation du Core Engine (LangGraph + Mémoire + Composio)

- Dépendances
  - Ajouter: `langgraph`, `langchain-core`, `pydantic`, `python-dotenv`, (au choix) `langchain-openai` ou `anthropic`, optionnels `fastapi`, `uvicorn`.
  - Garder: `composio-langgraph`.
  - Rationaliser: choisir `agentops` OU `opentelemetry-*` (un seul).
  - Retirer si non utilisés: `phidata`, `agno`, `duckduckgo-search`, `arxiv`, `runpod`, `docker`.

- Structure de projet (création de fichiers)
  - `core/__init__.py`
  - `core/config.py` (settings `.env`)
  - `core/state.py` (`AgentState` Pydantic)
  - `core/io/schemas.py` (I/O graphe)
  - `core/memory/base.py`, `core/memory/sqlite_store.py`
  - `core/tools/registry.py`, `core/tools/composio_tools.py`
  - `core/graph/graph.py` (graphe principal)
  - `core/service/api.py` (API HTTP)
  - `tool_config.yml`
  - `.env.example`, `Makefile` (install, run, test)

- Boucle ReAct (référence: react-agent)
  - Implémenter nœuds: policy → tool-exec → observation → loop-control.
  - Paramétrer le modèle via env (OpenAI ou Anthropic).
  - Activer des “interrupts” optionnels pour le debug.

- Mémoire (référence: memory-agent)
  - `retrieve_memory` avant décision; `store_memory` après actions “significatives”.
  - Store SQLite par défaut; summarization au-delà d’un seuil de tokens.
  - API simple: `put(session, item)`, `query(session, k)`, `summarize(session)`.

- Outils Composio (référence: composio-langgraph)
  - Initialiser Composio; enregistrer les outils via `tool_config.yml`.
  - Définir des “domain packs”: `identity`, `payments`, `whatsapp` (activation par session).
  - Configurer timeouts/retries/logging par outil.

- Adaptateurs vers le code Node existant
  - Choisir le transport unique (recommandé: HTTP).
  - Si HTTP: exposer des endpoints Node ou FastAPI Python selon le sens d’appel.
  - Implémenter 2 adaptateurs prioritaires (ex: extraction identité, étape Western Union).

- API d’orchestration
  - `POST /run` (inputs: `query`, `session_id`, `context`).
  - `GET /memory/{session_id}` (inspection mémoire).
  - Sécurisation basique (clé secrète/Bearer), logs structurés.

- Observabilité
  - Unifier la télémétrie: `agentops` OU `opentelemetry-*`.
  - Injecter `trace_id`/`session_id` dans tous les logs/outcomes.

- Tests
  - Unitaires: `sqlite_store`, `registry` Composio, `policy` du graphe.
  - E2E: 1 scénario “identité → paiement”, 1 scénario “WhatsApp → envoi”.
  - Ajouter cibles `make test`, `make run`.

- CI/CD
  - Lint + tests sur PR; build optionnel d’image.
  - Healthcheck API et variables d’environnement validées.

- Nettoyage et docs
  - Élaguer dépendances non utilisées; pinner les versions clés.
  - `README` du module `core/` (setup, API, exemples).
  - Mettre à jour `assets/files/agi-engine-infrastructure.md` pour intégrer le Core.

- Roadmap post-MVP
  - Backend mémoire Postgres/Supabase; mémoire vectorielle.
  - Nouveaux outils Composio (OCR avancé, anti-fraude).
  - Règles de coût/latence multi-modèles (optionnel).
