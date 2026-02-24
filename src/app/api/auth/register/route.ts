import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { setUserCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { email, password, displayName } = await req.json() as {
      email: string;
      password: string;
      displayName?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${emailLower}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const name = displayName?.trim() || null;

    const rows = await sql`
      INSERT INTO users (email, password_hash, display_name)
      VALUES (${emailLower}, ${passwordHash}, ${name})
      RETURNING id, email, display_name
    `;

    const user = rows[0];
    await setUserCookie(Number(user.id));

    return NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.display_name },
    });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
