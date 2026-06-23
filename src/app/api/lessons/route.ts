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

    const rows = await sql`
      SELECT DISTINCT lesson_number FROM words
      WHERE user_id = ${targetId} AND lesson_number IS NOT NULL
      ORDER BY lesson_number ASC
    `;

    return NextResponse.json({ lessons: rows.map((r) => r.lesson_number as string) });
  } catch (err) {
    console.error('Lessons fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
