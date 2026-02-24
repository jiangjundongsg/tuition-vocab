import sql from './db';

// Use a global so the flag survives Next.js HMR module reloads in dev
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
        id          SERIAL PRIMARY KEY,
        word        TEXT NOT NULL UNIQUE,
        zipf_score  REAL,
        difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name  TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  ]);

  // Round 2: generated_questions depends on words
  await sql`
    CREATE TABLE IF NOT EXISTS generated_questions (
      id                  SERIAL PRIMARY KEY,
      word_id             INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      mcq_json            TEXT NOT NULL,
      fill_json           TEXT NOT NULL,
      comprehension_json  TEXT NOT NULL,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Round 3: wrong_bank + index — wrong_bank depends on sessions & generated_questions
  await Promise.all([
    sql`
      CREATE TABLE IF NOT EXISTS wrong_bank (
        id              SERIAL PRIMARY KEY,
        session_id      TEXT REFERENCES sessions(session_id) ON DELETE CASCADE,
        user_id         INTEGER,
        question_id     INTEGER NOT NULL REFERENCES generated_questions(id) ON DELETE CASCADE,
        question_type   TEXT NOT NULL CHECK (question_type IN ('mcq', 'fill', 'comprehension')),
        wrong_count     INTEGER NOT NULL DEFAULT 1,
        last_wrong_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(session_id, question_id, question_type)
      )
    `,
  ]);

  // Round 4: index requires wrong_bank to exist
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_wrong_bank_user
    ON wrong_bank(user_id, question_id, question_type)
    WHERE user_id IS NOT NULL
  `;

  global.__vocabDbInitialized = true;
}
