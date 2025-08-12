from typing import TypedDict, List, Any
from pydantic import BaseModel

class AgentState(BaseModel):
    query: str
    session_id: str
    memory: List[str] = []
    last_action: str = ""
    artifacts: dict = {}
    tool_args: dict = {}  # Arguments pour l'exécution d'outils
    tool_result: Any = None  # Résultat de l'exécution d'outil
