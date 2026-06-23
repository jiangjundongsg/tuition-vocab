import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    // Teachers see only their own students; admin sees everyone.
    const isAdmin = user.role === 'admin';
    const rows = isAdmin
      ? await sql`
          SELECT id, email, username, display_name, role, status, teacher_id, age, last_lesson, passage_source,
                 num_comprehension, num_blanks, blank_zipf_max, passage_word_count, comp_question_type,
                 enable_mcq_meaning, enable_mcq_synonym, enable_mcq_antonym,
                 enable_comprehension, enable_fill_blank, enable_sentence_writing,
                 created_at
          FROM users ORDER BY created_at ASC
        `
      : await sql`
          SELECT id, email, username, display_name, role, status, teacher_id, age, last_lesson, passage_source,
                 num_comprehension, num_blanks, blank_zipf_max, passage_word_count, comp_question_type,
                 enable_mcq_meaning, enable_mcq_synonym, enable_mcq_antonym,
                 enable_comprehension, enable_fill_blank, enable_sentence_writing,
                 created_at
          FROM users WHERE teacher_id = ${user.id} ORDER BY created_at ASC
        `;

    return NextResponse.json({
      users: rows.map((r) => ({
        id: Number(r.id),
        email: r.email as string | null,
        username: r.username as string | null,
        displayName: r.display_name as string | null,
        role: r.role as string,
        status: (r.status as string) ?? 'approved',
        teacherId: r.teacher_id != null ? Number(r.teacher_id) : null,
        age: r.age != null ? Number(r.age) : null,
        lastLesson: r.last_lesson as string | null,
        passageSource: (r.passage_source as string) || 'TextBook_Harry_Portter',
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
        enableSentenceWriting: r.enable_sentence_writing === true,
        createdAt: r.created_at as string,
      })),
    });
  } catch (err) {
    console.error('Users GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
