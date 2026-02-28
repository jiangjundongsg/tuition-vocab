import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

function decodeQuestionKey(key: string): string {
  switch (key) {
    case 'mcq':        return 'Word Meaning (MCQ)';
    case 'comp_0':     return 'Comprehension Q1';
    case 'comp_1':     return 'Comprehension Q2';
    case 'fill_blank': return 'Fill in the Blank';
    case 'dictation':  return 'Dictation';
    default:           return key;
  }
}

export async function GET(req: NextRequest) {
  try {
    await initDb();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lesson = searchParams.get('lesson');

    let rows;
    if (lesson) {
      rows = await sql`
        SELECT wb.id, wb.word_set_id, wb.question_key, wb.wrong_count, wb.last_wrong_at,
               ws.word_id, w.word, w.lesson_number
        FROM wrong_bank wb
        JOIN word_sets ws ON wb.word_set_id = ws.id
        JOIN words w ON ws.word_id = w.id
        WHERE wb.user_id = ${user.id}
          AND wb.word_set_id IS NOT NULL
          AND w.lesson_number = ${lesson}
        ORDER BY wb.wrong_count DESC, wb.last_wrong_at DESC
      `;
    } else {
      rows = await sql`
        SELECT wb.id, wb.word_set_id, wb.question_key, wb.wrong_count, wb.last_wrong_at,
               ws.word_id, w.word, w.lesson_number
        FROM wrong_bank wb
        JOIN word_sets ws ON wb.word_set_id = ws.id
        JOIN words w ON ws.word_id = w.id
        WHERE wb.user_id = ${user.id}
          AND wb.word_set_id IS NOT NULL
        ORDER BY wb.wrong_count DESC, wb.last_wrong_at DESC
      `;
    }

    const items = rows.map((row) => ({
      id: Number(row.id),
      wordSetId: Number(row.word_set_id),
      wordId: Number(row.word_id),
      word: row.word as string,
      lessonNumber: row.lesson_number as string | null,
      questionKey: row.question_key as string,
      typeLabel: decodeQuestionKey(row.question_key as string),
      wrongCount: Number(row.wrong_count),
      lastWrongAt: row.last_wrong_at,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error('Wrong bank fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
