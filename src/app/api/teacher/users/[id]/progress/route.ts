/**
 * GET /api/teacher/users/[id]/progress — teacher fetches lesson progress for a student
 */
import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
  }
  await initDb();

  const { id: idStr } = await params;
  const targetId = parseInt(idStr);
  if (isNaN(targetId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

  const rows = await sql`
    SELECT lesson_number, practice_done, dictation_done, tricky_clicked
    FROM lesson_progress WHERE user_id = ${targetId}
    ORDER BY lesson_number ASC
  `;

  const progress = rows.map(r => ({
    lesson: r.lesson_number as string,
    practice: Boolean(r.practice_done),
    dictation: Boolean(r.dictation_done),
    tricky: Boolean(r.tricky_clicked),
  }));

  return NextResponse.json({ progress });
}
