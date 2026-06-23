import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser, canManageStudent, AuthUser } from '@/lib/auth';

/** 403 guard: the word must belong to one of the teacher's students (admin any). */
async function guardWordOwnership(user: AuthUser, wordId: number): Promise<NextResponse | null> {
  if (user.role === 'admin') return null;
  const rows = await sql`SELECT user_id FROM words WHERE id = ${wordId}`;
  if (rows.length === 0) return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  const ownerId = rows[0].user_id != null ? Number(rows[0].user_id) : null;
  if (ownerId == null || !(await canManageStudent(user, ownerId))) {
    return NextResponse.json({ error: 'Not your student' }, { status: 403 });
  }
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { id: idStr } = await params;
    const wordId = parseInt(idStr);
    if (isNaN(wordId)) return NextResponse.json({ error: 'Invalid word ID' }, { status: 400 });

    const denied = await guardWordOwnership(user, wordId);
    if (denied) return denied;

    const body = await req.json() as { lessonNumber?: string; difficulty?: string };

    if (body.lessonNumber !== undefined) {
      await sql`UPDATE words SET lesson_number = ${body.lessonNumber} WHERE id = ${wordId}`;
    }
    if (body.difficulty !== undefined) {
      await sql`UPDATE words SET difficulty = ${body.difficulty} WHERE id = ${wordId}`;
    }

    const rows = await sql`SELECT id, word, user_id, zipf_score, difficulty, lesson_number, created_at FROM words WHERE id = ${wordId}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Word not found' }, { status: 404 });

    return NextResponse.json({ word: rows[0] });
  } catch (err) {
    console.error('Word PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { id: idStr } = await params;
    const wordId = parseInt(idStr);
    if (isNaN(wordId)) return NextResponse.json({ error: 'Invalid word ID' }, { status: 400 });

    const denied = await guardWordOwnership(user, wordId);
    if (denied) return denied;

    await sql`DELETE FROM words WHERE id = ${wordId}`;
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('Word DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
