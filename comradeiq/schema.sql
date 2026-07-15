-- ComradeIQ D1 schema
-- Conventions follow the NativeOffice website backend (D:\NativeOffice-Website\schema.sql):
--   * TEXT primary keys with a type prefix + random hex ("u_", "m_", "c_")
--   * unix SECONDS stored as INTEGER for wall-clock columns
--   * secrets are never stored in plaintext (session tokens as SHA-256, OAuth
--     tokens encrypted at rest with a Workers secret)
--
-- Apply locally:  npx wrangler d1 execute comradeiq-db --local --file=schema.sql
-- Apply remote:   npx wrangler d1 execute comradeiq-db --remote --file=schema.sql

-- Users, keyed by Google identity (same shape as NativeOffice users).
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,        -- "u_" + random hex
  google_sub TEXT UNIQUE NOT NULL,    -- Google account id ("sub" claim)
  email      TEXT NOT NULL,
  name       TEXT,
  picture    TEXT,                    -- avatar URL; named `picture` to match NativeOffice
  created_at INTEGER NOT NULL         -- unix seconds
);

-- Website sessions. The httpOnly cookie holds the raw token; only its SHA-256
-- is stored here, mirroring NativeOffice's sessions table.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  csrf       TEXT NOT NULL,           -- per-session CSRF token
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- One row per mission issued from the command bar.
CREATE TABLE IF NOT EXISTS missions (
  id             TEXT PRIMARY KEY,    -- "m_" + random hex (mirrors the client missionId)
  user_id        TEXT NOT NULL REFERENCES users(id),
  commander_name TEXT NOT NULL,
  mission_text   TEXT NOT NULL,
  -- Mirrors CommanderStatus in lib/store.ts, minus the client-only 'idle'/'monitoring':
  status         TEXT NOT NULL DEFAULT 'thinking',
                 -- 'thinking' | 'dispatching' | 'delegating' | 'synthesizing' | 'complete' | 'error'
  created_at     INTEGER NOT NULL,    -- unix seconds
  completed_at   INTEGER,             -- NULL until terminal ('complete' or 'error')
  result_url     TEXT                 -- presentation download URL, NULL until synthesized
);
-- Drives the history strip: most-recent-first per user.
CREATE INDEX IF NOT EXISTS idx_missions_user_created ON missions(user_id, created_at DESC);

-- Append-only event log. This table alone must be sufficient to reconstruct a
-- mission's entire topology playback, so it is written as events stream, not at
-- completion.
--
-- Ordering note: `seq` (not `timestamp`) is the replay sort key. Thinking
-- deltas arrive many-per-millisecond, so neither NativeOffice's unix-seconds
-- granularity nor a millisecond clock can order them; AUTOINCREMENT gives a
-- total order that survives identical timestamps.
CREATE TABLE IF NOT EXISTS mission_events (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,  -- monotonic; replay orders by this
  id         TEXT UNIQUE NOT NULL,               -- "e_" + random hex; stable id for dedupe
  mission_id TEXT NOT NULL REFERENCES missions(id),
  from_actor TEXT NOT NULL,                      -- 'commander' | comrade id | 'user'
  to_actor   TEXT NOT NULL,                      -- 'commander' | comrade id | 'user'
  content    TEXT NOT NULL,                      -- token chunk, order text, or bus content
  event_type TEXT NOT NULL,                      -- 'thinking' | 'dispatch' | 'report' | 'bus'
  timestamp  INTEGER NOT NULL                    -- unix MILLIseconds; for pacing the replay
);
-- Replay reads one mission's events in order.
CREATE INDEX IF NOT EXISTS idx_mission_events_mission_seq ON mission_events(mission_id, seq);

-- External data-source connectors (Notion live; Slack/Gmail are UI-only for now).
-- Tokens are encrypted at rest with a Cloudflare Workers secret (CONNECTOR_ENC_KEY);
-- plaintext tokens must never reach this table.
CREATE TABLE IF NOT EXISTS connectors (
  id                     TEXT PRIMARY KEY,   -- "c_" + random hex
  user_id                TEXT NOT NULL REFERENCES users(id),
  provider               TEXT NOT NULL,      -- 'notion' | 'slack' | 'gmail'
  access_token_encrypted TEXT NOT NULL,      -- AES-GCM ciphertext, base64
  refresh_token_encrypted TEXT,              -- NULL when the provider issues no refresh token
  connected_at           INTEGER NOT NULL,   -- unix seconds
  status                 TEXT NOT NULL DEFAULT 'connected',  -- 'connected' | 'revoked' | 'error'
  UNIQUE (user_id, provider)                 -- one live connection per provider per user
);
CREATE INDEX IF NOT EXISTS idx_connectors_user ON connectors(user_id);

-- Fixed-window rate limiting (per route + client key), same helper contract as
-- NativeOffice's functions/_lib/util.js rateLimit().
CREATE TABLE IF NOT EXISTS rate_limits (
  k            TEXT PRIMARY KEY,   -- "<route>:<ip-or-key>"
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL
);
