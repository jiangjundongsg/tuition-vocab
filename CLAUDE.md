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
- **AI**: Deepseek Chat (`deepseek-chat`) for passage + question generation and photo word extraction — via fetch to `api.deepseek.com/v1`
 rocm-hip-runtime : Depends: rocminfo (= 1.0.0.60300-39~24.04) but 5.7.1-3build1 is to be installed
 rocm-hip-runtime-dev : Depends: rocm-cmake (= 0.14.0.60300-39~24.04) but 6.0.0-1 is to be installed
                        Depends: hipcc (= 1.1.1.60300-39~24.04) but 5.7.1-3 is to be installed
 rocm-utils : Depends: rocminfo (= 1.0.0.60300-39~24.04) but 5.7.1-3build1 is to be installed
              Depends: rocm-cmake (= 0.14.0.60300-39~24.04) but 6.0.0-1 is to be installed
E: Unable to correct problems, you have held broken packages.
- **Auth**: Cookie-based (`vocab_user_id`), passwords hashed with `bcryptjs`
- **Language**: TypeScript (strict)

## Roles & Teacher↔Student ownership (CRITICAL)
- **student** (default) — logs in with **username (or email) + password**; practices lessons assigned to them, sees wrong bank, dictation, mistake pick
- **teacher** — management only; owns a set of students and sees/edits **only their own** students
- **admin** — super-user; sees/edits **everyone** (the only role with the SQL portal)
- Each student row has `teacher_id` (the approving teacher) and `status` (`pending` | `approved` | `rejected`)
- **Registration** (`/register`, role selector):
  - Teacher: email + `TEACHER_CODE` (default `VOCAB_TEACHER`); may batch-create students inline (each `username` + password) — those are `approved` immediately under `teacher_id`
  - Student: `username` + password + the **teacher's numeric user ID** → created `status='pending'`; can log in but sees a pending screen (nav hides practice) until the teacher approves
- Teachers add more students later (Teacher Tools → Students → "Add a student") and approve/reject pending requests there; the page shows the teacher's shareable **Teacher ID**
- Every teacher API route is ownership-guarded server-side (see `canManageStudent` / `studentIdsOf` in `auth.ts`) — never trust a client-supplied `userId`

## Word Scoping (CRITICAL)
Words are **per-student** — each word row has a `user_id` FK to the student it belongs to.
- A teacher sees/uploads/edits/deletes words **only** for their own students (`user_id IN studentIdsOf(teacher)`); admin sees all
- Teacher must select target student(s) before uploading words; upload routes reject `targetUserId`s that aren't the teacher's students
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
│   ├── practice/       # Student practice page/
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
- `src/lib/auth.ts` — `getCurrentUser()` returns `AuthUser` (role, status, teacherId, username + full config); `setUserCookie` / `clearUserCookie`; ownership helpers `studentIdsOf(teacherId)` + `canManageStudent(user, studentId)` (admin → always)
- `src/lib/deepseek.ts` — ACTIVE AI generator (passages, questions, sentence feedback, mistake-pick) via Deepseek; central `chat()` appends an "always respond in English" directive. (`claude.ts` is legacy/unused.)
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
- `TeacherUserManager` — shows the teacher's shareable Teacher ID, pending join requests (approve/reject), "Add a student" form, and the scoped student list; edit profile + question-type checkboxes
- `TeacherSQLPortal` — raw SQL portal (DDL blocked); **admin-only** tab
- `SpeakableText` — Web Speech API TTS wrapper
- `ChildHeader` — role-aware nav (teacher: Teacher Tools only; student: Practice, Dictation, Tricky Words, Mistake Pick; pending student: Home only)

## DB Schema
```sql
words (id, word TEXT, user_id INTEGER REFERENCES users(id), zipf_score REAL,
       difficulty TEXT, lesson_number TEXT, created_at TIMESTAMPTZ)
-- UNIQUE(user_id, word)

users (id, email UNIQUE (nullable), username UNIQUE-ci (nullable), password_hash,
       display_name, role DEFAULT 'student',
       status TEXT DEFAULT 'approved',          -- 'pending' | 'approved' | 'rejected'
       teacher_id INTEGER REFERENCES users(id), -- approving teacher (students only)
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

auth_tokens (id, user_id INTEGER REFERENCES users(id), token_hash TEXT UNIQUE,
             purpose TEXT, expires_at TIMESTAMPTZ, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
-- one-time password-reset tokens; only SHA-256 hash stored; single-use + 1h TTL; purpose = 'reset'
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
POST /api/auth/register          teacher: { role:'teacher', email, password, teacherCode, students?:[{username,password,displayName?,age?}] }
                                 student: { role:'student', username, password, teacherId, displayName?, age?, email? } → status='pending'
POST /api/auth/login             body: { identifier (email OR username), password }  (legacy { email } still accepted)
GET  /api/auth/me                returns current user (incl. role, status, teacherId, username)
POST /api/auth/logout
POST /api/auth/request-reset     body: { email } — emails a password-reset link; always returns { ok: true } (no account enumeration)
POST /api/auth/reset             body: { token, password } — completes reset via one-time token

GET  /api/words                  student: own; teacher: only own students (?userId= must be own student, else 403); admin: all
PATCH /api/words/[id]            teacher (own student's word) / admin; body: { lessonNumber?, difficulty? }
DELETE /api/words                teacher (own students' words) / admin; body: { ids: number[] }
POST /api/words/upload           teacher/admin; targetUserIds must be own students; body: { words, targetUserIds }
POST /api/words/upload-photo     teacher/admin; targetUserIds must be own students; body: { image, targetUserIds }
POST /api/words/upload-pdf       teacher/admin; targetUserIds must be own students; body: { pdf, targetUserIds }

GET  /api/lessons                student: own; teacher: ?userId= must be own student (else 403)
GET  /api/practice/[wordId]      generate/fetch word_set for current user
POST /api/practice/[wordId]/refresh  regenerate + overwrite cached word_set
GET  /api/practice/last-lesson   last lesson practiced by current user

POST /api/questions/answer       body: { wordSetId, questionKey, isCorrect }

GET  /api/wrong-bank             current user's wrong bank
POST /api/wrong-bank/repractice  body: { wordSetId, questionKey, isCorrect }

GET  /api/dictation/lessons      student: own lessons for dictation
GET  /api/dictation/[lessonNumber]  all words in lesson for dictation session

GET  /api/teacher/users          teacher: own students (+ pending); admin: all — with full config + status/username
POST /api/teacher/students       teacher/admin; body: { students:[{username,password,displayName?,age?}] } → created under caller, status='approved'
PATCH /api/teacher/users/[id]    teacher (own student) / admin; update profile + question-type flags; body.status approves/rejects
DELETE /api/teacher/users/[id]   teacher (own student) / admin
GET  /api/teacher/users/[id]/progress  teacher (own student) / admin
POST /api/teacher/sql            ADMIN ONLY; raw SQL (DDL blocked)
```

## Environment Variables
- `DEEPSEEK_API_KEY` — from platform.deepseek.com; required for AI features (passage + question generation, photo word extraction)
- `DEEPSEEK_MODEL` — optional; defaults to `deepseek-chat`. Set to e.g. `deepseek-v4-pro` for newer models
- `DATABASE_URL` — Neon PostgreSQL connection string (no `channel_binding=require`)
- `TEACHER_CODE` — optional; default `VOCAB_TEACHER`
- `RESEND_API_KEY` — from resend.com; required to actually send password-reset emails. If unset, reset requests succeed but the email is only logged (graceful degradation)
- `EMAIL_FROM` — optional; sender for reset emails. Defaults to `Vocab Star <onboarding@resend.dev>` (Resend test sender). Set to an address on a Resend-verified domain for production delivery to arbitrary inboxes
- `APP_URL` — optional; canonical base URL used to build reset links in emails (e.g. `https://tuition-vocab.vercel.app`). Falls back to `VERCEL_URL`, then `localhost:3000`. Never derived from the request Host header (anti host-header-injection)

## Deployment
- **GitHub**: https://github.com/jiangjundongsg/tuition-vocab
- **Production**: https://tuition-vocab.vercel.app
- Auto-deploys on push to `master`
