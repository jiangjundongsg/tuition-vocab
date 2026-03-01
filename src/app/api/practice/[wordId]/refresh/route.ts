import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { findParagraphForWord } from '@/lib/textbook';
import { generateWordQuestions, generateParagraph } from '@/lib/claude';
import { generateFillBlank } from '@/lib/fillblank';

async function getConfig() {
  try {
    const rows = await sql`SELECT num_comprehension, num_blanks, blank_zipf_max FROM question_config WHERE id = 1`;
    if (rows.length > 0) {
      return {
        numComp: Number(rows[0].num_comprehension) || 2,
        numBlanks: Number(rows[0].num_blanks) || 5,
        zipfMax: Number(rows[0].blank_zipf_max) || 4.2,
      };
    }
  } catch { /* ignore */ }
  return { numComp: 2, numBlanks: 5, zipfMax: 4.2 };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
  try {
    await initDb();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { wordId: wordIdStr } = await params;
    const wordId = parseInt(wordIdStr);
    if (isNaN(wordId)) {
      return NextResponse.json({ error: 'Invalid word ID' }, { status: 400 });
    }

    // Fetch word
    const wordRows = await sql`SELECT id, word FROM words WHERE id = ${wordId} LIMIT 1`;
    if (wordRows.length === 0) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }
    const word = wordRows[0].word as string;

    const config = await getConfig();
    const age = user.age ?? 10;
    const passageSource = user.passageSource || 'TextBook_Harry_Portter';

    // Get current paragraph so we can pick a DIFFERENT one
    const current = await sql`SELECT paragraph_text FROM word_sets WHERE word_id = ${wordId} LIMIT 1`;
    const currentParagraph = current.length > 0 ? current[0].paragraph_text as string : null;

    // Find all matching paragraphs, exclude the current one
    const { findParagraphForWord: findAll } = await import('@/lib/textbook');
    let newParagraph: string | null = null;

    // Try up to 5 times to get a different paragraph
    for (let i = 0; i < 5; i++) {
      const candidate = findAll(word, passageSource);
      if (candidate && candidate !== currentParagraph) {
        newParagraph = candidate;
        break;
      }
    }

    // Fall back to Claude-generated if no different paragraph found
    if (!newParagraph) {
      newParagraph = await generateParagraph(word, age);
    }

    // Regenerate questions and fill-blank with new paragraph
    const questions = await generateWordQuestions(word, newParagraph, age, config.numComp);
    const fillBlank = generateFillBlank(newParagraph, word, config.numBlanks, config.zipfMax);

    // Update cache
    const inserted = await sql`
      INSERT INTO word_sets (word_id, paragraph_text, questions_json, fill_blank_json)
      VALUES (
        ${wordId},
        ${newParagraph},
        ${JSON.stringify(questions)},
        ${JSON.stringify(fillBlank)}
      )
      ON CONFLICT (word_id) DO UPDATE
        SET paragraph_text  = EXCLUDED.paragraph_text,
            questions_json  = EXCLUDED.questions_json,
            fill_blank_json = EXCLUDED.fill_blank_json,
            created_at      = NOW()
      RETURNING id
    `;

    return NextResponse.json({
      wordSetId: Number(inserted[0].id),
      paragraph: newParagraph,
      questions,
      fillBlank,
    });
  } catch (err) {
    console.error('Refresh word error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
