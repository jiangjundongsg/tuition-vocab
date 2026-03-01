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

    return NextResponse.json({
      numComprehension: user.numComprehension,
      numBlanks:        user.numBlanks,
      blankZipfMax:     user.blankZipfMax,
      passageWordCount: user.passageWordCount,
      compQuestionType: user.compQuestionType,
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
      UPDATE users
      SET num_comprehension  = ${numComp},
          num_blanks         = ${nBlanks},
          blank_zipf_max     = ${zipfMax},
          passage_word_count = ${wordCount},
          comp_question_type = ${qType}
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      numComprehension: numComp,
      numBlanks:        nBlanks,
      blankZipfMax:     zipfMax,
      passageWordCount: wordCount,
      compQuestionType: qType,
    });
  } catch (err) {
    console.error('Config PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
