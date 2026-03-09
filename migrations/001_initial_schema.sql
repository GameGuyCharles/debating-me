-- Migration 001: Auth.js tables + Extended users table
-- Run this first to set up authentication and user profiles

-- Auth.js v5 required tables (per @auth/pg-adapter)
CREATE TABLE verification_token (
    identifier TEXT NOT NULL,
    expires    TIMESTAMPTZ NOT NULL,
    token      TEXT NOT NULL,
    PRIMARY KEY (identifier, token)
);

CREATE TABLE accounts (
    id                  SERIAL PRIMARY KEY,
    "userId"            INTEGER NOT NULL,
    type                VARCHAR(255) NOT NULL,
    provider            VARCHAR(255) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    refresh_token       TEXT,
    access_token        TEXT,
    expires_at          BIGINT,
    id_token            TEXT,
    scope               TEXT,
    session_state       TEXT,
    token_type          TEXT
);

CREATE TABLE sessions (
    id             SERIAL PRIMARY KEY,
    "userId"       INTEGER NOT NULL,
    expires        TIMESTAMPTZ NOT NULL,
    "sessionToken" VARCHAR(255) NOT NULL UNIQUE
);

-- Extended users table (extends Auth.js base)
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255),
    email           VARCHAR(255) UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image           TEXT,

    -- Extended profile fields
    username        VARCHAR(50) UNIQUE,
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    bio             TEXT,
    password_hash   TEXT,  -- for email/password auth (null for OAuth users)
    role            VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'moderator')),

    -- Aggregate stats (denormalized for fast reads)
    total_debates   INTEGER NOT NULL DEFAULT 0,
    wins            INTEGER NOT NULL DEFAULT 0,
    losses          INTEGER NOT NULL DEFAULT 0,
    draws           INTEGER NOT NULL DEFAULT 0,
    avg_score       DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    -- Shadow ban for chat
    is_shadow_banned BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Notifications table (for API route -> Socket.io bridge)
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    type        VARCHAR(50) NOT NULL,
    payload     JSONB NOT NULL,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- Add foreign keys to Auth.js tables
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_user
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
