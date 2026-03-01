import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { lesson } = await req.json() as { lesson?: string };
    if (!lesson) return NextResponse.json({ error: 'Missing lesson' }, { status: 400 });

    await sql`UPDATE users SET last_lesson = ${lesson} WHERE id = ${user.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('last-lesson POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
