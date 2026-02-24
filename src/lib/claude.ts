import Anthropic from '@anthropic-ai/sdk';
import sql from './db';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface MCQQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface FillBlankQuestion {
  sentence: string;
  answer: string;
  explanation: string;
}

export interface ComprehensionQuestion {
  paragraph: string;
  question: string;
  answer: string;
  explanation: string;
}

export interface GeneratedQuestions {
  mcq: MCQQuestion;
  fill: FillBlankQuestion;
  comprehension: ComprehensionQuestion;
}

const SYSTEM_PROMPT = `You are a friendly English teacher for primary school students (ages 6–12).
Your job is to create fun vocabulary questions.
IMPORTANT RULES:
- Always respond with ONLY valid JSON, no other text
- Use simple, child-friendly language
- Keep comprehension paragraphs under 100 words
- Make MCQ options realistic but clearly distinguishable
- Provide helpful, encouraging explanations`;

function buildPrompt(word: string): string {
  return `Create vocabulary practice questions for the word: "${word}"

Return a JSON object with exactly this structure:
{
  "mcq": {
    "question": "What does '${word}' mean?",
    "options": ["option A", "option B", "option C", "option D"],
    "answer": "the correct option text",
    "explanation": "friendly explanation of the word"
  },
  "fill": {
    "sentence": "A sentence with _____ where the answer is '${word}'",
    "answer": "${word}",
    "explanation": "why this word fits here"
  },
  "comprehension": {
    "paragraph": "A short paragraph (under 100 words) that uses the word '${word}' in context",
    "question": "A comprehension question about the paragraph",
    "answer": "the correct answer",
    "explanation": "explanation of the answer"
  }
}`;
}

export async function generateQuestions(
  wordId: number,
  word: string
): Promise<GeneratedQuestions> {
  // Check cache first
  const cached = await sql`
    SELECT mcq_json, fill_json, comprehension_json
    FROM generated_questions
    WHERE word_id = ${wordId}
    LIMIT 1
  `;

  if (cached.length > 0) {
    return {
      mcq: JSON.parse(cached[0].mcq_json as string),
      fill: JSON.parse(cached[0].fill_json as string),
      comprehension: JSON.parse(cached[0].comprehension_json as string),
    };
  }

  // Call Claude API
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(word) }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  let parsed: GeneratedQuestions;
  try {
    // Strip markdown code fences if present
    const text = content.text.replace(/^```json\n?|\n?```$/g, '').trim();
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse Claude response: ${content.text}`);
  }

  // Cache in DB
  await sql`
    INSERT INTO generated_questions (word_id, mcq_json, fill_json, comprehension_json)
    VALUES (
      ${wordId},
      ${JSON.stringify(parsed.mcq)},
      ${JSON.stringify(parsed.fill)},
      ${JSON.stringify(parsed.comprehension)}
    )
    ON CONFLICT DO NOTHING
  `;

  return parsed;
}

export async function getOrGenerateQuestions(
  wordId: number,
  word: string
): Promise<{ questionId: number; questions: GeneratedQuestions }> {
  const questions = await generateQuestions(wordId, word);

  const row = await sql`
    SELECT id FROM generated_questions WHERE word_id = ${wordId} LIMIT 1
  `;

  return { questionId: Number(row[0].id), questions };
}
