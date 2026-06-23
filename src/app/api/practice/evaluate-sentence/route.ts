/**
 * POST /api/practice/evaluate-sentence
 * Body: { word, sentence, age }
 * Calls DeepSeek to evaluate the student's sentence and returns feedback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { initDb } from '@/lib/db-init';
import { evaluateSentence } from '@/lib/deepseek';
import { DAILY_AI_LIMIT, checkAiQuota, incrementAiQuota } from '@/lib/quota';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
    await initDb();

    const { word, sentence, age } = await request.json();
    if (!word || !sentence) return NextResponse.json({ error: 'Missing word or sentence' }, { status: 400 });

    // Check daily AI quota
    try {
      await checkAiQuota(user.id);
    } catch {
      return NextResponse.json(
        { error: `Daily AI limit reached (${DAILY_AI_LIMIT} calls). Try again tomorrow.` },
        { status: 429 },
      );
    }

    const feedback = await evaluateSentence(word, sentence, age ?? 10);

    await incrementAiQuota(user.id, 1);

    return NextResponse.json(feedback);
  } catch (err) {
    console.error('Evaluate sentence error:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Evaluation failed', detail }, { status: 500 });
  }
}
