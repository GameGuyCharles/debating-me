-- Migration 003: Debate turns, AI scoring, and flags

CREATE TABLE debate_turns (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id         UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
    user_id           INTEGER NOT NULL REFERENCES users(id),

    turn_number       INTEGER NOT NULL,
    turn_type         VARCHAR(20) NOT NULL
        CHECK (turn_type IN ('opening', 'rebuttal', 'closing')),

    -- Content
    raw_content       TEXT NOT NULL,
    was_auto_submitted BOOLEAN NOT NULL DEFAULT FALSE,

    -- AI Scoring Summary
    total_score       DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    rule_violation    BOOLEAN NOT NULL DEFAULT FALSE,
    violation_detail  TEXT,

    -- Full AI analysis (structured JSON)
    ai_analysis_json  JSONB,

    -- Timing
    started_at        TIMESTAMPTZ NOT NULL,
    submitted_at      TIMESTAMPTZ NOT NULL,
    scored_at         TIMESTAMPTZ,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_turns_debate ON debate_turns(debate_id, turn_number);

-- Score flags / appeals
CREATE TABLE score_flags (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id         UUID NOT NULL REFERENCES debates(id),
    turn_id           UUID NOT NULL REFERENCES debate_turns(id),
    flagged_by        INTEGER NOT NULL REFERENCES users(id),

    claim_index       INTEGER NOT NULL,
    reason            TEXT,

    -- Re-evaluation result
    status            VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'upheld', 'overturned')),
    revised_score_json JSONB,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at       TIMESTAMPTZ
);

CREATE INDEX idx_flags_debate_user ON score_flags(debate_id, flagged_by);
