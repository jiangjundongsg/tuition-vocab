import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { findParagraphForWord } from '@/lib/textbook';
import { generateWordQuestions, generateParagraph, WordQuestions } from '@/lib/claude';
import { generateFillBlank } from '@/lib/fillblank';

// Shuffle MCQ options on every response so the correct answer isn't always A
function shuffleArr<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
function shuffleQuestions(q: WordQuestions): WordQuestions {
  return {
    ...q,
    mcq:  { ...q.mcq,  options: shuffleArr(q.mcq.options  ?? []) },
    comp: q.comp.map((c) => ({ ...c, options: shuffleArr(c.options ?? []) })),
  };
}

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

    const age          = user.age ?? 10;
    const passageSource = user.passageSource || 'TextBook_Harry_Portter';
    const numComp      = user.numComprehension;
    const compType     = user.compQuestionType as import('@/lib/claude').CompQuestionType;
    const numBlanks    = user.numBlanks;
    const zipfMax      = user.blankZipfMax;
    const wordCount    = user.passageWordCount;

    // Check cache — only use if question count matches user's config
    const cached = await sql`
      SELECT id, paragraph_text, questions_json, fill_blank_json
      FROM word_sets WHERE word_id = ${wordId} LIMIT 1
    `;

    if (cached.length > 0 && cached[0].paragraph_text && cached[0].questions_json) {
      const cachedQ = JSON.parse(cached[0].questions_json as string);
      const cachedCompCount = Array.isArray(cachedQ?.comp) ? cachedQ.comp.length : 0;
      if (cachedCompCount === numComp) {
        const fillBlank = generateFillBlank(cached[0].paragraph_text as string, '', numBlanks, zipfMax);
        return NextResponse.json({
          wordSetId: Number(cached[0].id),
          paragraph: cached[0].paragraph_text as string,
          questions: shuffleQuestions(cachedQ),
          fillBlank,
        });
      }
    }

    // Fetch word
    const wordRows = await sql`SELECT id, word FROM words WHERE id = ${wordId} LIMIT 1`;
    if (wordRows.length === 0) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }
    const word = wordRows[0].word as string;

    // Find paragraph
    let paragraph = findParagraphForWord(word, passageSource);
    if (!paragraph) {
      paragraph = await generateParagraph(word, age, wordCount);
    }

    // Generate questions
    const questions = await generateWordQuestions(word, paragraph, age, numComp, compType);

    // Generate fill-in-blank using user's settings
    const fillBlank = generateFillBlank(paragraph, word, numBlanks, zipfMax);

    // Cache paragraph + questions
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
      questions: shuffleQuestions(questions),
      fillBlank,
    });
  } catch (err) {
    console.error('Practice word error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
