import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
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
      // Correct answer: decrement count, then remove if it hits 0
      await sql`
        UPDATE wrong_bank SET wrong_count = wrong_count - 1
        WHERE user_id    = ${user.id}
          AND word_set_id = ${wordSetId}
          AND question_key = ${questionKey}
      `;
      await sql`
        DELETE FROM wrong_bank
        WHERE user_id    = ${user.id}
          AND word_set_id = ${wordSetId}
          AND question_key = ${questionKey}
          AND wrong_count <= 0
      `;
    } else {
      // Wrong answer: upsert without relying on the partial unique index.
      // SELECT first, then INSERT or UPDATE — avoids ON CONFLICT partial-index
      // inference which fails silently when the index is missing.
      const existing = await sql`
        SELECT id FROM wrong_bank
        WHERE user_id    = ${user.id}
          AND word_set_id = ${wordSetId}
          AND question_key = ${questionKey}
        LIMIT 1
      `;

      if (existing.length > 0) {
        await sql`
          UPDATE wrong_bank
          SET wrong_count   = wrong_count + 1,
              last_wrong_at = NOW()
          WHERE id = ${Number(existing[0].id)}
        `;
        // Best-effort: update correct_answer only if column exists
        await sql`
          UPDATE wrong_bank SET correct_answer = ${correctAnswer ?? ''}
          WHERE id = ${Number(existing[0].id)}
        `.catch(() => {});
      } else {
        await sql`
          INSERT INTO wrong_bank (user_id, word_set_id, question_key, wrong_count, last_wrong_at)
          VALUES (${user.id}, ${wordSetId}, ${questionKey}, 1, NOW())
        `;
        // Best-effort: set correct_answer only if column exists
        await sql`
          UPDATE wrong_bank SET correct_answer = ${correctAnswer ?? ''}
          WHERE user_id = ${user.id}
            AND word_set_id = ${wordSetId}
            AND question_key = ${questionKey}
        `.catch(() => {});
      }
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
