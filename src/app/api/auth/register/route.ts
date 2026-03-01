import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { setUserCookie } from '@/lib/auth';

const TEACHER_CODE = process.env.TEACHER_CODE ?? 'VOCAB_TEACHER';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { email, password, displayName, teacherCode, age } = await req.json() as {
      email: string;
      password: string;
      displayName?: string;
      teacherCode?: string;
      age?: number;
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    const existing = await sql`SELECT id FROM users WHERE email = ${emailLower}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const role = teacherCode?.trim() === TEACHER_CODE ? 'teacher' : 'student';
    const passwordHash = await bcrypt.hash(password, 10);
    const name = displayName?.trim() || null;
    const ageVal = typeof age === 'number' && age > 0 ? age : null;

    const rows = await sql`
      INSERT INTO users (email, password_hash, display_name, role, age)
      VALUES (${emailLower}, ${passwordHash}, ${name}, ${role}, ${ageVal})
      RETURNING id, email, display_name, role, age
    `;

    const user = rows[0];
    await setUserCookie(Number(user.id));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        age: user.age,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
