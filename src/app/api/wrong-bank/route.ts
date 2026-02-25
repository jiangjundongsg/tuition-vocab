import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { getCurrentUser } from '@/lib/auth';

function decodeKey(key: string, wordsJson: string) {
  const words = JSON.parse(wordsJson) as string[];
  const [type, idxStr] = key.split('_');
  const idx = parseInt(idxStr ?? '0');
  const word = type === 'comp' ? '(Comprehension)' : (words[idx] ?? key);
  const typeLabel =
    type === 'meaning' ? 'Meaning' :
    type === 'synonym' ? 'Synonym' :
    type === 'antonym' ? 'Antonym' :
    type === 'comp'    ? 'Comprehension' :
    type === 'dictation' ? 'Dictation' : type;
  return { word, typeLabel };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    let rows;

    if (user) {
      rows = await sql`
        SELECT wb.id, wb.word_set_id, wb.question_key, wb.wrong_count, wb.last_wrong_at,
               ws.words_json
        FROM wrong_bank wb
        JOIN word_sets ws ON wb.word_set_id = ws.id
        WHERE wb.user_id = ${user.id} AND wb.word_set_id IS NOT NULL
        ORDER BY wb.wrong_count DESC, wb.last_wrong_at DESC
      `;
    } else {
      const sessionId = await getSession();
      if (!sessionId) return NextResponse.json({ items: [] });
      rows = await sql`
        SELECT wb.id, wb.word_set_id, wb.question_key, wb.wrong_count, wb.last_wrong_at,
               ws.words_json
        FROM wrong_bank wb
        JOIN word_sets ws ON wb.word_set_id = ws.id
        WHERE wb.session_id = ${sessionId} AND wb.word_set_id IS NOT NULL
        ORDER BY wb.wrong_count DESC, wb.last_wrong_at DESC
      `;
    }

    const items = rows.map((row) => {
      const { word, typeLabel } = decodeKey(row.question_key as string, row.words_json as string);
      return {
        id: row.id,
        wordSetId: row.word_set_id,
        questionKey: row.question_key,
        word,
        typeLabel,
        wrongCount: Number(row.wrong_count),
        lastWrongAt: row.last_wrong_at,
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error('Wrong bank fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
