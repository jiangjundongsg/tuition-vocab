# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Vocab Star — Claude Code Context

## Project
AI-powered English vocabulary practice website for primary school students.

## Dev Commands
```bash
cd tuition-vocab
npm run dev        # dev server at localhost:3000
npm run build      # production build
npm run lint       # ESLint
npx tsc --noEmit   # type check only
```

## Tech Stack
- **Frontend**: React 19, Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4, Nunito / Nunito Sans (Google Fonts)
- **Database**: Neon PostgreSQL (serverless) via `@neondatabase/serverless`
- **AI**: Anthropic Claude Opus (`claude-opus-4-8`) for passage + question generation; Sonnet 4.6 for PDF word extraction — via `@anthropic-ai/sdk`~The following packages have unmet dependencies:
 rocm-hip-runtime : Depends: rocminfo (= 1.0.0.60300-39~24.04) but 5.7.1-3build1 is to be installed
 rocm-hip-runtime-dev : Depends: rocm-cmake (= 0.14.0.60300-39~24.04) but 6.0.0-1 is to be installed
                        Depends: hipcc (= 1.1.1.60300-39~24.04) but 5.7.1-3 is to be installed
 rocm-utils : Depends: rocminfo (= 1.0.0.60300-39~24.04) but 5.7.1-3build1 is to be installed
              Depends: rocm-cmake (= 0.14.0.60300-39~24.04) but 6.0.0-1 is to be installed
E: Unable to correct problems, you have held broken packages.
- **Auth**: Cookie-based (`vocab_user_id`), passwords hashed with `bcryptjs`
- **Language**: TypeScript (strict)

## Roles
- **student** (default) — can practice lessons assigned to them, see wrong bank, do dictation
- **teacher** / **admin** — management only: upload words, manage students, SQL portal
- Teacher registers with `TEACHER_CODE` env var (default: `VOCAB_TEACHER`)
- Teacher sees ONLY teacher tools tab; student sees Practice, Tricky Words, Dictation

## Word Scoping (CRITICAL)
Words are **per-student** — each word row has a `user_id` FK to the student it belongs to.
- Teacher must select target student(s) before uploading words
- Students only see lessons/words assigned to their own `user_id`
- Same word can exist for multiple students (UNIQUE on `(user_id, word)`)
- Upload routes accept multiple `targetUserId` values; N students × M words = N×M rows inserted

## Question Configuration (per-student, teacher-configurable)
All question parameters live in the `users` table — teacher edits via User Manager:
- `enable_mcq_meaning` BOOLEAN — MCQ about word meaning
- `enable_mcq_synonym` BOOLEAN — MCQ synonym
- `enable_mcq_antonym` BOOLEAN — MCQ antonym
- `enable_comprehension` BOOLEAN — comprehension questions
- `enable_fill_blank` BOOLEAN — fill-in-the-blank
- `num_comprehension` INTEGER — how many comprehension Qs per word
- `num_blanks` INTEGER — how many blanks in fill-blank
- `blank_zipf_max` REAL — Zipf cutoff for blank selection
- `passage_word_count` INTEGER — word count for Claude-generated passages
- `comp_question_type` TEXT — `mcq` | `true_false` | `mixed`
- `passage_source` TEXT — textbook filename (e.g. `TextBook_Harry_Portter`)
- `age` INTEGER — calibrates difficulty of generated questions

## Architecture

```
src/
├── app/
│   ├── api/            # Next.js route handlers (server-only)
│   ├── practice/       # Student practice page
│   ├── dictation/      # Student dictation page
│   ├── wrong-bank/     # Student tricky words page
│   ├── words/          # Teacher management page
│   └── page.tsx        # Landing (role-aware)
├── components/         # React client components
└── lib/                # Shared server utilities
```

Key architectural flows:
- **Practice**: `PracticeSession` → per-word `GET /api/practice/[wordId]` → `claude.ts` generates passage + enabled question types → cached in `word_sets(user_id, word_id)` → `SessionMCQ` / `FillBlankExercise` → `POST /api/questions/answer` → wrong bank
- **Dictation**: standalone `/dictation` page; fetches words via `GET /api/dictation/[lessonNumber]`; TTS via browser Web Speech API (`SpeakableText`, `DictationItem`)
- **Upload**: teacher selects student(s) → upload component sends base64/text + `targetUserId[]` → API validates, inserts words with `user_id`
- **Passage refresh**: `POST /api/practice/[wordId]/refresh` regenerates + overwrites `word_sets` cache

## Key Files
- `src/lib/db.ts` — lazy Neon connection (connects on first query)
- `src/lib/auth.ts` — `getCurrentUser()` returns `AuthUser` with role + full config; `setUserCookie` / `clearUserCookie`
- `src/lib/db-init.ts` — schema init + migrations; run once per cold start via `global.__vocabDbInitialized`
- `src/lib/claude.ts` — `generateWordQuestions(word, config)` and `generateParagraph()`; respects per-user question-type flags; returns only enabled question types
- `src/lib/fillblank.ts` — derives fill-blank exercise from a paragraph using Zipf scores
- `src/lib/wordfreq.ts` — Zipf frequency scoring for difficulty classification
- `src/lib/textbook.ts` — search textbook file for a word's paragraph
- `src/lib/tts.ts` — TTS helpers

## Key Components
- `PracticeSession` — word-by-word flow; receives enabled question types from API response
- `WordPracticeCard` — passage display + regenerate button for one word
- `SessionMCQ` — MCQ with immediate feedback
- `FillBlankExercise` — fill-blank with first-letter hints
- `DictationSession` — end-of-lesson TTS round (all words on one page)
- `DictationItem` — TTS button + text input per word
- `RepracticeSession` — wrong-bank re-practice (only failed question types shown)
- `WrongBankList` — tricky words table (filtered to current student)
- `WordUploader` — CSV upload with multi-student selector
- `PhotoUploader` — photo upload with multi-student selector
- `PDFUploader` — PDF upload with multi-student selector
- `TeacherUserManager` — user list; edit profile + 5 question-type checkboxes
- `TeacherSQLPortal` — raw SQL portal (DDL blocked)
- `SpeakableText` — Web Speech API TTS wrapper
- `ChildHeader` — role-aware nav (teacher: Teacher Tools only; student: Practice, Tricky Words, Dictation)

## DB Schema
```sql
words (id, word TEXT, user_id INTEGER REFERENCES users(id), zipf_score REAL,
       difficulty TEXT, lesson_number TEXT, created_at TIMESTAMPTZ)
-- UNIQUE(user_id, word)

users (id, email UNIQUE, password_hash, display_name, role DEFAULT 'student',
       age INTEGER, passage_source TEXT,
       enable_mcq_meaning BOOLEAN DEFAULT true,
       enable_mcq_synonym BOOLEAN DEFAULT false,
       enable_mcq_antonym BOOLEAN DEFAULT false,
       enable_comprehension BOOLEAN DEFAULT true,
       enable_fill_blank BOOLEAN DEFAULT true,
       num_comprehension INTEGER DEFAULT 2,
       num_blanks INTEGER DEFAULT 5,
       blank_zipf_max REAL DEFAULT 4.2,
       passage_word_count INTEGER DEFAULT 150,
       comp_question_type TEXT DEFAULT 'mcq',
       created_at TIMESTAMPTZ)

word_sets (id, word_id INTEGER, user_id INTEGER, paragraph_text TEXT,
           questions_json TEXT, fill_blank_json TEXT, created_at TIMESTAMPTZ)
-- UNIQUE(user_id, word_id)

wrong_bank (id, user_id INTEGER, word_set_id INTEGER, question_key TEXT,
            wrong_count INTEGER, last_wrong_at TIMESTAMPTZ)
-- UNIQUE(user_id, word_set_id, question_key)
-- question_key values: meaning | synonym | antonym | comp_0 | comp_1 | fill_blank
```

## Important Patterns
- DB rows typed as `Record<string, unknown>` — always cast: `Number(row.id)`, `row.field as string`
- `next.config.ts` uses `turbopack: {}` — no webpack config
- `word_sets` caches questions per `(user_id, word_id)` — two students on the same word get separate caches
- Upload lesson label defaults to `<displayName><YYMMDD>` (spaces stripped, e.g. `"JohnSmith260311"`)
- Wrong count decrements on correct re-practice; row deleted when count reaches 0
- DDL is blocked in SQL portal; only SELECT / INSERT / UPDATE / DELETE allowed

## API Routes
```
POST /api/auth/register          body: { email, password, displayName?, teacherCode? }
POST /api/auth/login             body: { email, password }
GET  /api/auth/me                returns current user info
POST /api/auth/logout

GET  /api/words                  student: own (optional ?lesson= filter); teacher: ?userId= filter → { words, lessonNumbers }
PATCH /api/words/[id]            teacher only; body: { lessonNumber?, difficulty? }
DELETE /api/words                teacher only; body: { ids: number[] }
POST /api/words/upload           teacher only; body: { words: string, targetUserIds: number[] }
POST /api/words/upload-photo     teacher only; body: { image: base64, targetUserIds: number[] }
POST /api/words/upload-pdf       teacher only; body: { pdf: base64, targetUserIds: number[] }

GET  /api/lessons                student: own; teacher: ?userId= filter
GET  /api/practice/[wordId]      generate/fetch word_set for current user
POST /api/practice/[wordId]/refresh  regenerate + overwrite cached word_set
GET  /api/practice/last-lesson   last lesson practiced by current user

POST /api/questions/answer       body: { wordSetId, questionKey, isCorrect }

GET  /api/wrong-bank             current user's wrong bank
POST /api/wrong-bank/repractice  body: { wordSetId, questionKey, isCorrect }

GET  /api/dictation/lessons      student: own lessons for dictation
GET  /api/dictation/[lessonNumber]  all words in lesson for dictation session

GET  /api/teacher/users          teacher only; list all users with full config
PATCH /api/teacher/users/[id]    teacher only; update profile + question-type flags
DELETE /api/teacher/users/[id]   teacher only
POST /api/teacher/sql            teacher only; raw SQL (DDL blocked)
```

## Environment Variables
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `DATABASE_URL` — Neon PostgreSQL connection string (no `channel_binding=require`)
- `TEACHER_CODE` — optional; default `VOCAB_TEACHER`

## Deployment
- **GitHub**: https://github.com/jiangjundongsg/tuition-vocab
- **Production**: https://tuition-vocab.vercel.app
- Auto-deploys on push to `master`
