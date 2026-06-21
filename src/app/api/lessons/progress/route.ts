/**
 * GET  — fetch lesson completion progress for current user
 * POST — mark a lesson step as done
 *
 * POST body: { lesson: string, step: 'practice' | 'dictation' | 'tricky' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { initDb } from '@/lib/db-init';
import sql from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await initDb();

  const rows = await sql`
    SELECT lesson_number, practice_done, dictation_done, tricky_clicked
    FROM lesson_progress WHERE user_id = ${user.id}
  `;

  const progress: Record<string, { practice: boolean; dictation: boolean; tricky: boolean }> = {};
  for (const r of rows) {
    progress[r.lesson_number as string] = {
      practice: Boolean(r.practice_done),
      dictation: Boolean(r.dictation_done),
      tricky: Boolean(r.tricky_clicked),
    };
  }
  return NextResponse.json({ progress });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await initDb();

  const { lesson, step } = await request.json();
  if (!lesson || !step) return NextResponse.json({ error: 'Missing lesson or step' }, { status: 400 });

  // Upsert the specific step as done
  if (step === 'practice') {
    await sql`
      INSERT INTO lesson_progress (user_id, lesson_number, practice_done)
      VALUES (${user.id}, ${lesson}, true)
      ON CONFLICT (user_id, lesson_number)
      DO UPDATE SET practice_done = true, updated_at = now()
    `;
  } else if (step === 'dictation') {
    await sql`
      INSERT INTO lesson_progress (user_id, lesson_number, dictation_done)
      VALUES (${user.id}, ${lesson}, true)
      ON CONFLICT (user_id, lesson_number)
      DO UPDATE SET dictation_done = true, updated_at = now()
    `;
  } else {
    await sql`
      INSERT INTO lesson_progress (user_id, lesson_number, tricky_clicked)
      VALUES (${user.id}, ${lesson}, true)
      ON CONFLICT (user_id, lesson_number)
      DO UPDATE SET tricky_clicked = true, updated_at = now()
    `;
  }

  return NextResponse.json({ ok: true });
}
