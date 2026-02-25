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
        SELECT wb.id, wb.word_set_id, wb.question_key, wb.wrong_count,
               ws.words_json, ws.questions_json
        FROM wrong_bank wb
        JOIN word_sets ws ON wb.word_set_id = ws.id
        WHERE wb.user_id = ${user.id} AND wb.word_set_id IS NOT NULL AND wb.wrong_count > 0
        ORDER BY wb.wrong_count DESC
      `;
    } else {
      const sessionId = await getOrCreateSession();
      rows = await sql`
        SELECT wb.id, wb.word_set_id, wb.question_key, wb.wrong_count,
               ws.words_json, ws.questions_json
        FROM wrong_bank wb
        JOIN word_sets ws ON wb.word_set_id = ws.id
        WHERE wb.session_id = ${sessionId} AND wb.word_set_id IS NOT NULL AND wb.wrong_count > 0
        ORDER BY wb.wrong_count DESC
      `;
    }

    if (rows.length === 0) {
      return NextResponse.json({ item: null, message: 'Wrong bank is empty!' });
    }

    // Weighted random by wrong_count — pick a word_set to re-practice
    const selected = weightedRandom(
      rows.map((r) => ({ ...r, wrong_count: Number(r.wrong_count) })) as WeightedItem[]
    );

    if (!selected) return NextResponse.json({ item: null });

    const words = JSON.parse(selected.words_json as string) as string[];
    const questions = JSON.parse(selected.questions_json as string);

    return NextResponse.json({
      item: {
        wordSetId: Number(selected.word_set_id),
        questionKey: selected.question_key,
        wrongCount: Number(selected.wrong_count),
        words,
        questions,
      },
    });
  } catch (err) {
    console.error('Wrong bank practice error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
