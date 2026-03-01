import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const rows = await sql`SELECT num_comprehension, num_blanks, blank_zipf_max FROM question_config WHERE id = 1`;
    if (rows.length === 0) {
      return NextResponse.json({ numComprehension: 2, numBlanks: 5, blankZipfMax: 4.2 });
    }
    return NextResponse.json({
      numComprehension: Number(rows[0].num_comprehension),
      numBlanks: Number(rows[0].num_blanks),
      blankZipfMax: Number(rows[0].blank_zipf_max),
    });
  } catch (err) {
    console.error('Config GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await initDb();
    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const { numComprehension, numBlanks, blankZipfMax } = await req.json() as {
      numComprehension?: number;
      numBlanks?: number;
      blankZipfMax?: number;
    };

    const numComp = Math.min(Math.max(Number(numComprehension) || 2, 1), 4);
    const nBlanks = Math.min(Math.max(Number(numBlanks) || 5, 1), 10);
    const zipfMax = Math.min(Math.max(Number(blankZipfMax) || 4.2, 2.0), 7.0);

    await sql`
      INSERT INTO question_config (id, num_comprehension, num_blanks, blank_zipf_max, updated_at)
      VALUES (1, ${numComp}, ${nBlanks}, ${zipfMax}, NOW())
      ON CONFLICT (id) DO UPDATE
        SET num_comprehension = EXCLUDED.num_comprehension,
            num_blanks        = EXCLUDED.num_blanks,
            blank_zipf_max    = EXCLUDED.blank_zipf_max,
            updated_at        = NOW()
    `;

    // Clear word_sets cache so next practice uses new config
    await sql`DELETE FROM word_sets`.catch(() => {});

    return NextResponse.json({ numComprehension: numComp, numBlanks: nBlanks, blankZipfMax: zipfMax });
  } catch (err) {
    console.error('Config PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
