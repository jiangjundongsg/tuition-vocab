import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { setUserCookie } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  // Accept either the new `identifier` field or the legacy `email` field.
  identifier: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = loginSchema.parse(await req.json());
    const identifier = (body.identifier ?? body.email ?? '').toLowerCase().trim();
    if (!identifier) {
      return NextResponse.json({ error: 'Email or username is required' }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, email, username, password_hash, display_name
      FROM users
      WHERE lower(email) = ${identifier} OR lower(username) = ${identifier}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Incorrect username/email or password' }, { status: 401 });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(body.password, user.password_hash as string);

    if (!valid) {
      return NextResponse.json({ error: 'Incorrect username/email or password' }, { status: 401 });
    }

    await setUserCookie(Number(user.id));

    return NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username, displayName: user.display_name },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
