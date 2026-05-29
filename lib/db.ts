import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const PHOTO_DIR = path.join(DATA_DIR, 'photos');

function ensureDirs() {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  fs.mkdirSync(path.join(PHOTO_DIR, 'selfies'), { recursive: true });
}

function init(): Database.Database {
  ensureDirs();
  const db = new Database(path.join(DATA_DIR, 'facehunt.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT,
      name        TEXT NOT NULL,
      nickname    TEXT NOT NULL,
      selfie_path TEXT,
      photo_url   TEXT,
      hue         INTEGER NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      status           TEXT NOT NULL,            -- lobby | running | finished
      current_round_id TEXT,
      rounds_planned   INTEGER NOT NULL,
      round_seconds    INTEGER NOT NULL,
      reveal_seconds   INTEGER NOT NULL,
      created_at       INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rounds (
      id                TEXT PRIMARY KEY,
      event_id          TEXT NOT NULL,
      idx               INTEGER NOT NULL,
      target_user_id    TEXT NOT NULL,
      started_at        INTEGER NOT NULL,
      reveal_until      INTEGER NOT NULL,
      hunt_ends_at      INTEGER NOT NULL,
      result_revealed_at INTEGER,
      closed_at         INTEGER
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id                 TEXT PRIMARY KEY,
      round_id           TEXT NOT NULL,
      hunter_id          TEXT NOT NULL,
      photo_path         TEXT NOT NULL,
      status             TEXT NOT NULL,          -- pending | approved | rejected | skipped
      rank               INTEGER,
      points             INTEGER,
      server_received_at INTEGER NOT NULL,
      verified_at        INTEGER
    );

    CREATE TABLE IF NOT EXISTS scores (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id  TEXT NOT NULL,
      user_id   TEXT NOT NULL,
      round_id  TEXT NOT NULL,
      points    INTEGER NOT NULL,
      reason    TEXT NOT NULL                    -- hunt_rank | target_survive
    );

    CREATE INDEX IF NOT EXISTS idx_sub_round ON submissions(round_id, server_received_at);
    CREATE INDEX IF NOT EXISTS idx_scores_event ON scores(event_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_rounds_event ON rounds(event_id, idx);
  `);
  // Migration for DBs created before photo_url existed (Google profile photo fallback).
  try { db.exec('ALTER TABLE users ADD COLUMN photo_url TEXT'); } catch { /* column already exists */ }
  return db;
}

// Cache across HMR reloads in dev so we don't reopen the file each time.
const g = globalThis as unknown as { __fhDb?: Database.Database };
export const db: Database.Database = g.__fhDb ?? (g.__fhDb = init());
