-- Persist the authoritative Academy zone together with a player's checkpoint.
-- The default preserves all pre-existing checkpoints during upgrade.
ALTER TABLE player_checkpoints
    ADD COLUMN IF NOT EXISTS location_id VARCHAR(64) NOT NULL DEFAULT 'reading-room-main';
