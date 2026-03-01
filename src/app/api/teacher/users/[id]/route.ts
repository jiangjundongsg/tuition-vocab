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
      numComprehension?: number;
      numBlanks?: number;
      blankZipfMax?: number;
      passageWordCount?: number;
      compQuestionType?: string;
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

    if (body.numComprehension !== undefined) {
      const v = Math.min(Math.max(Number(body.numComprehension) || 2, 1), 4);
      await sql`UPDATE users SET num_comprehension = ${v} WHERE id = ${targetId}`;
    }
    if (body.numBlanks !== undefined) {
      const v = Math.min(Math.max(Number(body.numBlanks) || 5, 1), 10);
      await sql`UPDATE users SET num_blanks = ${v} WHERE id = ${targetId}`;
    }
    if (body.blankZipfMax !== undefined) {
      const v = Math.min(Math.max(Number(body.blankZipfMax) || 4.2, 2.0), 7.0);
      await sql`UPDATE users SET blank_zipf_max = ${v} WHERE id = ${targetId}`;
    }
    if (body.passageWordCount !== undefined) {
      const v = Math.min(Math.max(Number(body.passageWordCount) || 150, 50), 400);
      await sql`UPDATE users SET passage_word_count = ${v} WHERE id = ${targetId}`;
    }
    if (body.compQuestionType !== undefined) {
      const v = ['mcq', 'true_false', 'mixed'].includes(body.compQuestionType) ? body.compQuestionType : 'mcq';
      await sql`UPDATE users SET comp_question_type = ${v} WHERE id = ${targetId}`;
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
      SELECT id, email, display_name, role, age, passage_source,
             num_comprehension, num_blanks, blank_zipf_max, passage_word_count, comp_question_type
      FROM users WHERE id = ${targetId}
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
        numComprehension: Number(rows[0].num_comprehension) || 2,
        numBlanks:        Number(rows[0].num_blanks) || 5,
        blankZipfMax:     Number(rows[0].blank_zipf_max) || 4.2,
        passageWordCount: Number(rows[0].passage_word_count) || 150,
        compQuestionType: (rows[0].comp_question_type as string) || 'mcq',
      },
    });
  } catch (err) {
    console.error('User PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
