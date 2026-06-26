import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

// Teacher (or admin) creates one or more students under themselves. Created
// students are immediately 'approved' (the teacher made them).
export async function POST(req: NextRequest) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const body = (await req.json()) as {
      students?: Array<{ username?: string; displayName?: string; password?: string; age?: number }>;
    };
    const list = Array.isArray(body.students) ? body.students : [];
    if (list.length === 0) {
      return NextResponse.json({ error: 'No students provided' }, { status: 400 });
    }

    let created = 0;
    const skipped: string[] = [];

    for (const s of list) {
      const username = String(s.username ?? '').trim();
      const password = String(s.password ?? '').trim();
      if (!username || password.length < 6) { skipped.push(username || '(unnamed)'); continue; }

      const taken = await sql`SELECT 1 FROM users WHERE lower(username) = ${username.toLowerCase()} LIMIT 1`;
      if (taken.length > 0) { skipped.push(username); continue; }

      const hash = await bcrypt.hash(password, 10);
      const age = typeof s.age === 'number' && s.age > 0 ? s.age : null;
      // Age-based defaults: ≤7 simpler, >7 standard
      const junior = age != null && age <= 7;
      await sql`
        INSERT INTO users (username, password_hash, display_name, role, status, teacher_id, age,
          num_comprehension, num_blanks, blank_zipf_max, passage_word_count)
        VALUES (${username}, ${hash}, ${String(s.displayName ?? '').trim() || null}, 'student', 'approved', ${user.id}, ${age},
          ${junior ? 1 : 2}, ${junior ? 3 : 5}, ${junior ? 3.5 : 4.2}, ${junior ? 80 : 150})
      `;
      created++;
    }

    return NextResponse.json({ created, skipped });
  } catch (err) {
    console.error('Create students error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
