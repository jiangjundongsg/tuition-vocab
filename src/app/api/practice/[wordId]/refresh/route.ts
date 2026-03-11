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

    const passageSource = user.passageSource || 'TextBook_Harry_Portter';
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

    // Get current paragraph so we can pick a DIFFERENT one
    const current = await sql`
      SELECT paragraph_text FROM word_sets
      WHERE user_id = ${user.id} AND word_id = ${wordId}
      LIMIT 1
    `;
    const currentParagraph = current.length > 0 ? current[0].paragraph_text as string : null;

    let newParagraph: string | null = null;

    // Try up to 5 times to get a different paragraph
    for (let i = 0; i < 5; i++) {
      const candidate = findParagraphForWord(word, passageSource);
      if (candidate && candidate !== currentParagraph) {
        newParagraph = candidate;
        break;
      }
    }

    // Fall back to Claude-generated if no different paragraph found
    if (!newParagraph) {
      newParagraph = await generateParagraph(word, config.age, config.passageWordCount);
    }

    // Regenerate questions and fill-blank with new paragraph
    const questions = await generateWordQuestions(word, newParagraph, config);
    const fillBlank = user.enableFillBlank
      ? generateFillBlank(newParagraph, word, user.numBlanks, user.blankZipfMax)
      : null;

    // Update cache per (user_id, word_id)
    const inserted = await sql`
      INSERT INTO word_sets (word_id, user_id, paragraph_text, questions_json, fill_blank_json)
      VALUES (${wordId}, ${user.id}, ${newParagraph}, ${JSON.stringify(questions)}, ${JSON.stringify(fillBlank)})
      ON CONFLICT (user_id, word_id) WHERE user_id IS NOT NULL DO UPDATE
        SET paragraph_text  = EXCLUDED.paragraph_text,
            questions_json  = EXCLUDED.questions_json,
            fill_blank_json = EXCLUDED.fill_blank_json,
            created_at      = NOW()
      RETURNING id
    `;

    return NextResponse.json({
      wordSetId: Number(inserted[0].id),
      paragraph: newParagraph,
      questions: shuffleQuestions(questions),
      fillBlank,
    });
  } catch (err) {
    console.error('Refresh word error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
