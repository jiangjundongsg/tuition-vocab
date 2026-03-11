import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { extractWordsFromImage } from '@/lib/claude';
import { scoreWords } from '@/lib/wordfreq';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

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
    const { image, mediaType, targetUserIds } = body as {
      image: string;
      mediaType: string;
      targetUserIds: number[];
    };

    if (!image) return NextResponse.json({ error: 'image (base64) is required' }, { status: 400 });
    if (!targetUserIds || targetUserIds.length === 0) {
      return NextResponse.json({ error: 'targetUserIds is required' }, { status: 400 });
    }

    const mt = (mediaType || 'image/jpeg') as AllowedType;
    if (!ALLOWED_TYPES.includes(mt)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    const extractedWords = await extractWordsFromImage(image, mt);
    if (extractedWords.length === 0) {
      return NextResponse.json({ error: 'No vocabulary words found in image' }, { status: 400 });
    }

    const userRows = await sql`SELECT id, display_name FROM users WHERE id = ANY(${targetUserIds}::int[])`;
    if (userRows.length === 0) {
      return NextResponse.json({ error: 'No valid target users found' }, { status: 400 });
    }

    const uniqueWords = [...new Set(extractedWords)];
    const scored = scoreWords(uniqueWords);

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const targetUser of userRows) {
      const targetId = Number(targetUser.id);
      const displayName = (targetUser.display_name as string) || String(targetId);
      const lessonNumber = `${displayName} ${todayYYMMDD()}`;

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

    return NextResponse.json({ inserted: totalInserted, skipped: totalSkipped, words: extractedWords });
  } catch (err) {
    console.error('Photo upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
