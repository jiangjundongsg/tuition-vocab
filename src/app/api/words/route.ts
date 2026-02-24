import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get('difficulty');

    let rows;
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      rows = await sql`
        SELECT id, word, zipf_score, difficulty, created_at
        FROM words
        WHERE difficulty = ${difficulty}
        ORDER BY word ASC
      `;
    } else {
      rows = await sql`
        SELECT id, word, zipf_score, difficulty, created_at
        FROM words
        ORDER BY word ASC
      `;
    }

    return NextResponse.json({ words: rows });
  } catch (err) {
    console.error('Words fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
