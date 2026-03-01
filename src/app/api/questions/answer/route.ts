import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const body = await req.json();
    const { wordSetId, questionKey, isCorrect, correctAnswer } = body as {
      wordSetId: number;
      questionKey: string;
      isCorrect: boolean;
      correctAnswer?: string;
    };

    if (!wordSetId || !questionKey) {
      return NextResponse.json({ error: 'wordSetId and questionKey are required' }, { status: 400 });
    }

    if (isCorrect) {
      await sql`
        UPDATE wrong_bank SET wrong_count = wrong_count - 1
        WHERE user_id = ${user.id}
          AND word_set_id = ${wordSetId}
          AND question_key = ${questionKey}
      `;
      await sql`
        DELETE FROM wrong_bank
        WHERE user_id = ${user.id}
          AND word_set_id = ${wordSetId}
          AND question_key = ${questionKey}
          AND wrong_count <= 0
      `;
    } else {
      await sql`
        INSERT INTO wrong_bank (user_id, word_set_id, question_key, wrong_count, last_wrong_at, correct_answer)
        VALUES (${user.id}, ${wordSetId}, ${questionKey}, 1, NOW(), ${correctAnswer ?? ''})
        ON CONFLICT (user_id, word_set_id, question_key)
          WHERE user_id IS NOT NULL AND word_set_id IS NOT NULL
        DO UPDATE SET
          wrong_count    = wrong_bank.wrong_count + 1,
          last_wrong_at  = NOW(),
          correct_answer = EXCLUDED.correct_answer
      `;
    }

    return NextResponse.json({
      result: isCorrect ? 'correct' : 'wrong',
      message: isCorrect ? 'Great job!' : 'Added to Tricky Words',
    });
  } catch (err) {
    console.error('Answer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
