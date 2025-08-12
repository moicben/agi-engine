# Placeholder for custom Composio tools and Node adapters
from langchain_core.tools import tool
from tenacity import retry, stop_after_attempt, wait_exponential
import logging
logger = logging.getLogger(__name__)
from langchain_core.tools import ToolExecutionError

@tool
def node_identity_extract(data: dict) -> dict:
    """Adapter to Node identity extraction."""
    import requests
    response = requests.post("http://localhost:3000/identity/extract", json=data)  # assume Node endpoint
    return response.json()

@tool
def western_union_step(data: dict) -> dict:
    """Adapter to Western Union payment step."""
    # TODO: HTTP call to workflows/westernunion/westernFlow.js
    return {"status": "processed"}

@tool
def whatsapp_send(data: dict) -> dict:
    """Adapter to WhatsApp send."""
    import requests
    response = requests.post("http://localhost:3000/whatsapp/send", json=data)
    return response.json()

# Add more @tool decorators for payments, whatsapp

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry_error_callback=lambda _: None  # Fallback silencieux
)
def safe_tool_invoke(tool, **kwargs):
    try:
        return tool.invoke(**kwargs)
    except Exception as e:
        logger.error(f"Tool {tool.name} failed: {e}")
        raise ToolExecutionError(tool.name, str(e))
