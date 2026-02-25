import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getOrGenerateWordSet } from '@/lib/claude';
import { getOrCreateSession } from '@/lib/session';
import { initDb } from '@/lib/db-init';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const sessionId = await getOrCreateSession();
    const body = await req.json().catch(() => ({}));
    const difficulty = (body as { difficulty?: string }).difficulty;

    // Pick up to 5 random words by difficulty
    let rows;
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      rows = await sql`
        SELECT id, word FROM words
        WHERE difficulty = ${difficulty}
        ORDER BY RANDOM()
        LIMIT 5
      `;
    } else {
      rows = await sql`
        SELECT id, word FROM words
        ORDER BY RANDOM()
        LIMIT 5
      `;
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No words found. Please upload a word list first.' },
        { status: 404 }
      );
    }

    const wordIds = rows.map((r) => Number(r.id));
    const words = rows.map((r) => r.word as string);

    const { wordSetId, questions } = await getOrGenerateWordSet(wordIds, words);

    return NextResponse.json({ sessionId, wordSetId, words, questions });
  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }
}
