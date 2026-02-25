# Vocab Star — Claude Code Context

## Project
AI-powered English vocabulary practice website for primary school students.

## Tech Stack
- **Frontend**: React 19, Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4, Nunito + Nunito Sans (Google Fonts)
- **Database**: Neon PostgreSQL (serverless) via `@neondatabase/serverless`
- **AI**: Anthropic Claude Haiku (`claude-haiku-4-5`) via `@anthropic-ai/sdk`
- **Auth**: Cookie-based (`vocab_user_id`), passwords hashed with `bcryptjs`
- **Language**: TypeScript (strict)

## Roles
- **student** (default) — can practice, see wrong bank
- **teacher** / **admin** — can also upload words, manage word list (/words), access /upload
- Teacher registers with `TEACHER_CODE` env var (default: `VOCAB_TEACHER`)

## Session Format (5 Words Per Session)
Each practice session picks 5 words and generates:
- **Per word (×5)**: MCQ meaning + MCQ synonym + MCQ antonym = 15 questions
- **Paragraph**: One paragraph using all 5 words + 3 MCQ comprehension questions
- **Dictation**: All 5 words with TTS (Browser Web Speech API) + text input
- Total: 23 questions per session, all on one page at once

## Key Files
- `src/lib/db.ts` — lazy Neon connection (only connects on first query)
- `src/lib/auth.ts` — getCurrentUser (returns role), setUserCookie, clearUserCookie
- `src/lib/session.ts` — anonymous session management
- `src/lib/db-init.ts` — schema init (parallel, uses `global.__vocabDbInitialized`)
- `src/lib/claude.ts` — AI question generation + DB caching (`getOrGenerateWordSet`)
- `src/lib/wordfreq.ts` — Zipf frequency scoring for difficulty classification

## Key Pages & Components
- `/practice` — pick difficulty + lesson → 5-word session
- `/wrong-bank` — Tricky Words list + re-practice
- `/upload` — teacher-only word upload (format: "1 cat" for lesson 1, word "cat")
- `/words` — teacher-only word management (list, edit, delete)
- `PracticeSession` — main session (progress bar + 3 sections)
- `SessionMCQ` — MCQ with immediate feedback
- `DictationItem` — TTS + text input
- `WrongBankList` — tricky words table
- `ChildHeader` — nav; teachers see "Manage Words" + "Upload" extra items
- `WordUploader` — drag-drop textarea, parses "lesson word" format

## DB Schema (key tables)
```sql
words (id, word TEXT UNIQUE, zipf_score, difficulty, lesson_number INTEGER, created_at)
users (id, email UNIQUE, password_hash, display_name, role DEFAULT 'student', created_at)
word_sets (id, word_ids_key TEXT UNIQUE, words_json, questions_json, created_at)
wrong_bank (id, user_id, session_id, word_set_id, question_key, wrong_count, last_wrong_at)
-- question_key: meaning_0..4 | synonym_0..4 | antonym_0..4 | comp_0..2 | dictation_0..4
```

## Important Patterns
- DB rows typed as `Record<string, unknown>` — always cast: `Number(row.id)`, `row.field as string`
- `next.config.ts` uses `turbopack: {}` (no webpack config)
- Wrong bank uses `user_id` for logged-in, `session_id` for anonymous
- `word_sets` caches questions by sorted `word_ids_key`
- Answers recorded immediately per question via `/api/questions/answer`
- Wrong count decrements on correct re-practice; question removed when count reaches 0

## API Routes
- `POST /api/auth/register` — body: { email, password, displayName?, teacherCode? }
- `POST /api/auth/login` — body: { email, password }
- `GET /api/words` — returns { words, lessonNumbers }; query: ?difficulty=&lesson=
- `PATCH /api/words/[id]` — teacher only; body: { lessonNumber?, difficulty? }
- `DELETE /api/words/[id]` — teacher only
- `POST /api/words/upload` — teacher only; body: { words: string } ("1 cat\n2 dog")
- `POST /api/questions/generate` — body: { difficulty?, lessonNumber? }
- `POST /api/questions/answer` — body: { wordSetId, questionKey, isCorrect }

## Environment Variables
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `DATABASE_URL` — Neon PostgreSQL connection string (no `channel_binding=require`)
- `TEACHER_CODE` — optional; default `VOCAB_TEACHER`

## Deployment
- GitHub: https://github.com/jiangjundongsg/tuition-vocab
- Vercel: https://tuition-vocab.vercel.app
- Auto-deploys on push to `master`

## Dev
```bash
cd tuition-vocab
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npx tsc --noEmit # type check
```
