from langgraph.graph import StateGraph, END
from ..llm.factory import LLMFactory
from langchain_core.prompts import PromptTemplate
from ..state import AgentState
from ..memory.repository import MemoryRepository
from ..tools.registry import ToolRegistry
from ..config import settings
from composio_langgraph import ComposioToolSet
import os

if settings.langchain_api_key:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langchain_api_key
    os.environ["LANGCHAIN_PROJECT"] = "agi-engine"
else:
    logger.warning("LANGCHAIN_API_KEY manquante, tracing LangSmith désactivé")

memory = MemoryRepository().store
tools_registry = ToolRegistry()
tools = tools_registry.get_tools() or []  # handle empty

llm = LLMFactory.create_with_fallback()  # Multi-LLM avec fallback automatique
llm_with_tools = llm.bind_tools(tools) if llm else None

prompt = PromptTemplate.from_template("Query: {query}\nMemory: {memory}\nLast: {last_action}\nDecide action or respond final.")

def policy(state: AgentState):
    mem = memory.query(state.session_id, state.query)  # Fix: ajouter query parameter
    input = prompt.format(query=state.query, memory=mem, last_action=state.last_action)
    action = llm_with_tools.invoke(input)  # returns tool call or text
    if hasattr(action, 'tool_calls') and action.tool_calls:
        tool_call = action.tool_calls[0]
        return {
            "last_action": tool_call['name'],
            "tool_args": tool_call.get('args', {})  # Extraire les arguments
        }
    else:
        memory.put(state.session_id, f"Final response: {action.content}")
        return {"last_action": "final", "artifacts": {"response": action.content}}

def tool_exec(state: AgentState) -> AgentState:
    tool_name = state.last_action
    tool_args = state.tool_args or {}  # Args par défaut vides MAIS sécurisés
    
    # Validation des args requis - Fix: recherche correcte dans la liste tools
    tool = next((t for t in tools if t.name == tool_name), None)
    if not tool:
        return state.copy(update={
            "tool_result": f"Tool {tool_name} not found",
            "artifacts": {"error": f"Tool {tool_name} not found"}
        })
    
    # Exécution avec timeout (sera ajouté après install dependencies)
    try:
        result = tool.invoke(**tool_args)
        memory.put(state.session_id, f"Tool {tool_name} result: {result}")
        return state.copy(update={
            "tool_result": result,
            "artifacts": {tool_name: result}
        })
    except Exception as e:
        error_msg = f"Error executing {tool_name}: {str(e)}"
        memory.put(state.session_id, error_msg)
        return state.copy(update={
            "tool_result": error_msg,
            "artifacts": {"error": error_msg}
        })

def store_memory(state: AgentState):
    summary = memory.summarize(state.session_id)
    return {"memory": [summary]}

def should_continue(state):
    if not tools and state.last_action != "final":
        return "end"  # skip if no tools
    return "continue" if state.last_action != "final" else "end"

graph = StateGraph(AgentState)
graph.add_node("policy", policy)
graph.add_node("tool_exec", tool_exec)
graph.add_node("store_memory", store_memory)
graph.add_conditional_edges("policy", should_continue, {"continue": "tool_exec", "end": END})
graph.add_edge("tool_exec", "store_memory")
graph.add_edge("store_memory", "policy")
graph.set_entry_point("policy")
app = graph.compile(interrupt_before=["tool_exec"])  # optional interrupt for debug
