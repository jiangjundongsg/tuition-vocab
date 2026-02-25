import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { scoreWords } from '@/lib/wordfreq';

export async function POST(req: NextRequest) {
  try {
    await initDb();

    // Teacher/admin only
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const body = await req.json();
    const { words: wordList } = body as { words: string };

    if (!wordList || typeof wordList !== 'string') {
      return NextResponse.json({ error: 'words field is required' }, { status: 400 });
    }

    // Parse: each line may be "lesson_number word" (e.g. "1 cat") or just "word"
    // Also handles comma-separated words (no lesson number)
    const lines = wordList.split(/\n/);
    const wordEntries: Array<{ word: string; lessonNumber: number | null }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check "N word" pattern — lesson number followed by the word
      const lessonMatch = trimmed.match(/^(\d+)\s+(.+)$/);
      if (lessonMatch) {
        const lessonNumber = parseInt(lessonMatch[1]);
        // The rest of the line may contain multiple words
        const wordsOnLine = lessonMatch[2]
          .split(/[\s,]+/)
          .map((w) => w.trim().toLowerCase().replace(/[^a-z'-]/g, ''))
          .filter((w) => w.length > 1);
        for (const word of wordsOnLine) {
          wordEntries.push({ word, lessonNumber });
        }
      } else {
        // No lesson number — split by commas or spaces
        const wordsOnLine = trimmed
          .split(/[\s,]+/)
          .map((w) => w.trim().toLowerCase().replace(/[^a-z'-]/g, ''))
          .filter((w) => w.length > 1);
        for (const word of wordsOnLine) {
          wordEntries.push({ word, lessonNumber: null });
        }
      }
    }

    // Deduplicate (keep last occurrence to preserve lesson number)
    const seen = new Map<string, number | null>();
    for (const { word, lessonNumber } of wordEntries) {
      seen.set(word, lessonNumber);
    }

    if (seen.size === 0) {
      return NextResponse.json({ error: 'No valid words found' }, { status: 400 });
    }

    const uniqueWords = [...seen.keys()];
    const scored = scoreWords(uniqueWords);

    const inserted: Array<{ word: string; zipf: number | null; difficulty: string; lessonNumber: number | null }> = [];
    const skipped: string[] = [];

    for (const { word, zipf, difficulty } of scored) {
      const lessonNumber = seen.get(word) ?? null;
      try {
        await sql`
          INSERT INTO words (word, zipf_score, difficulty, lesson_number)
          VALUES (${word}, ${zipf}, ${difficulty}, ${lessonNumber})
          ON CONFLICT (word) DO UPDATE
            SET zipf_score     = EXCLUDED.zipf_score,
                difficulty     = EXCLUDED.difficulty,
                lesson_number  = COALESCE(EXCLUDED.lesson_number, words.lesson_number)
        `;
        inserted.push({ word, zipf, difficulty, lessonNumber });
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
