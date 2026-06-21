/**
 * API route for saving / loading / deleting in-progress practice sessions.
 *
 * POST   — upsert session state
 * GET    — load session for resume  (?type=practice&lesson=X)
 * DELETE — clear session when done    (?type=practice&lesson=X)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { initDb } from '@/lib/db-init';
import { saveSession, loadSession, deleteSession } from '@/lib/session-store';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await initDb();

  const body = await request.json();
  await saveSession(user.id, body);
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await initDb();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const lesson = searchParams.get('lesson') || '';
  const session = await loadSession(user.id, type, lesson);
  return NextResponse.json({ session });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await initDb();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const lesson = searchParams.get('lesson') || '';
  await deleteSession(user.id, type, lesson);
  return NextResponse.json({ ok: true });
}
