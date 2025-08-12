import yaml
from composio_langgraph import ComposioToolSet
from ..config import settings
import logging
logger = logging.getLogger(__name__)

class ToolRegistry:
    def __init__(self):
        if not settings.composio_api_key or "dummy" in settings.composio_api_key.lower():
            logger.warning("COMPOSIO_API_KEY manquante ou invalide, outils Composio désactivés")
            self.toolset = None
            self.mcp = None
        else:
            logger.info(f"Using Composio API key: {settings.composio_api_key[:10]}...")  # partial log
            try:
                self.toolset = ComposioToolSet(api_key=settings.composio_api_key)
            except Exception as e:
                logger.error(f"Composio init failed: {e}. Vérifiez la clé API et le statut du serveur Composio.")
                self.toolset = None
            self.mcp = self.toolset.get_mcp() if self.toolset else None
        with open(settings.tool_config_path, 'r') as f:
            self.config = yaml.safe_load(f)

    def get_dynamic_tools(self, query: str, domains: list[str] = None):
        if not self.mcp:
            return []
        # Utiliser MCP pour charger outils dynamiquement basés sur query/domains
        dynamic_tools = self.mcp.load_tools(query=query, domains=domains)
        return dynamic_tools

    def get_tools(self, domains: list[str] = None, use_dynamic: bool = False):
        tools = []
        if use_dynamic:
            tools.extend(self.get_dynamic_tools(query="", domains=domains))
        
        # Seulement si toolset disponible
        if self.toolset:
            for tool_name, tool_info in self.config.get("tools", {}).items():
                if not domains or tool_info["domain"] in domains:
                    try:
                        tool = self.toolset.get_tool(tool_name)
                        if tool:
                            tools.append(tool)
                    except Exception as e:
                        logger.warning(f"Erreur chargement tool {tool_name}: {e}")
        else:
            logger.info("Aucun toolset disponible, retour liste vide")
        
        return tools
