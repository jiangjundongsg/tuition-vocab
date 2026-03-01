import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { id: idStr } = await params;
    const targetId = parseInt(idStr);
    if (isNaN(targetId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await req.json() as {
      displayName?: string;
      age?: number | null;
      passageSource?: string;
      password?: string;
    };

    // Build update fields
    const updates: string[] = [];

    if (body.displayName !== undefined) {
      const name = body.displayName.trim() || null;
      await sql`UPDATE users SET display_name = ${name} WHERE id = ${targetId}`;
    }

    if (body.age !== undefined) {
      const ageVal = body.age != null && Number(body.age) > 0 ? Number(body.age) : null;
      await sql`UPDATE users SET age = ${ageVal} WHERE id = ${targetId}`;
    }

    if (body.passageSource !== undefined) {
      const src = body.passageSource.trim() || 'TextBook_Harry_Portter';
      await sql`UPDATE users SET passage_source = ${src} WHERE id = ${targetId}`;
    }

    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      const hash = await bcrypt.hash(body.password, 10);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${targetId}`;
    }

    // Suppress unused variable warning
    void updates;

    const rows = await sql`
      SELECT id, email, display_name, role, age, passage_source FROM users WHERE id = ${targetId}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: Number(rows[0].id),
        email: rows[0].email,
        displayName: rows[0].display_name,
        role: rows[0].role,
        age: rows[0].age != null ? Number(rows[0].age) : null,
        passageSource: rows[0].passage_source,
      },
    });
  } catch (err) {
    console.error('User PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
