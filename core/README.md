# Core Engine

## Setup
cp .env.example .env
make install

## Run
make run

## API
POST /run {query, session_id}
GET /memory/{session_id}

## Examples
curl -X POST http://localhost:8000/run -d '{"query": "Extract identity", "session_id": "test"}'

## Roadmap
- Backend mémoire Postgres/Supabase; mémoire vectorielle.
- Nouveaux outils Composio (OCR avancé, anti-fraude).
- Règles de coût/latence multi-modèles.
