import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser, canManageStudent } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');

    let targetId = user.id;
    if ((user.role === 'teacher' || user.role === 'admin') && userIdParam) {
      targetId = parseInt(userIdParam);
      if (!(await canManageStudent(user, targetId))) {
        return NextResponse.json({ error: 'Not your student' }, { status: 403 });
      }
    }

    // One row per lesson: first-upload date (min words.created_at), last-attended
    // date + completion flags (from lesson_progress). Sorted by last attended
    // (most recent first), then by first-upload date, both descending.
    const rows = await sql`
      SELECT w.lesson_number,
             MIN(w.created_at)                AS uploaded_at,
             MAX(lp.updated_at)               AS last_attended_at,
             BOOL_OR(lp.practice_done)        AS practice_done,
             BOOL_OR(lp.dictation_done)       AS dictation_done,
             BOOL_OR(lp.tricky_clicked)       AS tricky_clicked,
             BOOL_OR(lp.mistake_pick_done)    AS mistake_pick_done
      FROM words w
      LEFT JOIN lesson_progress lp
        ON lp.user_id = w.user_id AND lp.lesson_number = w.lesson_number
      WHERE w.user_id = ${targetId} AND w.lesson_number IS NOT NULL
      GROUP BY w.lesson_number
      ORDER BY MAX(lp.updated_at) DESC NULLS LAST, MIN(w.created_at) DESC
    `;

    const toIso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
    const lessonRows = rows.map((r) => ({
      lessonNumber: r.lesson_number as string,
      uploadedAt: toIso(r.uploaded_at),
      lastAttendedAt: toIso(r.last_attended_at),
      progress: {
        practice: Boolean(r.practice_done),
        dictation: Boolean(r.dictation_done),
        tricky: Boolean(r.tricky_clicked),
        mistake_pick: Boolean(r.mistake_pick_done),
      },
    }));

    // `lessons` (sorted names) kept for backward compatibility.
    const lessons = lessonRows.map((r) => r.lessonNumber).sort();

    return NextResponse.json({ lessons, lessonRows });
  } catch (err) {
    console.error('Lessons fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
