import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

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

    const { id } = await params;
    const wordId = parseInt(id);
    if (isNaN(wordId)) {
      return NextResponse.json({ error: 'Invalid word ID' }, { status: 400 });
    }

    const body = (await req.json()) as {
      lessonNumber?: string | null;
      difficulty?: string;
    };

    // Validate difficulty label
    const validDifficulties = ['high', 'medium', 'low', 'unknown'];
    if (body.difficulty && !validDifficulties.includes(body.difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    }

    if (body.lessonNumber !== undefined && body.difficulty) {
      await sql`
        UPDATE words
        SET lesson_number = ${body.lessonNumber ?? null},
            difficulty    = ${body.difficulty}
        WHERE id = ${wordId}
      `;
    } else if (body.lessonNumber !== undefined) {
      await sql`
        UPDATE words SET lesson_number = ${body.lessonNumber ?? null} WHERE id = ${wordId}
      `;
    } else if (body.difficulty) {
      await sql`
        UPDATE words SET difficulty = ${body.difficulty} WHERE id = ${wordId}
      `;
    }

    const rows = await sql`
      SELECT id, word, zipf_score, difficulty, lesson_number FROM words WHERE id = ${wordId}
    `;
    return NextResponse.json({ word: rows[0] });
  } catch (err) {
    console.error('Word update error:', err);
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

    const { id } = await params;
    const wordId = parseInt(id);
    if (isNaN(wordId)) {
      return NextResponse.json({ error: 'Invalid word ID' }, { status: 400 });
    }

    await sql`DELETE FROM words WHERE id = ${wordId}`;
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('Word delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
