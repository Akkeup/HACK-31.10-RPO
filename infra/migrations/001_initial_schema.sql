-- 001_initial_schema.sql: Initial PostgreSQL 18 schema for Discovery Server

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(40) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('player', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_tokens (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_tokens_user_id ON access_tokens(user_id);

CREATE TABLE IF NOT EXISTS config_revisions (
    world_id VARCHAR(64) NOT NULL,
    revision BIGINT NOT NULL,
    public_values JSONB NOT NULL,
    admin_values JSONB NOT NULL,
    actor_user_id UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (world_id, revision)
);

CREATE TABLE IF NOT EXISTS player_progress (
    player_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    revision BIGINT NOT NULL DEFAULT 1,
    completed_knowledge_ids TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_checkpoints (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    world_id VARCHAR(64) NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    z DOUBLE PRECISION NOT NULL,
    yaw_rad DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, world_id)
);
CREATE TABLE IF NOT EXISTS interactions (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    request_id UUID NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    npc_id VARCHAR(64) NOT NULL,
    action VARCHAR(20) NOT NULL,
    input_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
    result_text TEXT,
    source VARCHAR(20) NOT NULL CHECK (source IN ('rules', 'ollama', 'fallback', 'none')),
    knowledge_ids TEXT[] NOT NULL DEFAULT '{}',
    progress_revision BIGINT NOT NULL DEFAULT 1,
    error_code VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, session_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_interactions_lookup ON interactions(session_id, request_id);

CREATE TABLE IF NOT EXISTS npc_memories (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    world_id VARCHAR(64) NOT NULL,
    npc_id VARCHAR(64) NOT NULL,
    turn_index INT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npc_memories_player ON npc_memories(user_id, world_id, npc_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID REFERENCES users(user_id),
    action VARCHAR(64) NOT NULL,
    world_id VARCHAR(64),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
