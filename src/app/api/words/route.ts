import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get('difficulty');
    const lessonParam = searchParams.get('lesson');
    const lessonNumber = lessonParam ? parseInt(lessonParam) : null;

    // Build query with optional filters
    let rows;
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty) && lessonNumber) {
      rows = await sql`
        SELECT id, word, zipf_score, difficulty, lesson_number, created_at
        FROM words
        WHERE difficulty = ${difficulty} AND lesson_number = ${lessonNumber}
        ORDER BY lesson_number ASC NULLS LAST, word ASC
      `;
    } else if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      rows = await sql`
        SELECT id, word, zipf_score, difficulty, lesson_number, created_at
        FROM words
        WHERE difficulty = ${difficulty}
        ORDER BY lesson_number ASC NULLS LAST, word ASC
      `;
    } else if (lessonNumber) {
      rows = await sql`
        SELECT id, word, zipf_score, difficulty, lesson_number, created_at
        FROM words
        WHERE lesson_number = ${lessonNumber}
        ORDER BY word ASC
      `;
    } else {
      rows = await sql`
        SELECT id, word, zipf_score, difficulty, lesson_number, created_at
        FROM words
        ORDER BY lesson_number ASC NULLS LAST, word ASC
      `;
    }

    // Also return distinct lesson numbers for the filter UI
    const lessonRows = await sql`
      SELECT DISTINCT lesson_number
      FROM words
      WHERE lesson_number IS NOT NULL
      ORDER BY lesson_number ASC
    `;
    const lessonNumbers = lessonRows.map((r) => Number(r.lesson_number));

    return NextResponse.json({ words: rows, lessonNumbers });
  } catch (err) {
    console.error('Words fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initDb();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { ids } = await req.json() as { ids: number[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    await sql`DELETE FROM words WHERE id = ANY(${ids}::int[])`;
    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    console.error('Words delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
