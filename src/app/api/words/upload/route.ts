import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { scoreWords } from '@/lib/wordfreq';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { words: wordList } = body as { words: string };

    if (!wordList || typeof wordList !== 'string') {
      return NextResponse.json({ error: 'words field is required' }, { status: 400 });
    }

    // Parse: split by newlines, commas, or spaces; clean up
    const rawWords = wordList
      .split(/[\n,\s]+/)
      .map((w) => w.trim().toLowerCase().replace(/[^a-z'-]/g, ''))
      .filter((w) => w.length > 1);

    const uniqueWords = [...new Set(rawWords)];

    if (uniqueWords.length === 0) {
      return NextResponse.json({ error: 'No valid words found' }, { status: 400 });
    }

    const scored = scoreWords(uniqueWords);

    const inserted: typeof scored = [];
    const skipped: string[] = [];

    for (const { word, zipf, difficulty } of scored) {
      try {
        await sql`
          INSERT INTO words (word, zipf_score, difficulty)
          VALUES (${word}, ${zipf}, ${difficulty})
          ON CONFLICT (word) DO UPDATE
            SET zipf_score = EXCLUDED.zipf_score,
                difficulty = EXCLUDED.difficulty
        `;
        inserted.push({ word, zipf, difficulty });
      } catch {
        skipped.push(word);
      }
    }

    return NextResponse.json({
      inserted: inserted.length,
      skipped: skipped.length,
      words: inserted,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
