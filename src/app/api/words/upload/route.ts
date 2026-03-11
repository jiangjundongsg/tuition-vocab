import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { scoreWords } from '@/lib/wordfreq';

function todayYYMMDD(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const body = await req.json();
    const { words: wordList, targetUserIds, lessonNumber: lessonOverride } = body as {
      words: string;
      targetUserIds: number[];
      lessonNumber?: string;
    };

    if (!wordList || typeof wordList !== 'string') {
      return NextResponse.json({ error: 'words field is required' }, { status: 400 });
    }
    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json({ error: 'targetUserIds array is required' }, { status: 400 });
    }

    // Validate target users exist and are students
    const userRows = await sql`SELECT id, display_name FROM users WHERE id = ANY(${targetUserIds}::int[])`;
    if (userRows.length === 0) {
      return NextResponse.json({ error: 'No valid target users found' }, { status: 400 });
    }

    // Parse word list: one word per line (optionally prefixed with lesson label)
    const lines = wordList.split(/\n/);
    const wordEntries: Array<{ word: string; lessonNumber: string | null }> = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const word = trimmed.toLowerCase().replace(/[^a-z'-]/g, '');
      if (word.length > 1) wordEntries.push({ word, lessonNumber: null });
    }

    if (wordEntries.length === 0) {
      return NextResponse.json({ error: 'No valid words found' }, { status: 400 });
    }

    const uniqueWords = [...new Set(wordEntries.map((e) => e.word))];
    const scored = scoreWords(uniqueWords);

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const targetUser of userRows) {
      const targetId = Number(targetUser.id);
      const displayName = (targetUser.display_name as string) || String(targetId);
      const lessonNumber = lessonOverride || `${displayName} ${todayYYMMDD()}`;

      for (const { word, zipf, difficulty } of scored) {
        try {
          await sql`
            INSERT INTO words (word, user_id, zipf_score, difficulty, lesson_number)
            VALUES (${word}, ${targetId}, ${zipf}, ${difficulty}, ${lessonNumber})
            ON CONFLICT (user_id, word) WHERE user_id IS NOT NULL DO UPDATE
              SET zipf_score    = EXCLUDED.zipf_score,
                  difficulty    = EXCLUDED.difficulty,
                  lesson_number = COALESCE(EXCLUDED.lesson_number, words.lesson_number)
          `;
          totalInserted++;
        } catch {
          totalSkipped++;
        }
      }
    }

    return NextResponse.json({ inserted: totalInserted, skipped: totalSkipped });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
