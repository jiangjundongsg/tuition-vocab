import Anthropic from '@anthropic-ai/sdk';
import sql from './db';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Question data types ──────────────────────────────────────────────────────

export interface MCQData {
  type: 'mcq';
  question: string;
  options: string[]; // exactly 4
  answer: string;    // one of the options
  explanation: string;
}

export interface FillBlankData {
  type: 'fill_blank';
  question: string;  // must contain exactly one "___"
  answer: string;    // the word/phrase that fills the blank
  explanation: string;
}

export interface TrueFalseData {
  type: 'true_false';
  question: string;
  answer: 'True' | 'False';
  explanation: string;
}

export type QuestionData = MCQData | FillBlankData | TrueFalseData;

// ── Session structure ────────────────────────────────────────────────────────

export interface WordQuestions {
  word: string;
  questions: QuestionData[]; // exactly 3, varied types chosen by Claude
}

export interface ComprehensionSection {
  passage?: string;      // optional reading passage
  questions: QuestionData[]; // 1–3 questions, Claude picks best types
}

export interface WordSetQuestions {
  words: string[];
  wordQuestions: WordQuestions[]; // one per word (5 items)
  comprehension: ComprehensionSection;
}

// ── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the best primary school English teacher for students aged 7–12.
Your mission: help children master vocabulary through VARIED, engaging questions.

Question types you can use:
- "mcq": Multiple choice with EXACTLY 4 options. Best for meaning, usage in context.
- "fill_blank": Complete the sentence. The "question" field MUST contain EXACTLY one "___". The "answer" is the word/phrase for the blank.
- "true_false": True or False. The "answer" must be exactly "True" or "False".

Rules:
- Use simple, child-friendly language (ages 7–12)
- Make questions fun and educational
- For each word, use a MIX of question types — do not repeat the same type 3 times
- Wrong MCQ options should be plausible but clearly incorrect to a young learner
- Return ONLY valid JSON — no markdown fences, no extra text`;

function buildPrompt(words: string[]): string {
  return `Create a vocabulary exercise for these ${words.length} words: ${words.join(', ')}

For EACH word, create EXACTLY 3 questions using a VARIETY of types (mcq, fill_blank, true_false). Choose the best types for each word — think like the best teacher.

Then create a comprehension section:
- Write a substantial passage (120–160 words) using all ${words.length} words naturally. The passage should tell a proper story or explain a topic with enough detail for children to engage with — do NOT write a short paragraph.
- Create EXACTLY 3 comprehension questions. Each question must require the student to think carefully about the passage — ask about characters' feelings, reasons for events, or what words mean in context. Mix question types as you see fit.

Return ONLY this exact JSON (replace all placeholder values):
{
  "words": ${JSON.stringify(words)},
  "wordQuestions": [
    {
      "word": "WORD",
      "questions": [
        {
          "type": "mcq",
          "question": "What does 'WORD' mean?",
          "options": ["correct meaning", "wrong option", "wrong option", "wrong option"],
          "answer": "correct meaning",
          "explanation": "Short child-friendly explanation"
        },
        {
          "type": "fill_blank",
          "question": "She felt ___ when she heard the good news.",
          "answer": "WORD",
          "explanation": "Short explanation"
        },
        {
          "type": "true_false",
          "question": "A statement about WORD that is true or false.",
          "answer": "True",
          "explanation": "Short explanation"
        }
      ]
    }
  ],
  "comprehension": {
    "passage": "A 120–160 word story using all ${words.length} words naturally...",
    "questions": [
      {
        "type": "mcq",
        "question": "Question about the passage?",
        "options": ["correct", "wrong", "wrong", "wrong"],
        "answer": "correct",
        "explanation": "Short explanation"
      },
      {
        "type": "fill_blank",
        "question": "In the story, the character felt ___ when ...",
        "answer": "WORD",
        "explanation": "Short explanation"
      },
      {
        "type": "true_false",
        "question": "A statement about the passage.",
        "answer": "False",
        "explanation": "Short explanation"
      }
    ]
  }
}

IMPORTANT: Provide EXACTLY ${words.length} items in wordQuestions (one per word). Each wordQuestions item has EXACTLY 3 questions. Provide EXACTLY 3 questions in comprehension.questions.`;
}

// ── Cache + generate ─────────────────────────────────────────────────────────

// v3 prefix ensures old cached entries (shorter comprehension) are not reused
const CACHE_VERSION = 'v3';

export async function getOrGenerateWordSet(
  wordIds: number[],
  words: string[]
): Promise<{ wordSetId: number; questions: WordSetQuestions }> {
  const sortedIds = [...wordIds].sort((a, b) => a - b);
  const wordIdsKey = `${CACHE_VERSION}:${sortedIds.join(',')}`;

  // Check cache
  const cached = await sql`
    SELECT id, questions_json FROM word_sets WHERE word_ids_key = ${wordIdsKey} LIMIT 1
  `;

  if (cached.length > 0) {
    return {
      wordSetId: Number(cached[0].id),
      questions: JSON.parse(cached[0].questions_json as string),
    };
  }

  // Call Claude API
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 3500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(words) }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const text = content.text.replace(/^```json\n?|\n?```$/g, '').trim();
  const questions = JSON.parse(text) as WordSetQuestions;

  // Cache in DB
  const rows = await sql`
    INSERT INTO word_sets (word_ids_key, words_json, questions_json)
    VALUES (${wordIdsKey}, ${JSON.stringify(words)}, ${JSON.stringify(questions)})
    ON CONFLICT (word_ids_key) DO UPDATE SET questions_json = EXCLUDED.questions_json
    RETURNING id
  `;

  return { wordSetId: Number(rows[0].id), questions };
}
