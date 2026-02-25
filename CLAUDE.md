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

## Key Files
- `src/lib/db.ts` — lazy Neon connection (only connects on first query)
- `src/lib/auth.ts` — getCurrentUser, setUserCookie, clearUserCookie
- `src/lib/session.ts` — anonymous session management
- `src/lib/db-init.ts` — schema init (runs in parallel, uses `global.__vocabDbInitialized`)
- `src/lib/claude.ts` — AI question generation + DB caching
- `src/lib/wordfreq.ts` — Zipf frequency scoring for difficulty classification

## Important Patterns
- DB rows are typed as `Record<string, unknown>` — always cast fields: `Number(row.id)`, `row.field as string`
- `next.config.ts` uses `turbopack: {}` (Turbopack is default in Next.js 16, no webpack config)
- Wrong bank uses `user_id` for logged-in users, `session_id` for anonymous users
- Partial unique index `idx_wrong_bank_user` on `wrong_bank(user_id, question_id, question_type) WHERE user_id IS NOT NULL`

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
