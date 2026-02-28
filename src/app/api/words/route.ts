import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const { searchParams } = new URL(req.url);
    const lesson = searchParams.get('lesson');

    let rows;
    if (lesson) {
      rows = await sql`
        SELECT id, word, zipf_score, difficulty, lesson_number, created_at
        FROM words
        WHERE lesson_number = ${lesson}
        ORDER BY word ASC
      `;
    } else {
      rows = await sql`
        SELECT id, word, zipf_score, difficulty, lesson_number, created_at
        FROM words
        ORDER BY lesson_number ASC NULLS LAST, word ASC
      `;
    }

    // Distinct lesson numbers for filter UI
    const lessonRows = await sql`
      SELECT DISTINCT lesson_number
      FROM words
      WHERE lesson_number IS NOT NULL
      ORDER BY lesson_number ASC
    `;
    const lessonNumbers = lessonRows.map((r) => r.lesson_number as string);

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

    const { ids } = (await req.json()) as { ids: number[] };
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
