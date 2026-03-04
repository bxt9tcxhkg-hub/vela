// SQLite Datenbank – Conversations, Audit Log, Settings
import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const DATA_DIR = process.env.VELA_DATA_DIR ?? join(process.cwd(), '.vela-data')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = join(DATA_DIR, 'vela.db')

import type { Database as BetterDatabase } from 'better-sqlite3'
export const db: BetterDatabase = new Database(DB_PATH) as unknown as BetterDatabase

// WAL-Modus für bessere Performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    title       TEXT,
    mode        TEXT DEFAULT 'local',
    trust_level TEXT DEFAULT 'balanced'
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content         TEXT NOT NULL,
    skill_used      TEXT,
    provider        TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

  CREATE TABLE IF NOT EXISTS audit_log (
    id           TEXT PRIMARY KEY,
    action_id    TEXT NOT NULL,
    skill_name   TEXT NOT NULL,
    params       TEXT NOT NULL,
    decision     TEXT NOT NULL,
    result       TEXT,
    execution_ms INTEGER,
    checksum     TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

console.log(`[DB] SQLite geöffnet: ${DB_PATH}`)

export default db

// Permissions-Tabelle nachrüsten (idempotent)
db.exec(`
  CREATE TABLE IF NOT EXISTS permissions (
    permission_type TEXT PRIMARY KEY,
    skill_id        TEXT NOT NULL,
    granted_at      TEXT NOT NULL,
    granted_by      TEXT NOT NULL DEFAULT 'user',
    risk_level      TEXT NOT NULL DEFAULT 'low',
    description     TEXT NOT NULL DEFAULT ''
  );
`)

// Token-Usage Tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS token_usage (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    provider     TEXT NOT NULL,
    model        TEXT NOT NULL,
    prompt_tokens   INTEGER NOT NULL DEFAULT 0,
    response_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens    INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// Long-Term Memory + Notification Queue
db.exec(`
  CREATE TABLE IF NOT EXISTS memory_entries (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    key        TEXT NOT NULL UNIQUE,
    value      TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)
