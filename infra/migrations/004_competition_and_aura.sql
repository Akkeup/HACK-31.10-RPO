-- 004_competition_and_aura.sql: Wallets, Aura Ledger, and Competition Schema
-- Part 1: Wallets and Ledger

CREATE TABLE IF NOT EXISTS wallets (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    balance_aura BIGINT NOT NULL DEFAULT 100 CHECK (balance_aura >= 0),
    reserved_aura BIGINT NOT NULL DEFAULT 0 CHECK (reserved_aura >= 0 AND reserved_aura <= balance_aura),
    revision BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL,
    kind VARCHAR(32) NOT NULL,
    amount_aura BIGINT NOT NULL,
    reserved_delta_aura BIGINT NOT NULL,
    balance_after_aura BIGINT NOT NULL,
    reserved_after_aura BIGINT NOT NULL,
    match_id UUID,
    lobby_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    CONSTRAINT chk_kind CHECK (kind IN ('initial', 'reserve', 'release', 'stake', 'payout', 'refund')),
    CONSTRAINT uq_user_tx_kind UNIQUE (user_id, transaction_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_ledger_user ON wallet_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_match ON wallet_ledger(match_id);

-- Initialize wallets for existing users
INSERT INTO wallets (user_id, balance_aura, reserved_aura, revision)
SELECT user_id, 100, 0, 1 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Record initial 100 aura grant in ledger
INSERT INTO wallet_ledger (user_id, transaction_id, kind, amount_aura, reserved_delta_aura, balance_after_aura, reserved_after_aura, description)
SELECT user_id, gen_random_uuid(), 'initial', 100, 0, 100, 0, 'Initial Welcome Aura grant'
FROM users
ON CONFLICT DO NOTHING;

-- Part 2: Competition Matches, Participants, Answers, and Activities

CREATE TABLE IF NOT EXISTS competition_matches (
    match_id UUID PRIMARY KEY,
    table_id VARCHAR(64) NOT NULL,
    lobby_id UUID NOT NULL,
    subject VARCHAR(32) NOT NULL,
    module_id VARCHAR(64) NOT NULL,
    content_version VARCHAR(32) NOT NULL,
    stake_aura BIGINT NOT NULL,
    pot_aura BIGINT NOT NULL,
    question_count INT NOT NULL DEFAULT 5,
    round_seconds INT NOT NULL DEFAULT 20,
    status VARCHAR(32) NOT NULL DEFAULT 'running',
    settlement_id UUID,
    outcome VARCHAR(32),
    winner_player_id UUID,
    reason VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS competition_participants (
    match_id UUID NOT NULL REFERENCES competition_matches(match_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    seat_id VARCHAR(64) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    left_match BOOLEAN NOT NULL DEFAULT FALSE,
    payout_aura BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS competition_answers (
    match_id UUID NOT NULL REFERENCES competition_matches(match_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    ordinal INT NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    selected_option_id VARCHAR(64) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, user_id, ordinal)
);

CREATE TABLE IF NOT EXISTS player_activities (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    mode VARCHAR(32) NOT NULL DEFAULT 'exploring',
    target_id VARCHAR(64),
    seat_id VARCHAR(64),
    lesson_id UUID,
    attempt_id UUID,
    match_id UUID,
    lobby_id UUID,
    revision BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO player_activities (user_id, mode, revision)
SELECT user_id, 'exploring', 1 FROM users
ON CONFLICT (user_id) DO NOTHING;
