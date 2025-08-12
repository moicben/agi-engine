-- scripts/supabase_schema.sql
-- Schema pour mémoire vectorielle AGI sur Supabase

-- Activer l'extension pgvector pour les embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Table principale pour la mémoire d'agent
CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Dimension OpenAI embeddings
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    domain TEXT DEFAULT 'general',
    importance_score FLOAT DEFAULT 0.5,
    
    -- Contraintes
    CONSTRAINT valid_importance CHECK (importance_score >= 0 AND importance_score <= 1)
);

-- Index pour performance vectorielle (IVFFlat)
CREATE INDEX IF NOT EXISTS memory_embedding_idx ON agent_memory 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Index composite pour sessions
CREATE INDEX IF NOT EXISTS memory_session_time_idx ON agent_memory (session_id, created_at DESC);

-- Index pour domaines
CREATE INDEX IF NOT EXISTS memory_domain_idx ON agent_memory (domain);

-- Index pour importance
CREATE INDEX IF NOT EXISTS memory_importance_idx ON agent_memory (importance_score DESC);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_memory_updated_at BEFORE UPDATE
    ON agent_memory FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Fonction pour recherche hybride optimisée
CREATE OR REPLACE FUNCTION hybrid_memory_search(
    session_id TEXT,
    query_embedding VECTOR(1536),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INT DEFAULT 5,
    domain_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    content TEXT,
    similarity FLOAT,
    domain TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        1 - (m.embedding <=> query_embedding) as similarity,
        m.domain,
        m.created_at
    FROM agent_memory m
    WHERE m.session_id = hybrid_memory_search.session_id
        AND (domain_filter IS NULL OR m.domain = domain_filter)
        AND (1 - (m.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour génération de résumé de session
CREATE OR REPLACE FUNCTION generate_session_summary(
    session_id TEXT,
    strategy TEXT DEFAULT 'simple'
)
RETURNS JSON AS $$
DECLARE
    memory_items TEXT[];
    item_count INT;
    summary TEXT;
    recent_items TEXT[];
BEGIN
    -- Compter les items
    SELECT COUNT(*) INTO item_count
    FROM agent_memory 
    WHERE agent_memory.session_id = generate_session_summary.session_id;
    
    -- Récupérer items récents par importance et date
    SELECT array_agg(content ORDER BY importance_score DESC, created_at DESC)
    INTO recent_items
    FROM agent_memory 
    WHERE agent_memory.session_id = generate_session_summary.session_id
    LIMIT 10;
    
    -- Stratégie de summarization
    IF strategy = 'hierarchical' THEN
        -- Pour version avancée : appel API externe ou clustering
        summary := 'Hierarchical Summary: ' || array_to_string(recent_items[1:3], ' → ');
    ELSE
        -- Simple concatenation des plus importants
        summary := 'Session Summary: ' || array_to_string(recent_items[1:5], ' | ');
    END IF;
    
    RETURN json_build_object(
        'summary', summary,
        'item_count', item_count,
        'strategy_used', strategy,
        'top_domains', (
            SELECT json_agg(domain_stats)
            FROM (
                SELECT domain, COUNT(*) as count
                FROM agent_memory 
                WHERE agent_memory.session_id = generate_session_summary.session_id
                GROUP BY domain
                ORDER BY count DESC
                LIMIT 3
            ) domain_stats
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour statistiques de session
CREATE OR REPLACE FUNCTION get_session_stats(session_id TEXT)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'total_items', COUNT(*),
            'domains', json_agg(DISTINCT domain),
            'avg_importance', AVG(importance_score),
            'first_activity', MIN(created_at),
            'last_activity', MAX(created_at),
            'daily_activity', (
                SELECT json_object_agg(
                    date_trunc('day', created_at)::date,
                    COUNT(*)
                )
                FROM agent_memory m2
                WHERE m2.session_id = get_session_stats.session_id
                GROUP BY date_trunc('day', created_at)
            )
        )
        FROM agent_memory
        WHERE agent_memory.session_id = get_session_stats.session_id
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyage des sessions anciennes
CREATE OR REPLACE FUNCTION cleanup_old_sessions(days_threshold INT DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    deleted_count INT;
BEGIN
    -- Supprimer les sessions anciennes
    DELETE FROM agent_memory 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_threshold;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'deleted_items', deleted_count,
        'threshold_days', days_threshold,
        'cleanup_date', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) pour sécurité multi-tenant
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Politique par défaut : accès libre pour l'instant
-- En production, filtrer par user/organization
CREATE POLICY "Allow all for now" ON agent_memory
    FOR ALL USING (true);

-- Vue pour analytics (optionnel)
CREATE OR REPLACE VIEW memory_analytics AS
SELECT 
    session_id,
    domain,
    DATE(created_at) as date,
    COUNT(*) as items_count,
    AVG(importance_score) as avg_importance,
    MIN(created_at) as first_item,
    MAX(created_at) as last_item
FROM agent_memory
GROUP BY session_id, domain, DATE(created_at);

COMMENT ON TABLE agent_memory IS 'Mémoire vectorielle pour AGI Engine avec pgvector';
COMMENT ON COLUMN agent_memory.embedding IS 'Embedding OpenAI 1536 dimensions pour recherche sémantique';
COMMENT ON FUNCTION hybrid_memory_search IS 'Recherche hybride combinant similarité vectorielle et filtres métadata';
