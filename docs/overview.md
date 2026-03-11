# Vocab Star — Project Overview

## Purpose
Vocab Star is an AI-powered English vocabulary practice website designed for primary school students. Teachers upload vocabulary lists for specific students; students practice through AI-generated questions tailored to their level and configuration.

## Architecture Summary

```
Browser (React / Next.js App Router)
    │
    ├── /practice         Student practice sessions
    ├── /wrong-bank       Student tricky words & re-practice
    └── /words            Teacher management (upload, users, SQL)
         │
         └── Next.js API Routes (src/app/api/)
                  │
                  ├── Neon PostgreSQL  (words, users, word_sets, wrong_bank)
                  └── Anthropic Claude Haiku  (question generation)
```

## User Roles

| Role | Access |
|------|--------|
| **student** | Practice lessons assigned to them, view wrong bank |
| **teacher** / **admin** | Upload words, manage students, configure per-student settings, SQL portal |

Teachers register using the `TEACHER_CODE` environment variable. Students register normally — no code required.

## Core Workflow

1. **Teacher** creates a student account (or student self-registers).
2. **Teacher** uploads a vocabulary list (CSV, photo, or PDF) and assigns it to a specific student.
3. **Teacher** optionally configures question types and passage settings per student.
4. **Student** logs in, selects a lesson, and starts a practice session.
5. Each word generates a passage via Claude; enabled question types (MCQ meaning, synonym, antonym, comprehension, fill-blank) are presented.
6. After all words, a TTS dictation round runs.
7. Wrong answers accumulate in the **Wrong Bank** (Tricky Words); student can re-practice until cleared.

## Key Design Decisions

### Words are per-student
Every word row carries a `user_id` FK pointing to the student it belongs to. The same word can exist for multiple students independently. Teachers must select a target student before uploading.

### Question config is per-student
There is no global question configuration. All toggles (MCQ meaning, synonym, antonym, comprehension, fill-blank) and tuning parameters (passage length, Zipf cutoff, age) live as columns on the `users` row. Teachers edit them via the User Manager.

### Question caching per (user_id, word_id)
`word_sets` stores the generated passage and questions keyed to `(user_id, word_id)`. Two students practising the same word may receive different questions if their configs differ.

### Teacher UI is fully separated
Teachers see only **Teacher Tools** navigation. Students see only **Practice** and **Tricky Words**. There is no shared tab between the two roles.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4, Nunito / Nunito Sans (Google Fonts) |
| Database | Neon PostgreSQL (serverless) via `@neondatabase/serverless` |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5`) |
| Auth | Cookie-based (`vocab_user_id`), bcryptjs password hashing |
| Language | TypeScript (strict) |
| Hosting | Vercel (auto-deploy from `master` branch) |

## Repository & Deployment

- **GitHub**: https://github.com/jiangjundongsg/tuition-vocab
- **Production**: https://tuition-vocab.vercel.app
- **Branch strategy**: push to `master` → Vercel auto-deploys

## Local Development

```bash
cd tuition-vocab
npm run dev        # dev server at localhost:3000
npm run build      # production build
npx tsc --noEmit   # type check only
```

Required environment variables (`.env.local`):

```
ANTHROPIC_API_KEY=...
DATABASE_URL=...           # Neon connection string (no channel_binding=require)
TEACHER_CODE=VOCAB_TEACHER # optional, this is the default
```
