import sql from './db';

declare global {
  // eslint-disable-next-line no-var
  var __vocabDbInitialized: boolean | undefined;
}

export async function initDb() {
  if (global.__vocabDbInitialized) return;

  // Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id                   SERIAL PRIMARY KEY,
      email                TEXT NOT NULL UNIQUE,
      password_hash        TEXT NOT NULL,
      display_name         TEXT,
      role                 TEXT NOT NULL DEFAULT 'student',
      age                  INTEGER,
      passage_source       TEXT NOT NULL DEFAULT 'TextBook_Harry_Portter',
      passage_word_count   INTEGER NOT NULL DEFAULT 150,
      comp_question_type   TEXT NOT NULL DEFAULT 'mcq',
      num_comprehension    INTEGER NOT NULL DEFAULT 2,
      num_blanks           INTEGER NOT NULL DEFAULT 5,
      blank_zipf_max       REAL NOT NULL DEFAULT 4.2,
      enable_mcq_meaning   BOOLEAN NOT NULL DEFAULT true,
      enable_mcq_synonym   BOOLEAN NOT NULL DEFAULT false,
      enable_mcq_antonym   BOOLEAN NOT NULL DEFAULT false,
      enable_comprehension BOOLEAN NOT NULL DEFAULT true,
      enable_fill_blank    BOOLEAN NOT NULL DEFAULT true,
      last_lesson          TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS words (
      id            SERIAL PRIMARY KEY,
      word          TEXT NOT NULL,
      user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
      zipf_score    REAL,
      difficulty    TEXT,
      lesson_number TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS word_sets (
      id              SERIAL PRIMARY KEY,
      word_id         INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
      paragraph_text  TEXT,
      questions_json  TEXT,
      fill_blank_json TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS wrong_bank (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      word_set_id   INTEGER NOT NULL REFERENCES word_sets(id) ON DELETE CASCADE,
      question_key  TEXT NOT NULL,
      wrong_count   INTEGER NOT NULL DEFAULT 1,
      last_wrong_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Migrations - add columns to existing tables
  await Promise.all([
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_mcq_meaning   BOOLEAN NOT NULL DEFAULT true`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_mcq_synonym   BOOLEAN NOT NULL DEFAULT false`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_mcq_antonym   BOOLEAN NOT NULL DEFAULT false`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_comprehension BOOLEAN NOT NULL DEFAULT true`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_fill_blank    BOOLEAN NOT NULL DEFAULT true`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_sentence_writing BOOLEAN NOT NULL DEFAULT false`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_lesson TEXT`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_dictation_lesson TEXT`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_calls_today INTEGER NOT NULL DEFAULT 0`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_date TEXT`.catch(() => {}),
    sql`ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS config_hash TEXT`.catch(() => {}),
    sql`ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS sentence_writing_json TEXT`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS passage_source TEXT NOT NULL DEFAULT 'TextBook_Harry_Portter'`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS passage_word_count INTEGER NOT NULL DEFAULT 150`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS comp_question_type TEXT NOT NULL DEFAULT 'mcq'`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS num_comprehension INTEGER NOT NULL DEFAULT 2`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS num_blanks INTEGER NOT NULL DEFAULT 5`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS blank_zipf_max REAL NOT NULL DEFAULT 4.2`.catch(() => {}),
    // Teacher↔student ownership + approval + username login
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'`.catch(() => {}),
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`.catch(() => {}),
    sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`.catch(() => {}),
  ]);

  // Case-insensitive unique username (students may log in without an email),
  // and an index for scoping a teacher's students.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username)) WHERE username IS NOT NULL`.catch(() => {});
  await sql`CREATE INDEX IF NOT EXISTS idx_users_teacher_id ON users (teacher_id)`.catch(() => {});

  // v4.0: Add user_id to words
  await sql`ALTER TABLE words ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`.catch(() => {});
  // v4.0: Add user_id to word_sets
  await sql`ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`.catch(() => {});

  // Create indexes
  await Promise.all([
    sql`CREATE INDEX IF NOT EXISTS idx_words_user_id ON words(user_id)`.catch(() => {}),
    sql`CREATE INDEX IF NOT EXISTS idx_wrong_bank_user_id ON wrong_bank(user_id)`.catch(() => {}),
  ]);

  // UNIQUE(user_id, word) on words - drop old unique constraint first
  await sql`
    DO $
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_words_user_word'
      ) THEN
        BEGIN
          DROP INDEX IF EXISTS words_word_key;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        CREATE UNIQUE INDEX idx_words_user_word ON words(user_id, word) WHERE user_id IS NOT NULL;
      END IF;
    END $;
  `.catch((e) => { console.error('Failed to create idx_words_user_word:', e); });

  // UNIQUE(user_id, word_id) on word_sets
  await sql`
    DO $
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_word_sets_user_word'
      ) THEN
        BEGIN
          DROP INDEX IF EXISTS idx_word_sets_word_id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        CREATE UNIQUE INDEX idx_word_sets_user_word ON word_sets(user_id, word_id) WHERE user_id IS NOT NULL;
      END IF;
    END $;
  `.catch((e) => { console.error('Failed to create idx_word_sets_user_word:', e); });

  // UNIQUE(user_id, word_set_id, question_key) on wrong_bank
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_wb_user_wordset_key
    ON wrong_bank(user_id, word_set_id, question_key)
  `.catch(() => {});

  // Drop legacy wrong_bank columns that have NOT NULL constraints and are no longer used
  await Promise.all([
    sql`ALTER TABLE wrong_bank DROP COLUMN IF EXISTS question_type`.catch(() => {}),
    sql`ALTER TABLE wrong_bank DROP COLUMN IF EXISTS question_id`.catch(() => {}),
    sql`ALTER TABLE wrong_bank DROP COLUMN IF EXISTS correct_answer`.catch(() => {}),
    sql`ALTER TABLE wrong_bank ALTER COLUMN user_id DROP NOT NULL`.catch(() => {}),
    sql`ALTER TABLE wrong_bank ALTER COLUMN word_set_id DROP NOT NULL`.catch(() => {}),
  ]);

  // Auto-save practice sessions (resume after disconnect)
  await sql`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id                 SERIAL PRIMARY KEY,
      user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_type       TEXT NOT NULL,
      lesson_number      TEXT,
      phase              TEXT NOT NULL DEFAULT 'words',
      current_word_index INTEGER NOT NULL DEFAULT 0,
      repractice_index   INTEGER NOT NULL DEFAULT 0,
      submitted_json     TEXT,
      correct_json       TEXT,
      answers_json       TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, session_type, lesson_number)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ps_user ON practice_sessions(user_id)`.catch(() => {});

  // Lesson completion tracking
  await sql`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id                 SERIAL PRIMARY KEY,
      user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_number      TEXT NOT NULL,
      practice_done      BOOLEAN NOT NULL DEFAULT false,
      dictation_done     BOOLEAN NOT NULL DEFAULT false,
      tricky_clicked     BOOLEAN NOT NULL DEFAULT false,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, lesson_number)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_lp_user ON lesson_progress(user_id)`.catch(() => {});

  // config_json on word_sets — stores generation params for cache invalidation
  await sql`ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS config_json TEXT`.catch(() => {});

  // mistake_pick_done on lesson_progress
  await sql`ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS mistake_pick_done BOOLEAN NOT NULL DEFAULT false`.catch(() => {});

  // Mistake-pick question cache
  await sql`
    CREATE TABLE IF NOT EXISTS mistake_pick_sets (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_number   TEXT NOT NULL,
      questions_json  TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(user_id, lesson_number)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_mps_user_lesson ON mistake_pick_sets(user_id, lesson_number)`.catch(() => {});

  // One-time tokens for password reset (account recovery). Only a SHA-256 hash
  // of the token is stored, so a DB leak can't be used to reset a password.
  // Single-use (used_at) and time-limited (expires_at).
  await sql`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      purpose    TEXT NOT NULL,        -- 'reset'
      expires_at TIMESTAMPTZ NOT NULL,
      used_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS auth_tokens_user ON auth_tokens (user_id, purpose)`.catch(() => {});

  // Drop obsolete tables
  await sql`DROP TABLE IF EXISTS question_config`.catch(() => {});
  await sql`DROP TABLE IF EXISTS sessions`.catch(() => {});

  // v4.0 migration marker
  await sql`
    INSERT INTO schema_migrations (version) VALUES ('v4.0-per-user-words')
    ON CONFLICT (version) DO NOTHING
  `.catch(() => {});

  global.__vocabDbInitialized = true;
}
