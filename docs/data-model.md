# Data Model

All tables live in a single Neon PostgreSQL database. Schema is initialised (and migrated) by `src/lib/db-init.ts` on first API request.

---

## Table: `users`

Stores both student and teacher accounts. All per-student question configuration lives here.

```sql
CREATE TABLE users (
  id                  SERIAL PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  display_name        TEXT,
  role                TEXT NOT NULL DEFAULT 'student',  -- 'student' | 'teacher' | 'admin'

  -- Student profile / difficulty tuning
  age                 INTEGER,
  passage_source      TEXT,            -- textbook filename, e.g. 'TextBook_Harry_Portter'
  passage_word_count  INTEGER NOT NULL DEFAULT 150,
  comp_question_type  TEXT    NOT NULL DEFAULT 'mcq',   -- 'mcq' | 'true_false' | 'mixed'
  num_comprehension   INTEGER NOT NULL DEFAULT 2,
  num_blanks          INTEGER NOT NULL DEFAULT 5,
  blank_zipf_max      REAL    NOT NULL DEFAULT 4.2,

  -- Per-student question-type toggles (teacher configures)
  enable_mcq_meaning   BOOLEAN NOT NULL DEFAULT true,
  enable_mcq_synonym   BOOLEAN NOT NULL DEFAULT false,
  enable_mcq_antonym   BOOLEAN NOT NULL DEFAULT false,
  enable_comprehension BOOLEAN NOT NULL DEFAULT true,
  enable_fill_blank    BOOLEAN NOT NULL DEFAULT true,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Notes**
- `role` is set to `'teacher'` when a user supplies the correct `TEACHER_CODE` at registration.
- All `enable_*` booleans default to the recommended starting configuration; teacher overrides per student.

---

## Table: `words`

Vocabulary words, each belonging to exactly one student.

```sql
CREATE TABLE words (
  id            SERIAL PRIMARY KEY,
  word          TEXT    NOT NULL,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  zipf_score    REAL,
  difficulty    TEXT,              -- 'easy' | 'medium' | 'hard'
  lesson_number TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, word)           -- same word can exist for different students
);

CREATE INDEX idx_words_user_id ON words(user_id);
```

**Notes**
- `user_id = NULL` means the word is unassigned (legacy data from before per-student scoping).
- `lesson_number` is stored as `TEXT` to support both numeric (`"3"`) and date-label (`"20240101"`) formats.
- `zipf_score` is computed by `src/lib/wordfreq.ts` at upload time and used for difficulty classification and fill-blank gap selection.

---

## Table: `word_sets`

Cache of AI-generated passages and questions, scoped per `(user_id, word_id)`.

```sql
CREATE TABLE word_sets (
  id              SERIAL PRIMARY KEY,
  word_id         INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  paragraph_text  TEXT,
  questions_json  TEXT,       -- JSON: MCQ meaning, synonym, antonym, comprehension
  fill_blank_json TEXT,       -- JSON: fill-blank exercise data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, word_id)
);
```

**Notes**
- Different students practising the same word each get their own `word_sets` row, because their question-type configs may differ.
- If a student's config changes, existing cached rows are **not** automatically invalidated. Teacher can delete them via SQL portal if needed.
- `questions_json` structure mirrors the `WordQuestions` TypeScript interface in `src/lib/claude.ts`.

---

## Table: `wrong_bank`

Tracks which questions a student has answered incorrectly and how many times.

```sql
CREATE TABLE wrong_bank (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_set_id   INTEGER NOT NULL REFERENCES word_sets(id) ON DELETE CASCADE,
  question_key  TEXT    NOT NULL,   -- e.g. 'meaning' | 'synonym' | 'antonym' | 'comp_0' | 'fill_blank'
  wrong_count   INTEGER NOT NULL DEFAULT 1,
  last_wrong_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, word_set_id, question_key)
);

CREATE INDEX idx_wrong_bank_user_id ON wrong_bank(user_id);
```

**question_key values**

| Key | Question type |
|-----|--------------|
| `meaning` | MCQ word meaning |
| `synonym` | MCQ synonym |
| `antonym` | MCQ antonym |
| `comp_0`, `comp_1`, … | Comprehension question N |
| `fill_blank` | Fill-in-the-blank |

**Notes**
- `wrong_count` increments on each wrong answer, decrements on each correct re-practice answer.
- When `wrong_count` reaches 0 the row is deleted — the word leaves the wrong bank.

---

## Table: `schema_migrations`

Simple migration log to track which schema versions have been applied.

```sql
CREATE TABLE schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Current versions:
- `v1.0-initial`
- `v2.0-user-config`
- `v3.0-per-word-questions`
- `v4.0-per-user-words`  ← current

---

## Entity Relationship Summary

```
users  ──< words ──< word_sets >── users
                         │
                    wrong_bank >── users
```

- One user (student) has many **words**.
- One word has one **word_set** per user (cached questions).
- One user has many **wrong_bank** entries referencing word_sets.

---

## Migration Notes (v4.0)

When upgrading from an earlier schema:

1. `ALTER TABLE words ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);`
2. `DROP INDEX IF EXISTS words_word_key;`
3. `CREATE UNIQUE INDEX IF NOT EXISTS idx_words_user_word ON words(user_id, word);`
4. Existing words get `user_id = NULL` (unassigned legacy). Reassign via SQL portal.
5. `ALTER TABLE word_sets ADD COLUMN IF NOT EXISTS user_id INTEGER;`
6. `DROP INDEX IF EXISTS idx_word_sets_word_id;`
7. `CREATE UNIQUE INDEX IF NOT EXISTS idx_word_sets_user_word ON word_sets(user_id, word_id);`
8. Clear `word_sets` table (stale cache from old schema).
9. Add `enable_mcq_*`, `enable_comprehension`, `enable_fill_blank` columns to `users`.
10. Drop `question_config` table (global config replaced by per-user columns).
