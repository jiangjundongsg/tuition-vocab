/**
 * POST /api/practice/evaluate-sentence
 * Body: { word, sentence, age }
 * Calls DeepSeek to evaluate the student's sentence and returns feedback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { initDb } from '@/lib/db-init';
import { evaluateSentence } from '@/lib/deepseek';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
    await initDb();

    const { word, sentence, age } = await request.json();
    if (!word || !sentence) return NextResponse.json({ error: 'Missing word or sentence' }, { status: 400 });

    // Check daily AI quota
    const today = new Date().toISOString().slice(0, 10);
    const rows = await sql`SELECT ai_calls_today, ai_date FROM users WHERE id = ${user.id}`;
    const calls = Number(rows[0]?.ai_calls_today ?? 0);
    const date = (rows[0]?.ai_date as string | null) ?? '';
    const effective = date === today ? calls : 0;
    if (effective >= 50) {
      return NextResponse.json({ error: 'Daily AI limit reached' }, { status: 429 });
    }

    const feedback = await evaluateSentence(word, sentence, age ?? 10);

    // Increment AI quota
    await sql`
      UPDATE users SET
        ai_calls_today = CASE WHEN ai_date = ${today} THEN ai_calls_today + 1 ELSE 1 END,
        ai_date = ${today}
      WHERE id = ${user.id}
    `;

    return NextResponse.json(feedback);
  } catch (err) {
    console.error('Evaluate sentence error:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Evaluation failed', detail }, { status: 500 });
  }
}
