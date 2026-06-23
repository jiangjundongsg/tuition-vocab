import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { consumeAuthToken } from '@/lib/tokens';

// Complete a password reset with a one-time token.
export async function POST(req: Request) {
  await initDb();
  const { token, password } = await req.json().catch(() => ({}));

  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const userId = await consumeAuthToken(String(token ?? ''), 'reset');
  if (!userId)
    return NextResponse.json({ error: 'This reset link is invalid or has expired. Request a new one.' }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`;
  return NextResponse.json({ ok: true });
}
