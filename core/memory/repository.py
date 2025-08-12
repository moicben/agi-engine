# core/memory/repository.py
from .base import MemoryStore
from .sqlite_store import SQLiteMemoryStore
from .hybrid_store import HybridMemoryStore
from ..config import settings
import logging

logger = logging.getLogger(__name__)

class MemoryRepository:
    """Repository pattern pour abstraction des stores mémoire."""
    
    def __init__(self, store_type: str = None):
        store_type = store_type or getattr(settings, 'memory_store_type', 'hybrid')
        
        try:
            if store_type == "hybrid":
                self.store = HybridMemoryStore()
                logger.info("Utilisation HybridMemoryStore (SQLite + FAISS)")
            elif store_type == "supabase":
                from .supabase_store import SupabaseMemoryStore
                self.store = SupabaseMemoryStore()
                logger.info("Utilisation SupabaseMemoryStore (PostgreSQL + pgvector)")
            elif store_type == "sqlite":
                self.store = SQLiteMemoryStore()
                logger.info("Utilisation SQLiteMemoryStore seul")
            else:
                logger.warning(f"Store type {store_type} inconnu, fallback vers hybrid")
                self.store = HybridMemoryStore()
        except Exception as e:
            logger.error(f"Erreur init store {store_type}: {e}, fallback vers SQLite")
            self.store = SQLiteMemoryStore()
    
    def put(self, session_id: str, item: str, **kwargs):
        """Proxy vers store.put avec gestion d'erreurs."""
        try:
            return self.store.put(session_id, item, **kwargs)
        except Exception as e:
            logger.error(f"Erreur put memory: {e}")
            # Fallback silencieux pour éviter crash du graph
            return None
    
    def query(self, session_id: str, query: str = "", k: int = 5, **kwargs):
        """Proxy vers store.query avec gestion d'erreurs."""
        try:
            return self.store.query(session_id, query, k, **kwargs)
        except Exception as e:
            logger.error(f"Erreur query memory: {e}")
            return []  # Retourne liste vide en cas d'erreur
    
    def summarize(self, session_id: str, **kwargs):
        """Proxy vers store.summarize avec gestion d'erreurs."""
        try:
            return self.store.summarize(session_id, **kwargs)
        except Exception as e:
            logger.error(f"Erreur summarize memory: {e}")
            return f"Summary unavailable (error: {str(e)})"
    
    def get_store_type(self):
        """Retourne le type de store utilisé."""
        return self.store.__class__.__name__
    
    def health_check(self):
        """Vérifie la santé du store."""
        try:
            # Test simple d'écriture/lecture
            test_session = "health_check_test"
            self.store.put(test_session, "test_item")
            result = self.store.query(test_session, k=1)
            return len(result) > 0
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
