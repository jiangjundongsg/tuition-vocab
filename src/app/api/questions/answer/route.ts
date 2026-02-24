import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getOrCreateSession } from '@/lib/session';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const sessionId = await getOrCreateSession();

    const body = await req.json();
    const { questionId, questionType, isCorrect } = body as {
      questionId: number;
      questionType: 'mcq' | 'fill' | 'comprehension';
      isCorrect: boolean;
    };

    if (!questionId || !questionType) {
      return NextResponse.json({ error: 'questionId and questionType are required' }, { status: 400 });
    }

    if (!['mcq', 'fill', 'comprehension'].includes(questionType)) {
      return NextResponse.json({ error: 'Invalid questionType' }, { status: 400 });
    }

    if (user) {
      // Logged-in user: track by user_id
      if (isCorrect) {
        await sql`
          UPDATE wrong_bank
          SET wrong_count = wrong_count - 1
          WHERE user_id = ${user.id}
            AND question_id = ${questionId}
            AND question_type = ${questionType}
        `;
        await sql`
          DELETE FROM wrong_bank
          WHERE user_id = ${user.id}
            AND question_id = ${questionId}
            AND question_type = ${questionType}
            AND wrong_count <= 0
        `;
      } else {
        // ON CONFLICT uses the partial unique index idx_wrong_bank_user
        await sql`
          INSERT INTO wrong_bank (user_id, question_id, question_type, wrong_count, last_wrong_at)
          VALUES (${user.id}, ${questionId}, ${questionType}, 1, NOW())
          ON CONFLICT (user_id, question_id, question_type) WHERE user_id IS NOT NULL
          DO UPDATE SET
            wrong_count = wrong_bank.wrong_count + 1,
            last_wrong_at = NOW()
        `;
      }
    } else {
      // Anonymous user: track by session_id
      if (isCorrect) {
        await sql`
          UPDATE wrong_bank
          SET wrong_count = wrong_count - 1
          WHERE session_id = ${sessionId}
            AND question_id = ${questionId}
            AND question_type = ${questionType}
        `;
        await sql`
          DELETE FROM wrong_bank
          WHERE session_id = ${sessionId}
            AND question_id = ${questionId}
            AND question_type = ${questionType}
            AND wrong_count <= 0
        `;
      } else {
        await sql`
          INSERT INTO wrong_bank (session_id, question_id, question_type, wrong_count, last_wrong_at)
          VALUES (${sessionId}, ${questionId}, ${questionType}, 1, NOW())
          ON CONFLICT (session_id, question_id, question_type)
          DO UPDATE SET
            wrong_count = wrong_bank.wrong_count + 1,
            last_wrong_at = NOW()
        `;
      }
    }

    return NextResponse.json({
      result: isCorrect ? 'correct' : 'wrong',
      message: isCorrect ? 'Great job! 🎉' : 'Keep trying! Added to your practice list. 📝',
    });
  } catch (err) {
    console.error('Answer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
