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
    if (isNaN(targetId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

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
      enableMcqMeaning?: boolean;
      enableMcqSynonym?: boolean;
      enableMcqAntonym?: boolean;
      enableComprehension?: boolean;
      enableFillBlank?: boolean;
    };

    if (body.displayName !== undefined) {
      await sql`UPDATE users SET display_name = ${body.displayName.trim() || null} WHERE id = ${targetId}`;
    }
    if (body.age !== undefined) {
      const ageVal = body.age != null && Number(body.age) > 0 ? Number(body.age) : null;
      await sql`UPDATE users SET age = ${ageVal} WHERE id = ${targetId}`;
    }
    if (body.passageSource !== undefined) {
      await sql`UPDATE users SET passage_source = ${body.passageSource.trim() || 'TextBook_Harry_Portter'} WHERE id = ${targetId}`;
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
    if (body.enableMcqMeaning !== undefined) {
      await sql`UPDATE users SET enable_mcq_meaning = ${!!body.enableMcqMeaning} WHERE id = ${targetId}`;
    }
    if (body.enableMcqSynonym !== undefined) {
      await sql`UPDATE users SET enable_mcq_synonym = ${!!body.enableMcqSynonym} WHERE id = ${targetId}`;
    }
    if (body.enableMcqAntonym !== undefined) {
      await sql`UPDATE users SET enable_mcq_antonym = ${!!body.enableMcqAntonym} WHERE id = ${targetId}`;
    }
    if (body.enableComprehension !== undefined) {
      await sql`UPDATE users SET enable_comprehension = ${!!body.enableComprehension} WHERE id = ${targetId}`;
    }
    if (body.enableFillBlank !== undefined) {
      await sql`UPDATE users SET enable_fill_blank = ${!!body.enableFillBlank} WHERE id = ${targetId}`;
    }
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      const hash = await bcrypt.hash(body.password, 10);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${targetId}`;
    }

    const rows = await sql`
      SELECT id, email, display_name, role, age, passage_source,
             num_comprehension, num_blanks, blank_zipf_max, passage_word_count, comp_question_type,
             enable_mcq_meaning, enable_mcq_synonym, enable_mcq_antonym,
             enable_comprehension, enable_fill_blank
      FROM users WHERE id = ${targetId}
    `;
    if (rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const r = rows[0];

    return NextResponse.json({
      user: {
        id: Number(r.id),
        email: r.email,
        displayName: r.display_name,
        role: r.role,
        age: r.age != null ? Number(r.age) : null,
        passageSource: r.passage_source,
        numComprehension: Number(r.num_comprehension) || 2,
        numBlanks: Number(r.num_blanks) || 5,
        blankZipfMax: Number(r.blank_zipf_max) || 4.2,
        passageWordCount: Number(r.passage_word_count) || 150,
        compQuestionType: (r.comp_question_type as string) || 'mcq',
        enableMcqMeaning: r.enable_mcq_meaning !== false,
        enableMcqSynonym: r.enable_mcq_synonym === true,
        enableMcqAntonym: r.enable_mcq_antonym === true,
        enableComprehension: r.enable_comprehension !== false,
        enableFillBlank: r.enable_fill_blank !== false,
      },
    });
  } catch (err) {
    console.error('User PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
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
    if (isNaN(targetId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

    await sql`DELETE FROM users WHERE id = ${targetId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('User DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
