import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getSession } from '@/lib/session';
import { getCurrentUser } from '@/lib/auth';

function decodeKey(key: string, wordsJson: string) {
  const words = JSON.parse(wordsJson) as string[];

  // New v2 format: wq_{wordIdx}_{qIdx}
  if (key.startsWith('wq_')) {
    const parts = key.split('_');
    const wordIdx = parseInt(parts[1] ?? '0');
    const qIdx = parseInt(parts[2] ?? '0');
    const word = words[wordIdx] ?? key;
    return { word, typeLabel: `Question ${qIdx + 1}` };
  }

  // Comprehension: comp_{qIdx}
  if (key.startsWith('comp_')) {
    const qIdx = parseInt(key.split('_')[1] ?? '0');
    return { word: '(Comprehension)', typeLabel: `Q${qIdx + 1}` };
  }

  // Dictation: dictation_{idx}
  if (key.startsWith('dictation_')) {
    const idx = parseInt(key.split('_')[1] ?? '0');
    return { word: words[idx] ?? key, typeLabel: 'Dictation' };
  }

  // Legacy v1 format: meaning_0, synonym_0, antonym_0, comp_0
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
