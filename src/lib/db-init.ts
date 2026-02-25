import sql from './db';

declare global {
  // eslint-disable-next-line no-var
  var __vocabDbInitialized: boolean | undefined;
}

export async function initDb() {
  if (global.__vocabDbInitialized) return;

  // Round 1: independent tables — run in parallel
  await Promise.all([
    sql`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id  TEXT PRIMARY KEY,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS words (
        id             SERIAL PRIMARY KEY,
        word           TEXT NOT NULL UNIQUE,
        zipf_score     REAL,
        difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
        lesson_number  INTEGER,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name  TEXT,
        role          TEXT NOT NULL DEFAULT 'student',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  ]);

  // Round 2: word_sets — stores 5-word practice sessions with all generated questions
  await sql`
    CREATE TABLE IF NOT EXISTS word_sets (
      id             SERIAL PRIMARY KEY,
      word_ids_key   TEXT UNIQUE NOT NULL,
      words_json     TEXT NOT NULL,
      questions_json TEXT NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Round 3: wrong_bank — depends on sessions, word_sets, users
  await sql`
    CREATE TABLE IF NOT EXISTS wrong_bank (
      id            SERIAL PRIMARY KEY,
      session_id    TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
      user_id       INTEGER,
      word_set_id   INTEGER REFERENCES word_sets(id) ON DELETE CASCADE,
      question_key  TEXT NOT NULL,
      wrong_count   INTEGER NOT NULL DEFAULT 1,
      last_wrong_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Migrations: add new columns to existing tables
  await Promise.all([
    sql`ALTER TABLE wrong_bank ADD COLUMN IF NOT EXISTS word_set_id INTEGER`,
    sql`ALTER TABLE wrong_bank ADD COLUMN IF NOT EXISTS question_key TEXT`,
    sql`ALTER TABLE words ADD COLUMN IF NOT EXISTS lesson_number INTEGER`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'`,
  ]);

  // Make question_key non-null only for new rows (existing rows may have null)
  // Add unique indexes for the new word_set-based wrong bank entries
  await Promise.all([
    sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wb_session_wordset
      ON wrong_bank(session_id, word_set_id, question_key)
      WHERE word_set_id IS NOT NULL AND session_id IS NOT NULL
    `,
    sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wb_user_wordset
      ON wrong_bank(user_id, word_set_id, question_key)
      WHERE word_set_id IS NOT NULL AND user_id IS NOT NULL
    `,
    // Keep old index for backward compat
    sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wrong_bank_user
      ON wrong_bank(user_id, question_id, question_type)
      WHERE user_id IS NOT NULL AND question_id IS NOT NULL
    `.catch(() => { /* ignore if question_id column doesn't exist */ }),
  ]);

  global.__vocabDbInitialized = true;
}
