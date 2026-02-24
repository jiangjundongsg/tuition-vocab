import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (user) {
      const rows = await sql`
        SELECT
          wb.id,
          wb.question_id,
          wb.question_type,
          wb.wrong_count,
          wb.last_wrong_at,
          w.word,
          w.difficulty
        FROM wrong_bank wb
        JOIN generated_questions gq ON wb.question_id = gq.id
        JOIN words w ON gq.word_id = w.id
        WHERE wb.user_id = ${user.id}
        ORDER BY wb.wrong_count DESC, wb.last_wrong_at DESC
      `;
      return NextResponse.json({ items: rows });
    }

    const sessionId = await getSession();
    if (!sessionId) {
      return NextResponse.json({ items: [] });
    }

    const rows = await sql`
      SELECT
        wb.id,
        wb.question_id,
        wb.question_type,
        wb.wrong_count,
        wb.last_wrong_at,
        w.word,
        w.difficulty
      FROM wrong_bank wb
      JOIN generated_questions gq ON wb.question_id = gq.id
      JOIN words w ON gq.word_id = w.id
      WHERE wb.session_id = ${sessionId}
      ORDER BY wb.wrong_count DESC, wb.last_wrong_at DESC
    `;

    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error('Wrong bank fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
