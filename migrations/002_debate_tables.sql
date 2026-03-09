-- Migration 002: Topic boards, debate invites, debates

-- Topic categories (seeded)
CREATE TABLE topic_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    icon            VARCHAR(50),
    display_order   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Topic boards within categories
CREATE TABLE topic_boards (
    id              SERIAL PRIMARY KEY,
    category_id     INTEGER NOT NULL REFERENCES topic_categories(id),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL,
    description     TEXT,
    created_by      INTEGER NOT NULL REFERENCES users(id),
    post_count      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(category_id, slug)
);

CREATE INDEX idx_boards_category ON topic_boards(category_id);

-- Debate invitations with negotiation
CREATE TABLE debate_invites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Participants
    sender_id       INTEGER NOT NULL REFERENCES users(id),
    recipient_id    INTEGER REFERENCES users(id),

    -- Discovery type
    invite_type     VARCHAR(20) NOT NULL DEFAULT 'direct'
        CHECK (invite_type IN ('direct', 'public', 'link')),
    invite_code     VARCHAR(20) UNIQUE,

    -- Debate parameters (proposed)
    topic           TEXT NOT NULL,
    sender_side     VARCHAR(10) NOT NULL
        CHECK (sender_side IN ('for', 'against')),
    scheduled_time  TIMESTAMPTZ,
    turn_time_secs  INTEGER NOT NULL DEFAULT 300,
    review_time_secs INTEGER NOT NULL DEFAULT 60,
    total_turns     INTEGER NOT NULL DEFAULT 3,

    -- Negotiation state
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'counter_proposed',
            'accepted',
            'declined',
            'expired',
            'cancelled'
        )),
    last_modified_by INTEGER REFERENCES users(id),

    -- Topic board link (optional)
    topic_board_id  INTEGER REFERENCES topic_boards(id),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_invites_recipient ON debate_invites(recipient_id, status);
CREATE INDEX idx_invites_sender ON debate_invites(sender_id, status);
CREATE INDEX idx_invites_public ON debate_invites(invite_type, status)
    WHERE invite_type IN ('public', 'link');
CREATE INDEX idx_invites_code ON debate_invites(invite_code)
    WHERE invite_code IS NOT NULL;

-- Debates
CREATE TABLE debates (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_id         UUID REFERENCES debate_invites(id),

    -- Participants
    user_a_id         INTEGER NOT NULL REFERENCES users(id),
    user_b_id         INTEGER NOT NULL REFERENCES users(id),
    first_turn_user_id INTEGER REFERENCES users(id),

    -- Debate parameters (copied from accepted invite)
    topic             TEXT NOT NULL,
    user_a_side       VARCHAR(10) NOT NULL
        CHECK (user_a_side IN ('for', 'against')),
    user_b_side       VARCHAR(10) NOT NULL
        CHECK (user_b_side IN ('for', 'against')),
    turn_time_secs    INTEGER NOT NULL,
    review_time_secs  INTEGER NOT NULL,
    total_turns       INTEGER NOT NULL,

    -- State machine
    status            VARCHAR(20) NOT NULL DEFAULT 'coin_flip'
        CHECK (status IN (
            'coin_flip',
            'in_progress',
            'scoring',
            'completed',
            'abandoned'
        )),
    current_turn      INTEGER NOT NULL DEFAULT 0,
    current_phase     VARCHAR(20) NOT NULL DEFAULT 'waiting'
        CHECK (current_phase IN (
            'waiting',
            'writing',
            'ai_scoring',
            'reviewing',
            'closing_a',
            'closing_b',
            'finished'
        )),
    active_user_id    INTEGER REFERENCES users(id),

    -- Scores
    user_a_score      DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    user_b_score      DECIMAL(6,2) NOT NULL DEFAULT 0.00,

    -- Result
    winner_id         INTEGER REFERENCES users(id),

    -- Timing
    turn_started_at   TIMESTAMPTZ,

    -- Spectator
    spectator_count   INTEGER NOT NULL DEFAULT 0,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ,

    -- Shareable replay URL slug
    replay_slug       VARCHAR(50) UNIQUE
);

CREATE INDEX idx_debates_status ON debates(status);
CREATE INDEX idx_debates_user_a ON debates(user_a_id);
CREATE INDEX idx_debates_user_b ON debates(user_b_id);
CREATE INDEX idx_debates_replay ON debates(replay_slug);

-- Custom rules per debate/invite
CREATE TABLE debate_rules (
    id              SERIAL PRIMARY KEY,
    invite_id       UUID REFERENCES debate_invites(id) ON DELETE CASCADE,
    debate_id       UUID REFERENCES debates(id) ON DELETE CASCADE,
    rule_text       TEXT NOT NULL,
    added_by        INTEGER NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Negotiation audit trail
CREATE TABLE invite_negotiations (
    id              SERIAL PRIMARY KEY,
    invite_id       UUID NOT NULL REFERENCES debate_invites(id) ON DELETE CASCADE,
    modified_by     INTEGER NOT NULL REFERENCES users(id),
    changes_json    JSONB NOT NULL,
    message         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
