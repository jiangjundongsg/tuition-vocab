import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonNumber: string }> }
) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { lessonNumber } = await params;

    const rows = await sql`
      SELECT id, word FROM words
      WHERE user_id = ${user.id} AND lesson_number = ${decodeURIComponent(lessonNumber)}
      ORDER BY word ASC
    `;

    return NextResponse.json({ words: rows.map((r) => ({ id: Number(r.id), word: r.word as string })) });
  } catch (err) {
    console.error('Dictation words error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
