import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { generateMistakePickQuestions, MistakePickSet } from '@/lib/deepseek';
import { checkAiQuota, incrementAiQuota } from '@/lib/quota';

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const lesson = searchParams.get('lesson');
    if (!lesson) return NextResponse.json({ error: 'Missing lesson parameter' }, { status: 400 });

    // Check cache — stored per (user_id, lesson_number)
    const cached = await sql`
      SELECT questions_json FROM mistake_pick_sets
      WHERE user_id = ${user.id} AND lesson_number = ${lesson}
      LIMIT 1
    `;

    if (cached.length > 0 && cached[0].questions_json) {
      const questions = JSON.parse(cached[0].questions_json as string) as MistakePickSet;
      return NextResponse.json(questions);
    }

    // Fetch words for this lesson
    const words = await sql`
      SELECT word FROM words
      WHERE user_id = ${user.id} AND lesson_number = ${lesson}
      ORDER BY id ASC
    `;

    if (words.length === 0) {
      return NextResponse.json({ error: 'No words found for this lesson' }, { status: 404 });
    }

    // Check quota
    await checkAiQuota(user.id);

    // Generate
    const qs = await generateMistakePickQuestions(
      words.map((r) => ({ word: r.word as string })),
      lesson,
      user.age ?? 10,
    );

    await incrementAiQuota(user.id, 1);

    // Cache
    await sql`
      INSERT INTO mistake_pick_sets (user_id, lesson_number, questions_json)
      VALUES (${user.id}, ${lesson}, ${JSON.stringify(qs)})
      ON CONFLICT (user_id, lesson_number) DO UPDATE
        SET questions_json = EXCLUDED.questions_json, updated_at = NOW()
    `;

    return NextResponse.json(qs);
  } catch (err) {
    console.error('Mistake-pick error:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Internal server error', detail }, { status: 500 });
  }
}
