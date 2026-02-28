import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { scoreWords } from '@/lib/wordfreq';

export async function POST(req: NextRequest) {
  try {
    await initDb();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const body = await req.json();
    const { words: wordList } = body as { words: string };

    if (!wordList || typeof wordList !== 'string') {
      return NextResponse.json({ error: 'words field is required' }, { status: 400 });
    }

    // Parse CSV format: each line is "lesson_number,word" (e.g. "1A,curious")
    // Also supports plain "word" lines without lesson number
    const lines = wordList.split(/\n/);
    const wordEntries: Array<{ word: string; lessonNumber: string | null }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check CSV format: "lesson_number,word"
      const csvMatch = trimmed.match(/^([^,]+),(.+)$/);
      if (csvMatch) {
        const lessonNumber = csvMatch[1].trim();
        const wordPart = csvMatch[2]
          .trim()
          .toLowerCase()
          .replace(/[^a-z'-]/g, '');
        if (wordPart.length > 1) {
          wordEntries.push({ word: wordPart, lessonNumber: lessonNumber || null });
        }
      } else {
        // Plain word (no lesson number)
        const word = trimmed.toLowerCase().replace(/[^a-z'-]/g, '');
        if (word.length > 1) {
          wordEntries.push({ word, lessonNumber: null });
        }
      }
    }

    // Deduplicate (keep last occurrence to preserve lesson number)
    const seen = new Map<string, string | null>();
    for (const { word, lessonNumber } of wordEntries) {
      seen.set(word, lessonNumber);
    }

    if (seen.size === 0) {
      return NextResponse.json({ error: 'No valid words found' }, { status: 400 });
    }

    const uniqueWords = [...seen.keys()];
    const scored = scoreWords(uniqueWords);

    const inserted: Array<{
      word: string;
      zipf: number | null;
      difficulty: string;
      lessonNumber: string | null;
    }> = [];
    const skipped: string[] = [];

    for (const { word, zipf, difficulty } of scored) {
      const lessonNumber = seen.get(word) ?? null;
      try {
        await sql`
          INSERT INTO words (word, zipf_score, difficulty, lesson_number)
          VALUES (${word}, ${zipf}, ${difficulty}, ${lessonNumber})
          ON CONFLICT (word) DO UPDATE
            SET zipf_score    = EXCLUDED.zipf_score,
                difficulty    = EXCLUDED.difficulty,
                lesson_number = COALESCE(EXCLUDED.lesson_number, words.lesson_number)
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
