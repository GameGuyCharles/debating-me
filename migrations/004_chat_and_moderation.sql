-- Migration 004: Spectator chat and moderation

CREATE TABLE spectator_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id       UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,

    -- Shadow-banned messages are stored but not broadcast
    is_shadow_hidden BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spec_msgs_debate ON spectator_messages(debate_id, created_at);

CREATE TABLE chat_reports (
    id              SERIAL PRIMARY KEY,
    message_id      UUID NOT NULL REFERENCES spectator_messages(id),
    reported_by     INTEGER NOT NULL REFERENCES users(id),
    reason          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    reviewed_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ
);

CREATE TABLE shadow_bans (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    banned_by       INTEGER NOT NULL REFERENCES users(id),
    reason          TEXT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shadow_bans_user ON shadow_bans(user_id);
