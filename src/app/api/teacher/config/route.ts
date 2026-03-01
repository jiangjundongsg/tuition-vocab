import { NextRequest, NextResponse } from 'next/server';
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

    const rows = await sql`
      SELECT num_comprehension, num_blanks, blank_zipf_max, passage_word_count, comp_question_type
      FROM question_config WHERE id = 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({
        numComprehension: 2,
        numBlanks: 5,
        blankZipfMax: 4.2,
        passageWordCount: 150,
        compQuestionType: 'mcq',
      });
    }
    return NextResponse.json({
      numComprehension: Number(rows[0].num_comprehension),
      numBlanks: Number(rows[0].num_blanks),
      blankZipfMax: Number(rows[0].blank_zipf_max),
      passageWordCount: Number(rows[0].passage_word_count) || 150,
      compQuestionType: (rows[0].comp_question_type as string) || 'mcq',
    });
  } catch (err) {
    console.error('Config GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { numComprehension, numBlanks, blankZipfMax, passageWordCount, compQuestionType } = await req.json() as {
      numComprehension?: number;
      numBlanks?: number;
      blankZipfMax?: number;
      passageWordCount?: number;
      compQuestionType?: string;
    };

    const numComp   = Math.min(Math.max(Number(numComprehension) || 2, 1), 4);
    const nBlanks   = Math.min(Math.max(Number(numBlanks) || 5, 1), 10);
    const zipfMax   = Math.min(Math.max(Number(blankZipfMax) || 4.2, 2.0), 7.0);
    const wordCount = Math.min(Math.max(Number(passageWordCount) || 150, 50), 400);
    const qType     = ['mcq', 'true_false', 'mixed'].includes(compQuestionType ?? '')
      ? compQuestionType!
      : 'mcq';

    await sql`
      INSERT INTO question_config (id, num_comprehension, num_blanks, blank_zipf_max, passage_word_count, comp_question_type, updated_at)
      VALUES (1, ${numComp}, ${nBlanks}, ${zipfMax}, ${wordCount}, ${qType}, NOW())
      ON CONFLICT (id) DO UPDATE
        SET num_comprehension  = EXCLUDED.num_comprehension,
            num_blanks         = EXCLUDED.num_blanks,
            blank_zipf_max     = EXCLUDED.blank_zipf_max,
            passage_word_count = EXCLUDED.passage_word_count,
            comp_question_type = EXCLUDED.comp_question_type,
            updated_at         = NOW()
    `;

    // Clear word_sets cache so next practice uses new config
    await sql`DELETE FROM word_sets`.catch(() => {});

    return NextResponse.json({
      numComprehension: numComp,
      numBlanks: nBlanks,
      blankZipfMax: zipfMax,
      passageWordCount: wordCount,
      compQuestionType: qType,
    });
  } catch (err) {
    console.error('Config PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
