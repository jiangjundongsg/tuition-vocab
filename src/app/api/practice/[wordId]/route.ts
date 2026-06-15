import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { findParagraphForWord } from '@/lib/textbook';
import { generateWordQuestions, generateParagraph, WordQuestions } from '@/lib/claude';
import { generateFillBlank } from '@/lib/fillblank';

function shuffleArr<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function shuffleQuestions(q: WordQuestions): WordQuestions {
  return {
    meaning:       q.meaning       ? { ...q.meaning,       options: shuffleArr(q.meaning.options       ?? []) } : undefined,
    synonym:       q.synonym       ? { ...q.synonym,       options: shuffleArr(q.synonym.options       ?? []) } : undefined,
    antonym:       q.antonym       ? { ...q.antonym,       options: shuffleArr(q.antonym.options       ?? []) } : undefined,
    comprehension: q.comprehension ? q.comprehension.map((c) => ({ ...c, options: shuffleArr(c.options ?? []) })) : undefined,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
  try {
    await initDb();

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { wordId: wordIdStr } = await params;
    const wordId = parseInt(wordIdStr);
    if (isNaN(wordId)) return NextResponse.json({ error: 'Invalid word ID' }, { status: 400 });

    // Fetch word — verify it belongs to this user (student) or any user (teacher)
    const wordRows = await sql`SELECT id, word FROM words WHERE id = ${wordId} LIMIT 1`;
    if (wordRows.length === 0) return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    const word = wordRows[0].word as string;

    const config = {
      age: user.age ?? 10,
      numComprehension: user.numComprehension,
      compQuestionType: user.compQuestionType,
      enableMcqMeaning: user.enableMcqMeaning,
      enableMcqSynonym: user.enableMcqSynonym,
      enableMcqAntonym: user.enableMcqAntonym,
      enableComprehension: user.enableComprehension,
      passageWordCount: user.passageWordCount,
    };

    // Check per-user cache
    const cached = await sql`
      SELECT id, paragraph_text, questions_json, fill_blank_json
      FROM word_sets
      WHERE user_id = ${user.id} AND word_id = ${wordId}
      LIMIT 1
    `;

    if (cached.length > 0 && cached[0].paragraph_text && cached[0].questions_json) {
      const cachedQ = JSON.parse(cached[0].questions_json as string) as WordQuestions;
      // Check if cached questions match current enabled types
      const hasCorrectTypes =
        (config.enableMcqMeaning === !!cachedQ.meaning) &&
        (config.enableMcqSynonym === !!cachedQ.synonym) &&
        (config.enableMcqAntonym === !!cachedQ.antonym) &&
        (config.enableComprehension === !!cachedQ.comprehension);

      if (hasCorrectTypes) {
        const fillBlank = user.enableFillBlank
          ? generateFillBlank(cached[0].paragraph_text as string, word, user.numBlanks, user.blankZipfMax)
          : null;
        return NextResponse.json({
          wordSetId: Number(cached[0].id),
          word,
          paragraph: cached[0].paragraph_text as string,
          questions: shuffleQuestions(cachedQ),
          fillBlank,
        });
      }
    }

    // Generate paragraph
    let paragraph = findParagraphForWord(word, user.passageSource);
    if (!paragraph) {
      paragraph = await generateParagraph(word, config.age, config.passageWordCount);
    }

    // Generate questions
    const questions = await generateWordQuestions(word, paragraph, config);

    // Generate fill-blank
    const fillBlank = user.enableFillBlank
      ? generateFillBlank(paragraph, word, user.numBlanks, user.blankZipfMax)
      : null;

    // Cache per (user_id, word_id)
    const inserted = await sql`
      INSERT INTO word_sets (word_id, user_id, paragraph_text, questions_json, fill_blank_json)
      VALUES (${wordId}, ${user.id}, ${paragraph}, ${JSON.stringify(questions)}, ${JSON.stringify(fillBlank)})
      ON CONFLICT (user_id, word_id) WHERE user_id IS NOT NULL DO UPDATE
        SET paragraph_text  = EXCLUDED.paragraph_text,
            questions_json  = EXCLUDED.questions_json,
            fill_blank_json = EXCLUDED.fill_blank_json,
            created_at      = NOW()
      RETURNING id
    `;

    return NextResponse.json({
      wordSetId: Number(inserted[0].id),
      word,
      paragraph,
      questions: shuffleQuestions(questions),
      fillBlank,
    });
  } catch (err) {
    console.error('Practice word error:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Internal server error', detail }, { status: 500 });
  }
}
