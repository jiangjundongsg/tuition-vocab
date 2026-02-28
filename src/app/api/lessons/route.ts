import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';

export async function GET() {
  try {
    await initDb();

    const rows = await sql`
      SELECT DISTINCT lesson_number
      FROM words
      WHERE lesson_number IS NOT NULL
      ORDER BY lesson_number ASC
    `;

    const lessons = rows.map((r) => r.lesson_number as string);
    return NextResponse.json({ lessons });
  } catch (err) {
    console.error('Lessons fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
