import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getOrGenerateQuestions } from '@/lib/claude';
import { getOrCreateSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getOrCreateSession();
    const body = await req.json().catch(() => ({}));
    const difficulty = (body as { difficulty?: string }).difficulty;

    // Pick a random word by difficulty
    let rows;
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      rows = await sql`
        SELECT id, word FROM words
        WHERE difficulty = ${difficulty}
        ORDER BY RANDOM()
        LIMIT 1
      `;
    } else {
      rows = await sql`
        SELECT id, word FROM words
        ORDER BY RANDOM()
        LIMIT 1
      `;
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No words found. Please upload a word list first.' },
        { status: 404 }
      );
    }

    const wordId = Number(rows[0].id);
    const word = rows[0].word as string;
    const { questionId, questions } = await getOrGenerateQuestions(wordId, word);

    return NextResponse.json({
      sessionId,
      wordId,
      word,
      questionId,
      questions,
    });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }
}
