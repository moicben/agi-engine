from fastapi import FastAPI, HTTPException
from ..io.schemas import RunInput, RunOutput, MemoryQuery
from ..graph.graph import app as graph_app, memory
from langsmith import traceable

api = FastAPI()

@traceable(name="run_agent")
@api.post("/run", response_model=RunOutput)
async def run_agent(input: RunInput):
    state = {"query": input.query, "session_id": input.session_id}
    try:
        result = graph_app.invoke(state)
        return RunOutput(result=result["artifacts"])
    except Exception as e:
        raise HTTPException(500, str(e))

@api.get("/memory/{session_id}")
async def get_memory(session_id: str):
    return {"memory": memory.query(session_id)}
