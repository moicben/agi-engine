# core/memory/supabase_store.py
from supabase import create_client, Client
from langchain_openai import OpenAIEmbeddings
from .base import MemoryStore
from ..config import settings
import logging
import json

logger = logging.getLogger(__name__)

class SupabaseMemoryStore(MemoryStore):
    """Store mémoire utilisant Supabase (PostgreSQL + pgvector) pour vectoriel natif."""
    
    def __init__(self):
        if not settings.supabase_url or not settings.supabase_key:
            raise ValueError("SUPABASE_URL et SUPABASE_KEY requis pour SupabaseMemoryStore")
        
        self.supabase: Client = create_client(
            settings.supabase_url, 
            settings.supabase_key
        )
        self.embeddings = OpenAIEmbeddings(api_key=settings.openai_api_key)
        self._ensure_schema()
        
    def _ensure_schema(self):
        """Vérifie que la table agent_memory existe."""
        # Note: En production, le schema devrait être créé via migrations Supabase
        try:
            # Test simple pour vérifier l'existence de la table
            self.supabase.table('agent_memory').select('id').limit(1).execute()
            logger.info("Table agent_memory trouvée")
        except Exception as e:
            logger.warning(f"Table agent_memory non trouvée: {e}")
            # En mode dev, on pourrait créer la table ici
            # En production, utiliser les migrations Supabase SQL
        
    def put(self, session_id: str, item: str, domain: str = None, metadata: dict = None):
        """Stocke un item en mémoire avec embedding vectoriel."""
        try:
            # Générer embedding OpenAI
            embedding = self.embeddings.embed_query(item)
            
            # Préparer les données
            data = {
                'session_id': session_id,
                'content': item,
                'embedding': embedding,
                'domain': domain or 'general',
                'metadata': metadata or {},
                'importance_score': 0.5  # Score par défaut, peut être calculé
            }
            
            # Insert dans Supabase
            result = self.supabase.table('agent_memory').insert(data).execute()
            
            if result.data:
                logger.debug(f"Item stocké avec ID: {result.data[0]['id']}")
                return result.data[0]['id']
            else:
                logger.error("Échec stockage Supabase")
                return None
                
        except Exception as e:
            logger.error(f"Erreur put Supabase: {e}")
            return None
    
    def query(self, session_id: str, query: str = "", k: int = 5, domain: str = None, similarity_threshold: float = 0.7):
        """Recherche hybride : vectorielle + filtre session/domain."""
        try:
            if query:
                # Recherche vectorielle sémantique
                query_embedding = self.embeddings.embed_query(query)
                
                # Construire la requête RPC pour recherche vectorielle
                rpc_params = {
                    'session_id': session_id,
                    'query_embedding': query_embedding,
                    'similarity_threshold': similarity_threshold,
                    'max_results': k
                }
                
                if domain:
                    rpc_params['domain_filter'] = domain
                
                # Appel fonction Supabase pour recherche vectorielle optimisée
                result = self.supabase.rpc('hybrid_memory_search', rpc_params).execute()
                
                if result.data:
                    return [row['content'] for row in result.data]
                else:
                    # Fallback sur recherche simple par session
                    return self._simple_query(session_id, k, domain)
            else:
                # Recherche simple par session (plus récents)
                return self._simple_query(session_id, k, domain)
                
        except Exception as e:
            logger.error(f"Erreur query Supabase: {e}")
            return []
    
    def _simple_query(self, session_id: str, k: int, domain: str = None):
        """Recherche simple par session sans vectoriel."""
        try:
            query_builder = self.supabase.table('agent_memory').select('content').eq('session_id', session_id)
            
            if domain:
                query_builder = query_builder.eq('domain', domain)
            
            result = query_builder.order('created_at', desc=True).limit(k).execute()
            
            return [row['content'] for row in result.data] if result.data else []
            
        except Exception as e:
            logger.error(f"Erreur simple query: {e}")
            return []
    
    def summarize(self, session_id: str, strategy: str = 'simple') -> str:
        """Génère un résumé de session via fonction Supabase."""
        try:
            # Utiliser fonction Supabase pour summarization intelligente
            result = self.supabase.rpc('generate_session_summary', {
                'session_id': session_id,
                'strategy': strategy  # simple, hierarchical, clustering
            }).execute()
            
            if result.data and 'summary' in result.data:
                return result.data['summary']
            else:
                # Fallback : summarization basique côté client
                items = self.query(session_id, "", k=10)
                return f"Supabase Summary: {' | '.join(items[:3])}"
                
        except Exception as e:
            logger.error(f"Erreur summarize Supabase: {e}")
            return f"Summary unavailable: {str(e)}"
    
    def get_session_stats(self, session_id: str):
        """Statistiques de session pour monitoring."""
        try:
            result = self.supabase.rpc('get_session_stats', {
                'session_id': session_id
            }).execute()
            
            return result.data if result.data else {}
            
        except Exception as e:
            logger.error(f"Erreur stats session: {e}")
            return {}
    
    def cleanup_old_sessions(self, days_old: int = 30):
        """Nettoie les sessions anciennes pour optimiser la DB."""
        try:
            result = self.supabase.rpc('cleanup_old_sessions', {
                'days_threshold': days_old
            }).execute()
            
            logger.info(f"Nettoyage sessions > {days_old} jours: {result.data}")
            return result.data
            
        except Exception as e:
            logger.error(f"Erreur cleanup: {e}")
            return None
