from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import logging

# Ajouter configuration basique du logging
logging.basicConfig(level=logging.INFO, format="[%(asctime)s][%(levelname)s] %(message)s")

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    openai_api_key: Optional[str] = Field(default=None)
    composio_api_key: Optional[str] = Field(default=None)
    model_provider: str = "openai"
    model_name: str = "gpt-4o-mini"
    memory_db_path: str = "memory.sqlite"
    tool_config_path: str = "tool_config.yml"
    memory_store_type: str = "supabase"  # hybrid, sqlite, supabase
    supabase_url: Optional[str] = Field(default=None)
    supabase_key: Optional[str] = Field(default=None)
    anthropic_api_key: Optional[str] = Field(default=None)

    langchain_api_key: Optional[str] = Field(default=None, env="LANGCHAIN_API_KEY")

    class Config:
        env_prefix = ""
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Déplacer et ajouter logs ici
#logger.info(f"Chargement de .env réussi ? OpenAI key: {settings.openai_api_key}")
#logger.info(f"Anthropic key (via composio): {settings.composio_api_key}")
#logger.info(f"Model provider: {settings.model_provider}")

LLM_PROVIDERS = {
    "openai": {"model": "gpt-4o-mini", "api_key": settings.openai_api_key},
    "anthropic": {"model": "claude-3-sonnet-20240229", "api_key": settings.composio_api_key}
}