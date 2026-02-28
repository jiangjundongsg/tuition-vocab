import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { findParagraphForWord } from '@/lib/textbook';
import { generateWordQuestions, generateParagraph } from '@/lib/claude';
import { generateFillBlank } from '@/lib/fillblank';

export async function GET(
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

    // 1. Check cache
    const cached = await sql`
      SELECT id, paragraph_text, questions_json, fill_blank_json
      FROM word_sets
      WHERE word_id = ${wordId}
      LIMIT 1
    `;

    if (
      cached.length > 0 &&
      cached[0].paragraph_text &&
      cached[0].questions_json &&
      cached[0].fill_blank_json
    ) {
      return NextResponse.json({
        wordSetId: Number(cached[0].id),
        paragraph: cached[0].paragraph_text as string,
        questions: JSON.parse(cached[0].questions_json as string),
        fillBlank: JSON.parse(cached[0].fill_blank_json as string),
      });
    }

    // 2. Fetch word from DB
    const wordRows = await sql`
      SELECT id, word FROM words WHERE id = ${wordId} LIMIT 1
    `;
    if (wordRows.length === 0) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }
    const word = wordRows[0].word as string;

    // 3. Find paragraph from Harry Potter text; fall back to Claude-generated paragraph
    let paragraph = findParagraphForWord(word);
    if (!paragraph) {
      paragraph = await generateParagraph(word);
    }

    // 4. Generate questions via Claude
    const questions = await generateWordQuestions(word, paragraph);

    // 5. Generate fill-in-blank from paragraph
    const fillBlank = generateFillBlank(paragraph, word);

    // 6. Cache in word_sets
    const inserted = await sql`
      INSERT INTO word_sets (word_id, paragraph_text, questions_json, fill_blank_json)
      VALUES (
        ${wordId},
        ${paragraph},
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
      paragraph,
      questions,
      fillBlank,
    });
  } catch (err) {
    console.error('Practice word error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
