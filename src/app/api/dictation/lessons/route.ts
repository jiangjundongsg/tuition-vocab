import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await sql`
      SELECT DISTINCT lesson_number FROM words
      WHERE user_id = ${user.id} AND lesson_number IS NOT NULL
      ORDER BY lesson_number ASC
    `;

    return NextResponse.json({ lessons: rows.map((r) => r.lesson_number as string) });
  } catch (err) {
    console.error('Dictation lessons error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
