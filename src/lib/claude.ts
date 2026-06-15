import Anthropic from '@anthropic-ai/sdk';
import { normalizeWordEntry } from '@/lib/wordfreq';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface MCQData {
  type: 'mcq';
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface CompQuestionData {
  type: 'mcq';
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface WordQuestions {
  meaning?: MCQData;
  synonym?: MCQData;
  antonym?: MCQData;
  comprehension?: CompQuestionData[];
}

export interface QuestionConfig {
  age: number;
  numComprehension: number;
  compQuestionType: string;
  enableMcqMeaning: boolean;
  enableMcqSynonym: boolean;
  enableMcqAntonym: boolean;
  enableComprehension: boolean;
  passageWordCount: number;
}

export type CompQuestionType = 'mcq' | 'true_false' | 'mixed';

function shuffleMCQ<T extends { options?: string[]; answer: string }>(q: T): T {
  if (!q.options || q.options.length <= 1) return q;
  const shuffled = [...q.options].sort(() => Math.random() - 0.5);
  return { ...q, options: shuffled };
}

// Pull the text out of a Claude response. The first content block isn't always
// the text block, so search for it rather than assuming index 0.
export function responseText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('Claude response contained no text block');
  }
  return block.text;
}

// Extract a JSON object from a model response, tolerating markdown fences and
// any preamble/trailing prose the model may add around the JSON.
export function parseJsonObject(raw: string): unknown {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object in Claude response: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateParagraph(word: string, age = 10, wordCount = 150): Promise<string> {
  const minWords = Math.max(50, wordCount - 25);
  const maxWords = wordCount + 25;
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: Math.max(400, wordCount * 2),
    system: `You are an experienced primary school English teacher.
Write clear, child-friendly paragraphs.
Return ONLY the paragraph text — no title, no explanation, no extra text.`,
    messages: [{
      role: 'user',
      content: `Write a paragraph of ${minWords}–${maxWords} words that uses the word "${word}" naturally in context. The paragraph should be appropriate for a ${age}-year-old child, tell a simple story or describe a situation, and make the meaning of "${word}" clear from context.`,
    }],
  });
  return responseText(message).trim();
}

export async function generateWordQuestions(
  word: string,
  paragraph: string,
  config: QuestionConfig,
): Promise<WordQuestions> {
  const {
    age,
    numComprehension,
    compQuestionType,
    enableMcqMeaning,
    enableMcqSynonym,
    enableMcqAntonym,
    enableComprehension,
  } = config;

  const compType = compQuestionType as CompQuestionType;
  const isTF = compType === 'true_false';
  const isMixed = compType === 'mixed';

  // Build JSON schema for requested question types
  const parts: string[] = [];

  if (enableMcqMeaning) {
    parts.push(`  "meaning": {
    "type": "mcq",
    "question": "What does '${word}' mean in the paragraph?",
    "options": ["correct meaning phrase", "wrong phrase 1", "wrong phrase 2", "wrong phrase 3"],
    "answer": "correct meaning phrase",
    "explanation": "Child-friendly explanation (1–2 sentences)"
  }`);
  }

  if (enableMcqSynonym) {
    parts.push(`  "synonym": {
    "type": "mcq",
    "question": "Which word has a similar meaning to '${word}'?",
    "options": ["correct synonym", "wrong word 1", "wrong word 2", "wrong word 3"],
    "answer": "correct synonym",
    "explanation": "Brief explanation of why these words are similar"
  }`);
  }

  if (enableMcqAntonym) {
    parts.push(`  "antonym": {
    "type": "mcq",
    "question": "Which word has the opposite meaning to '${word}'?",
    "options": ["correct antonym", "wrong word 1", "wrong word 2", "wrong word 3"],
    "answer": "correct antonym",
    "explanation": "Brief explanation of why these words are opposites"
  }`);
  }

  if (enableComprehension && numComprehension > 0) {
    const compItems = Array.from({ length: numComprehension }, (_, i) => {
      const useTF = isTF || (isMixed && i % 2 === 1);
      return useTF
        ? `    {
      "type": "mcq",
      "question": "True or false statement about the paragraph",
      "options": ["True", "False"],
      "answer": "True",
      "explanation": "Short explanation"
    }`
        : `    {
      "type": "mcq",
      "question": "Comprehension question ${i + 1} about the paragraph?",
      "options": ["correct answer phrase", "wrong phrase 1", "wrong phrase 2", "wrong phrase 3"],
      "answer": "correct answer phrase",
      "explanation": "Short explanation referencing the paragraph"
    }`;
    }).join(',\n');
    parts.push(`  "comprehension": [\n${compItems}\n  ]`);
  }

  const compTypeInstruction = isTF
    ? `Each comprehension question must be a TRUE/FALSE statement. Options: ["True", "False"].`
    : isMixed
    ? `Mix comprehension types: alternate between 4-option MCQ and True/False.`
    : `Each comprehension question must have exactly 4 options as complete descriptive phrases.`;

  const prompt = `Paragraph: "${paragraph}"
Target word: "${word}"
Student age: ${age} years old

Generate ONLY the following question types for a ${age}-year-old:
${enableMcqMeaning ? `- "meaning": MCQ testing the word's meaning as used in the paragraph (4 options, each a complete phrase)` : ''}
${enableMcqSynonym ? `- "synonym": MCQ asking for a word with similar meaning to '${word}' (4 single-word options)` : ''}
${enableMcqAntonym ? `- "antonym": MCQ asking for a word with opposite meaning to '${word}' (4 single-word options)` : ''}
${enableComprehension && numComprehension > 0 ? `- "comprehension": ${numComprehension} question(s) about the passage. ${compTypeInstruction}` : ''}

Return ONLY this exact JSON (include only the keys listed above):
{
${parts.join(',\n')}
}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    system: `You are an experienced primary school English teacher for students aged 7–12.
Create clear, child-friendly, educational questions.
Return ONLY valid JSON — no markdown fences, no extra text.
Do not add any explanation, reasoning, or preamble before or after the JSON object.`,
    messages: [{ role: 'user', content: prompt }],
  });

  const parsed = parseJsonObject(responseText(message)) as WordQuestions;

  // Shuffle options so correct answer isn't always first
  if (parsed.meaning) parsed.meaning = shuffleMCQ(parsed.meaning);
  if (parsed.synonym) parsed.synonym = shuffleMCQ(parsed.synonym);
  if (parsed.antonym) parsed.antonym = shuffleMCQ(parsed.antonym);
  if (parsed.comprehension) parsed.comprehension = parsed.comprehension.map(shuffleMCQ);

  return parsed;
}

export async function extractWordsFromImage(
  base64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
): Promise<string[]> {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: `Extract all vocabulary words from this image. These are English words and phrases that primary school students need to learn.

Return ONLY a plain list, one word or phrase per line, in lowercase, no numbers, no explanations. Keep multi-word phrases (e.g. "ice cream", "give up") together on a single line.`,
        },
      ],
    }],
  });

  let text: string;
  try {
    text = responseText(message);
  } catch {
    return [];
  }

  return text
    .split('\n')
    .map((w) => normalizeWordEntry(w))
    .filter((w) => w.length > 1);
}
