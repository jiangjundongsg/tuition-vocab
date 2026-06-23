import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser, canManageStudent, studentIdsOf } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const lessonParam = searchParams.get('lesson');

    let rows;
    let lessonRows;

    if (user.role === 'student') {
      // Student: only their own words, optionally filtered by lesson
      rows = lessonParam
        ? await sql`
            SELECT id, word, user_id, zipf_score, difficulty, lesson_number, created_at
            FROM words WHERE user_id = ${user.id} AND lesson_number = ${lessonParam}
            ORDER BY word ASC`
        : await sql`
            SELECT id, word, user_id, zipf_score, difficulty, lesson_number, created_at
            FROM words WHERE user_id = ${user.id}
            ORDER BY lesson_number ASC NULLS LAST, word ASC`;
      lessonRows = await sql`
        SELECT DISTINCT lesson_number FROM words
        WHERE lesson_number IS NOT NULL AND user_id = ${user.id}
        ORDER BY lesson_number ASC`;
    } else if (user.role === 'admin') {
      // Admin: everyone, or a single student via ?userId=
      if (userIdParam) {
        const uid = parseInt(userIdParam);
        rows = await sql`
          SELECT id, word, user_id, zipf_score, difficulty, lesson_number, created_at
          FROM words WHERE user_id = ${uid}
          ORDER BY lesson_number ASC NULLS LAST, word ASC`;
        lessonRows = await sql`
          SELECT DISTINCT lesson_number FROM words
          WHERE lesson_number IS NOT NULL AND user_id = ${uid}
          ORDER BY lesson_number ASC`;
      } else {
        rows = await sql`
          SELECT id, word, user_id, zipf_score, difficulty, lesson_number, created_at
          FROM words ORDER BY lesson_number ASC NULLS LAST, word ASC`;
        lessonRows = await sql`
          SELECT DISTINCT lesson_number FROM words
          WHERE lesson_number IS NOT NULL ORDER BY lesson_number ASC`;
      }
    } else {
      // Teacher: only their own students' words
      if (userIdParam) {
        const uid = parseInt(userIdParam);
        if (!(await canManageStudent(user, uid))) {
          return NextResponse.json({ error: 'Not your student' }, { status: 403 });
        }
        rows = await sql`
          SELECT id, word, user_id, zipf_score, difficulty, lesson_number, created_at
          FROM words WHERE user_id = ${uid}
          ORDER BY lesson_number ASC NULLS LAST, word ASC`;
        lessonRows = await sql`
          SELECT DISTINCT lesson_number FROM words
          WHERE lesson_number IS NOT NULL AND user_id = ${uid}
          ORDER BY lesson_number ASC`;
      } else {
        const ids = await studentIdsOf(user.id);
        rows = await sql`
          SELECT id, word, user_id, zipf_score, difficulty, lesson_number, created_at
          FROM words WHERE user_id = ANY(${ids}::int[])
          ORDER BY lesson_number ASC NULLS LAST, word ASC`;
        lessonRows = await sql`
          SELECT DISTINCT lesson_number FROM words
          WHERE lesson_number IS NOT NULL AND user_id = ANY(${ids}::int[])
          ORDER BY lesson_number ASC`;
      }
    }

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

    // Teacher may only delete words belonging to their own students; admin any.
    let deleted;
    if (user.role === 'admin') {
      deleted = await sql`DELETE FROM words WHERE id = ANY(${ids}::int[]) RETURNING id`;
    } else {
      const studentIds = await studentIdsOf(user.id);
      deleted = await sql`
        DELETE FROM words
        WHERE id = ANY(${ids}::int[]) AND user_id = ANY(${studentIds}::int[])
        RETURNING id`;
    }
    return NextResponse.json({ deleted: deleted.length });
  } catch (err) {
    console.error('Words delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
