import sql from './db';

declare global {
  // eslint-disable-next-line no-var
  var __vocabDbInitialized: boolean | undefined;
}

export async function initDb() {
  if (global.__vocabDbInitialized) return;

  // Round 1: independent tables
  await Promise.all([
    sql`
      CREATE TABLE IF NOT EXISTS words (
        id             SERIAL PRIMARY KEY,
        word           TEXT NOT NULL UNIQUE,
        zipf_score     REAL,
        difficulty     TEXT NOT NULL DEFAULT 'unknown',
        lesson_number  TEXT,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `,
    sql`
      CREATE TABLE IF NOT EXISTS users (
        id              SERIAL PRIMARY KEY,
        email           TEXT NOT NULL UNIQUE,
        password_hash   TEXT NOT NULL,
        display_name    TEXT,
        role            TEXT NOT NULL DEFAULT 'student',
        age             INTEGER,
        passage_source  TEXT NOT NULL DEFAULT 'TextBook_Harry_Portter',
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  ]);

  // Round 1b: question_config singleton — teacher-configurable question settings
  await sql`
    CREATE TABLE IF NOT EXISTS question_config (
      id                INTEGER PRIMARY KEY DEFAULT 1,
      num_comprehension INTEGER NOT NULL DEFAULT 2,
      num_blanks        INTEGER NOT NULL DEFAULT 5,
      blank_zipf_max    REAL    NOT NULL DEFAULT 4.2,
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO question_config (id, num_comprehension, num_blanks, blank_zipf_max)
    VALUES (1, 2, 5, 4.2)
    ON CONFLICT (id) DO NOTHING
  `.catch(() => {});

  // Round 2: word_sets — one row per word (cached by word_id)
  await sql`
    CREATE TABLE IF NOT EXISTS word_sets (
      id              SERIAL PRIMARY KEY,
      word_id         INTEGER,
      paragraph_text  TEXT,
      questions_json  TEXT,
      fill_blank_json TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Round 3: wrong_bank (user_id required)
  await sql`
    CREATE TABLE IF NOT EXISTS wrong_bank (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER,
      word_set_id   INTEGER,
      question_key  TEXT NOT NULL DEFAULT '',
      wrong_count   INTEGER NOT NULL DEFAULT 1,
      last_wrong_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // === Migrations for existing installations ===

  // Add missing columns to existing tables
  await Promise.all([
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS passage_source TEXT NOT NULL DEFAULT 'TextBook_Harry_Portter'`.catch(() => {}),
    sql`ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS word_id INTEGER`.catch(() => {}),
    sql`ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS paragraph_text TEXT`.catch(() => {}),
    sql`ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS fill_blank_json TEXT`.catch(() => {}),
    sql`ALTER TABLE wrong_bank ADD COLUMN IF NOT EXISTS user_id INTEGER`.catch(() => {}),
    sql`ALTER TABLE wrong_bank ADD COLUMN IF NOT EXISTS word_set_id INTEGER`.catch(() => {}),
    sql`ALTER TABLE words DROP CONSTRAINT IF EXISTS words_difficulty_check`.catch(() => {}),
    // Expand question_config table with new columns
    sql`ALTER TABLE question_config ADD COLUMN IF NOT EXISTS num_blanks INTEGER NOT NULL DEFAULT 5`.catch(() => {}),
    sql`ALTER TABLE question_config ADD COLUMN IF NOT EXISTS blank_zipf_max REAL NOT NULL DEFAULT 4.2`.catch(() => {}),
  ]);

  // Migrate lesson_number INTEGER → TEXT (only if still integer type)
  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'words' AND column_name = 'lesson_number'
          AND data_type IN ('integer', 'bigint', 'smallint')
      ) THEN
        ALTER TABLE words ALTER COLUMN lesson_number TYPE TEXT USING lesson_number::TEXT;
      END IF;
    END $$;
  `.catch(() => {});

  // Update difficulty labels: easy→high, hard→low
  await Promise.all([
    sql`UPDATE words SET difficulty = 'high' WHERE difficulty = 'easy'`.catch(() => {}),
    sql`UPDATE words SET difficulty = 'low'  WHERE difficulty = 'hard'`.catch(() => {}),
  ]);

  // Clear incompatible cached data
  await Promise.all([
    sql`DELETE FROM word_sets WHERE word_id IS NULL`.catch(() => {}),
    sql`DELETE FROM wrong_bank`.catch(() => {}),
  ]);

  // Drop obsolete columns
  await sql`ALTER TABLE wrong_bank DROP COLUMN IF EXISTS session_id`.catch(() => {});
  await Promise.all([
    sql`ALTER TABLE word_sets DROP COLUMN IF EXISTS word_ids_key`.catch(() => {}),
    sql`ALTER TABLE word_sets DROP COLUMN IF EXISTS words_json`.catch(() => {}),
  ]);

  // Drop obsolete tables
  await sql`DROP TABLE IF EXISTS sessions`.catch(() => {});

  // Drop old indexes before creating new ones
  await Promise.all([
    sql`DROP INDEX IF EXISTS idx_wb_session_wordset`.catch(() => {}),
    sql`DROP INDEX IF EXISTS idx_wb_user_wordset`.catch(() => {}),
    sql`DROP INDEX IF EXISTS idx_wrong_bank_user`.catch(() => {}),
  ]);

  // Create indexes
  await Promise.all([
    sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_word_sets_word_id
      ON word_sets(word_id)
    `.catch(() => {}),
    sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wb_user_wordset_key
      ON wrong_bank(user_id, word_set_id, question_key)
      WHERE user_id IS NOT NULL AND word_set_id IS NOT NULL
    `.catch(() => {}),
  ]);

  // One-time migrations table
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `.catch(() => {});

  // v3.1–v3.4: previous migrations (already applied on live DB — no-ops if version exists)
  for (const v of [
    'v3.1-comp-mcq-only',
    'v3.2-fillblank-5-zipf',
    'v3.3-fillblank-zipf-3.70',
    'v3.4-fillblank-zipf-lt-4.2',
  ]) {
    const r = await sql`
      INSERT INTO schema_migrations (version) VALUES (${v})
      ON CONFLICT (version) DO NOTHING RETURNING version
    `.catch(() => []);
    if (r.length > 0) {
      await sql`DELETE FROM word_sets`.catch(() => {});
      await sql`DELETE FROM wrong_bank`.catch(() => {});
    }
  }

  // v3.5: Claude prompt now uses user age + configurable question count + fill-blank params
  const m5 = await sql`
    INSERT INTO schema_migrations (version) VALUES ('v3.5-age-config-questions')
    ON CONFLICT (version) DO NOTHING
    RETURNING version
  `.catch(() => []);
  if (m5.length > 0) {
    await sql`DELETE FROM word_sets`.catch(() => {});
    await sql`DELETE FROM wrong_bank`.catch(() => {});
  }

  global.__vocabDbInitialized = true;
}
