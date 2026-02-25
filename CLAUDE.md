# Vocab Star — Claude Code Context

## Project
A vocabulary practice website for primary school students built with Next.js 16.

## Tech Stack
- **Frontend**: React 19, Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4
- **Database**: Neon PostgreSQL (serverless) via `@neondatabase/serverless`
- **AI**: Anthropic Claude Haiku (`claude-haiku-4-5`) via `@anthropic-ai/sdk`
- **Auth**: Cookie-based (`vocab_user_id`), passwords hashed with `bcryptjs`
- **Language**: TypeScript (strict)

## Session Format (5 Words Per Session)
Each practice session picks 5 words and generates:
- **Per word (×5)**: MCQ meaning + MCQ synonym + MCQ antonym = 15 questions
- **Paragraph**: One paragraph using all 5 words + 3 MCQ comprehension questions
- **Dictation**: All 5 words with TTS playback (Browser Web Speech API) + text input

Total: 23 questions per session, all shown on one page at once.

## Key Files
- `src/lib/db.ts` — lazy Neon connection (only connects on first query)
- `src/lib/auth.ts` — getCurrentUser, setUserCookie, clearUserCookie
- `src/lib/session.ts` — anonymous session management
- `src/lib/db-init.ts` — schema init (runs in parallel, uses `global.__vocabDbInitialized`)
- `src/lib/claude.ts` — AI question generation + DB caching (`getOrGenerateWordSet`)
- `src/lib/wordfreq.ts` — Zipf frequency scoring for difficulty classification

## Key Components
- `PracticeSession` — main session component (progress bar + all 3 sections)
- `SessionMCQ` — reusable MCQ with immediate feedback on click
- `DictationItem` — TTS playback + text input, hides word until submitted
- `WrongBankList` — table showing tricky words (Word | Type | Times Wrong | Last Wrong)
- `ChildHeader` — nav header with login/logout, fetches user once on mount only

## DB Schema (relevant tables)
```sql
word_sets (id, word_ids_key TEXT UNIQUE, words_json, questions_json, created_at)
-- word_ids_key = sorted comma-joined word IDs e.g. "1,2,3,4,5"

wrong_bank (id, user_id, session_id, word_set_id, question_key, wrong_count, last_wrong_at)
-- question_key format: meaning_0..4 | synonym_0..4 | antonym_0..4 | comp_0..2 | dictation_0..4
-- partial unique indexes: idx_wb_session_wordset and idx_wb_user_wordset
```

## Important Patterns
- DB rows typed as `Record<string, unknown>` — always cast: `Number(row.id)`, `row.field as string`
- `next.config.ts` uses `turbopack: {}` (no webpack config)
- Wrong bank uses `user_id` for logged-in users, `session_id` for anonymous
- `word_sets` caches questions by sorted `word_ids_key` — same 5 words = reuse cached questions
- Answers recorded immediately per question via `/api/questions/answer` with `{ wordSetId, questionKey, isCorrect }`

## Environment Variables
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `DATABASE_URL` — Neon PostgreSQL connection string (no `channel_binding=require`)

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
