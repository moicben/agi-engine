# core/memory/hybrid_store.py
from .sqlite_store import SQLiteMemoryStore
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from .base import MemoryStore
import logging

logger = logging.getLogger(__name__)

class HybridMemoryStore(MemoryStore):
    def __init__(self):
        self.sqlite = SQLiteMemoryStore()  # Fix: utiliser SQLiteMemoryStore
        # Initialiser embeddings seulement si clé API disponible
        try:
            from ..config import settings
            if settings.openai_api_key:
                self.embeddings = OpenAIEmbeddings(api_key=settings.openai_api_key)
                # Fix: initialisation FAISS correcte avec dummy text
                # Ajouter try/except pour ignorer erreurs GPU
                try:
                    self.vector = FAISS.from_texts(["dummy"], self.embeddings)
                    self.vector_available = True
                except Exception as e:
                    logger.warning(f"Échec init FAISS (probablement GPU non supporté): {e}. Bypass vectoriel.")
                    self.vector = None
                    self.vector_available = False
            else:
                self.embeddings = None
                self.vector = None
                self.vector_available = False
        except Exception:
            self.embeddings = None
            self.vector = None
            self.vector_available = False
        self.vector_initialized = False
        
    def put(self, session_id: str, item: str):
        self.sqlite.put(session_id, item)
        # Initialiser ou ajouter au vector store seulement si disponible
        if self.vector_available and self.embeddings:
            if not self.vector_initialized:
                self.vector = FAISS.from_texts([item], self.embeddings)
                self.vector_initialized = True
            else:
                self.vector.add_texts([item])
        
    def query(self, session_id: str, query: str = "", k: int = 5):
        # Recherche hybride : vectorielle + SQLite temporelle
        sqlite_results = self.sqlite.query(session_id, k)
        
        if query and self.vector_available and self.vector_initialized:
            # Recherche vectorielle seulement si query fournie et vector initialisé
            try:
                vector_docs = self.vector.similarity_search(query, k=k)
                vector_results = [doc.page_content for doc in vector_docs]
                return self._rank_fusion(vector_results, sqlite_results)
            except Exception:
                # Fallback sur SQLite si erreur vectorielle
                return sqlite_results
        else:
            return sqlite_results
        
    def summarize(self, session_id: str) -> str:
        items = self.query(session_id, "", k=100)
        return "Hybrid Summary: " + " | ".join(items[:5])  # Amélioration basique
    
    def _rank_fusion(self, vec_results, sql_results):
        # Implémentation simple de fusion (à améliorer)
        combined = list(set(vec_results + sql_results))
        return combined[:5]  # Retourne top 5 uniques
