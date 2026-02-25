import Anthropic from '@anthropic-ai/sdk';
import sql from './db';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface MCQQuestion {
  question: string;
  options: string[]; // exactly 4
  answer: string;    // one of the options
  explanation: string;
}

export interface WordQuestions {
  word: string;
  meaning: MCQQuestion;
  synonym: MCQQuestion;
  antonym: MCQQuestion;
}

export interface WordSetQuestions {
  words: string[];
  wordQuestions: WordQuestions[]; // one per word
  paragraph: string;
  comprehension: MCQQuestion[];   // exactly 3
}

const SYSTEM_PROMPT = `You are a friendly English teacher creating vocabulary exercises for primary school children (ages 7-12).

Rules:
- Use simple, child-friendly language (ages 7-12)
- Make questions educational and engaging
- Wrong options must be plausible but clearly incorrect
- The paragraph should be an interesting story (80-120 words) that uses ALL given words naturally
- For synonyms: words with the SAME or similar meaning
- For antonyms: words with the OPPOSITE meaning
- Return ONLY valid JSON — no markdown fences, no extra text`;

function buildPrompt(words: string[]): string {
  return `Create a vocabulary exercise for these ${words.length} words: ${words.join(', ')}

Return ONLY this exact JSON structure:
{
  "words": ${JSON.stringify(words)},
  "wordQuestions": [
    {
      "word": "example",
      "meaning": {
        "question": "What does 'example' mean?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": "Option A",
        "explanation": "Short child-friendly explanation"
      },
      "synonym": {
        "question": "Which word means the SAME as 'example'?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": "Option A",
        "explanation": "Short explanation"
      },
      "antonym": {
        "question": "Which word means the OPPOSITE of 'example'?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": "Option A",
        "explanation": "Short explanation"
      }
    }
  ],
  "paragraph": "An 80-120 word story using all ${words.length} words naturally...",
  "comprehension": [
    {
      "question": "Question about the paragraph?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Short explanation"
    },
    { "question": "...", "options": ["...","...","...","..."], "answer": "...", "explanation": "..." },
    { "question": "...", "options": ["...","...","...","..."], "answer": "...", "explanation": "..." }
  ]
}

IMPORTANT: Provide EXACTLY ${words.length} items in wordQuestions and EXACTLY 3 items in comprehension.`;
}

export async function getOrGenerateWordSet(
  wordIds: number[],
  words: string[]
): Promise<{ wordSetId: number; questions: WordSetQuestions }> {
  const sortedIds = [...wordIds].sort((a, b) => a - b);
  const wordIdsKey = sortedIds.join(',');

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
    max_tokens: 3000,
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
