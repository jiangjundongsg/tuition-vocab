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
    const { wrongBankId, isCorrect } = body as {
      wrongBankId: number;
      isCorrect: boolean;
    };

    if (!wrongBankId) {
      return NextResponse.json({ error: 'wrongBankId is required' }, { status: 400 });
    }

    if (isCorrect) {
      // Answered correctly on re-practice → remove from wrong bank immediately
      await sql`
        DELETE FROM wrong_bank
        WHERE id = ${wrongBankId}
          AND user_id = ${user.id}
      `;
    } else {
      // Still wrong → increment count
      await sql`
        UPDATE wrong_bank
        SET wrong_count   = wrong_count + 1,
            last_wrong_at = NOW()
        WHERE id = ${wrongBankId}
          AND user_id = ${user.id}
      `;
    }

    return NextResponse.json({ result: isCorrect ? 'removed' : 'kept' });
  } catch (err) {
    console.error('Repractice answer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
