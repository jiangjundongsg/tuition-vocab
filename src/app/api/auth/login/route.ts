import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { setUserCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { email, password } = await req.json() as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    const rows = await sql`
      SELECT id, email, password_hash, display_name
      FROM users
      WHERE email = ${emailLower}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash as string);

    if (!valid) {
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 });
    }

    await setUserCookie(Number(user.id));

    return NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.display_name },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
