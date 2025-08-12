# core/llm/factory.py
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from ..config import settings
import logging

logger = logging.getLogger(__name__)

# Ajouter log au niveau module pour vérifier keys dès l'import
#logger.info("--- Début factory.py ---")
#logger.info(f"Clé OpenAI depuis settings: {settings.openai_api_key}")
#logger.info(f"Clé Anthropic depuis settings: {settings.anthropic_api_key}")
#logger.info("--- Fin vérif keys ---")

class LLMFactory:
    """Factory pour créer des instances LLM avec fallback automatique."""

    @staticmethod
    def create_llm(provider: str, **kwargs):
        """Créer un LLM basé sur le provider."""
        # Utiliser le default approprié pour la validation
        default_key = settings.openai_api_key if provider == "openai" else settings.anthropic_api_key if provider == "anthropic" else None
        api_key = kwargs.get("api_key", default_key)

        if not api_key or "dummy" in api_key.lower():
            raise ValueError(f"Clé API invalide ou manquante pour {provider}")

        if provider == "openai":
            return ChatOpenAI(
                model=kwargs.get("model", "gpt-4o-mini"),
                api_key=kwargs.get("api_key", settings.openai_api_key),
                temperature=kwargs.get("temperature", 0.1)
            )
        elif provider == "anthropic":
            return ChatAnthropic(
                model=kwargs.get("model", "claude-3-sonnet-20240229"),
                api_key=kwargs.get("api_key", settings.anthropic_api_key),  # Utiliser la clé Anthropic dédiée
                temperature=kwargs.get("temperature", 0.1)
            )
        else:
            raise ValueError(f"Provider {provider} not supported")
    
    @staticmethod
    def create_with_fallback(primary: str = None, fallback: str = None):
        """Créer un LLM avec fallback automatique."""
        primary = primary or settings.model_provider
        fallback = fallback or ("anthropic" if primary == "openai" else "openai")
        
        try:
            logger.info(f"Tentative création LLM primary: {primary}")
            llm = LLMFactory.create_llm(primary)
            # Test rapide de connexion
            llm.invoke("test")
            logger.info(f"LLM {primary} opérationnel")
            return llm
        except Exception as e:
            logger.warning(f"LLM {primary} échoué: {e}, fallback vers {fallback}")
            try:
                if (fallback == "anthropic" and not settings.anthropic_api_key) or (fallback == "openai" and not settings.openai_api_key):
                    raise ValueError(f"Pas de clé valide pour fallback {fallback}")
                return LLMFactory.create_llm(fallback)
            except Exception as e2:
                logger.error(f"Fallback {fallback} aussi échoué: {e2}")
                raise  # Lever l'erreur pour arrêter, au lieu de dernier recours
    
    @staticmethod
    def get_available_providers():
        """Retourne la liste des providers disponibles."""
        providers = []
        if settings.openai_api_key:
            providers.append("openai")
        if settings.composio_api_key:  # Assumant qu'on peut réutiliser pour Anthropic
            providers.append("anthropic")
        return providers
