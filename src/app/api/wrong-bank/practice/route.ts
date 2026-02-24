import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getOrCreateSession } from '@/lib/session';
import { getCurrentUser } from '@/lib/auth';
import { weightedRandom, WeightedItem } from '@/lib/weighted-random';

export async function GET() {
  try {
    const user = await getCurrentUser();

    let rows;
    if (user) {
      rows = await sql`
        SELECT
          wb.id,
          wb.question_id,
          wb.question_type,
          wb.wrong_count,
          gq.mcq_json,
          gq.fill_json,
          gq.comprehension_json,
          w.word,
          w.difficulty
        FROM wrong_bank wb
        JOIN generated_questions gq ON wb.question_id = gq.id
        JOIN words w ON gq.word_id = w.id
        WHERE wb.user_id = ${user.id}
          AND wb.wrong_count > 0
        ORDER BY wb.wrong_count DESC
      `;
    } else {
      const sessionId = await getOrCreateSession();
      rows = await sql`
        SELECT
          wb.id,
          wb.question_id,
          wb.question_type,
          wb.wrong_count,
          gq.mcq_json,
          gq.fill_json,
          gq.comprehension_json,
          w.word,
          w.difficulty
        FROM wrong_bank wb
        JOIN generated_questions gq ON wb.question_id = gq.id
        JOIN words w ON gq.word_id = w.id
        WHERE wb.session_id = ${sessionId}
          AND wb.wrong_count > 0
        ORDER BY wb.wrong_count DESC
      `;
    }

    if (rows.length === 0) {
      return NextResponse.json({ item: null, message: 'Wrong bank is empty!' });
    }

    const selected = weightedRandom(
      rows.map((r) => ({ ...r, wrong_count: Number(r.wrong_count) })) as WeightedItem[]
    );

    if (!selected) {
      return NextResponse.json({ item: null });
    }

    const questions = {
      mcq: JSON.parse(selected.mcq_json as string),
      fill: JSON.parse(selected.fill_json as string),
      comprehension: JSON.parse(selected.comprehension_json as string),
    };

    const question =
      selected.question_type === 'mcq'
        ? questions.mcq
        : selected.question_type === 'fill'
        ? questions.fill
        : questions.comprehension;

    return NextResponse.json({
      item: {
        id: selected.id,
        questionId: selected.question_id,
        questionType: selected.question_type,
        wrongCount: selected.wrong_count,
        word: selected.word,
        difficulty: selected.difficulty,
        question,
        allQuestions: questions,
      },
    });
  } catch (err) {
    console.error('Wrong bank practice error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
