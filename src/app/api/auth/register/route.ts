import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { setUserCookie } from '@/lib/auth';

const TEACHER_CODE = process.env.TEACHER_CODE ?? 'VOCAB_TEACHER';

interface NewStudent {
  username?: string;
  displayName?: string;
  password?: string;
  age?: number;
}

const norm = (s: unknown) => String(s ?? '').trim();
const ageOf = (a: unknown) => (typeof a === 'number' && a > 0 ? a : null);

/** Insert a student under `teacherId`. Returns the new id, or null if the
 *  username/email is already taken. Throws on unexpected errors. */
async function createStudent(
  teacherId: number,
  username: string,
  password: string,
  displayName: string | null,
  age: number | null,
  email: string | null,
): Promise<number | null> {
  const taken = await sql`
    SELECT 1 FROM users
    WHERE lower(username) = ${username.toLowerCase()}
       OR (${email}::text IS NOT NULL AND email = ${email})
    LIMIT 1
  `;
  if (taken.length > 0) return null;

  const hash = await bcrypt.hash(password, 10);
  const rows = await sql`
    INSERT INTO users (email, username, password_hash, display_name, role, status, teacher_id, age)
    VALUES (${email}, ${username}, ${hash}, ${displayName}, 'student', 'approved', ${teacherId}, ${age})
    RETURNING id
  `;
  return Number(rows[0].id);
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = (await req.json()) as {
      role?: string;
      email?: string;
      username?: string;
      password?: string;
      displayName?: string;
      age?: number;
      teacherCode?: string;
      teacherId?: number;
      students?: NewStudent[];
    };

    const password = norm(body.password);
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const displayName = norm(body.displayName) || null;
    const age = ageOf(body.age);

    const wantsTeacher = body.role === 'teacher' || norm(body.teacherCode).length > 0;

    // ── Teacher signup (optionally creating students at the same time) ────────
    if (wantsTeacher) {
      if (norm(body.teacherCode) !== TEACHER_CODE) {
        return NextResponse.json({ error: 'Invalid teacher code' }, { status: 403 });
      }
      const emailLower = norm(body.email).toLowerCase();
      if (!emailLower) {
        return NextResponse.json({ error: 'Email is required for a teacher account' }, { status: 400 });
      }

      const existing = await sql`SELECT 1 FROM users WHERE email = ${emailLower} LIMIT 1`;
      if (existing.length > 0) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }

      const hash = await bcrypt.hash(password, 10);
      const rows = await sql`
        INSERT INTO users (email, password_hash, display_name, role, status, age)
        VALUES (${emailLower}, ${hash}, ${displayName}, 'teacher', 'approved', ${age})
        RETURNING id, email, display_name, role
      `;
      const teacher = rows[0];
      const teacherId = Number(teacher.id);

      // Optional batch of students
      const skipped: string[] = [];
      let created = 0;
      for (const s of Array.isArray(body.students) ? body.students : []) {
        const uname = norm(s.username);
        const pw = norm(s.password);
        if (!uname || pw.length < 6) { if (uname || pw) skipped.push(uname || '(unnamed)'); continue; }
        const id = await createStudent(teacherId, uname, pw, norm(s.displayName) || null, ageOf(s.age), null);
        if (id) created++; else skipped.push(uname);
      }

      await setUserCookie(teacherId);
      return NextResponse.json({
        user: { id: teacherId, email: teacher.email, displayName: teacher.display_name, role: 'teacher' },
        createdStudents: created,
        skippedStudents: skipped,
      });
    }

    // ── Student self-registration (pending teacher approval) ──────────────────
    const teacherId = Number(body.teacherId);
    if (!teacherId || isNaN(teacherId)) {
      return NextResponse.json({ error: "Your teacher's ID is required to sign up as a student" }, { status: 400 });
    }
    const teacherRows = await sql`
      SELECT 1 FROM users WHERE id = ${teacherId} AND role IN ('teacher', 'admin') LIMIT 1
    `;
    if (teacherRows.length === 0) {
      return NextResponse.json({ error: 'No teacher found with that ID. Please check with your teacher.' }, { status: 400 });
    }

    const username = norm(body.username);
    if (!username) {
      return NextResponse.json({ error: 'A username is required' }, { status: 400 });
    }
    const emailLower = norm(body.email).toLowerCase() || null;

    const taken = await sql`
      SELECT 1 FROM users
      WHERE lower(username) = ${username.toLowerCase()}
         OR (${emailLower}::text IS NOT NULL AND email = ${emailLower})
      LIMIT 1
    `;
    if (taken.length > 0) {
      return NextResponse.json({ error: 'That username or email is already taken' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const rows = await sql`
      INSERT INTO users (email, username, password_hash, display_name, role, status, teacher_id, age)
      VALUES (${emailLower}, ${username}, ${hash}, ${displayName}, 'student', 'pending', ${teacherId}, ${age})
      RETURNING id, email, username, display_name, role, status
    `;
    const student = rows[0];
    await setUserCookie(Number(student.id));

    return NextResponse.json({
      user: {
        id: Number(student.id),
        email: student.email,
        username: student.username,
        displayName: student.display_name,
        role: 'student',
        status: 'pending',
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
