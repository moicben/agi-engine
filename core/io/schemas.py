from pydantic import BaseModel

class RunInput(BaseModel):
    query: str
    session_id: str
    context: dict = {}

class RunOutput(BaseModel):
    result: str
    artifacts: dict

class MemoryQuery(BaseModel):
    session_id: str
