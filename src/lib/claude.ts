import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Question data types ──────────────────────────────────────────────────────

export interface MCQData {
  type: 'mcq';
  question: string;
  options: string[]; // exactly 4
  answer: string;    // one of the options
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
  mcq: MCQData;
  comp: CompQuestionData[];  // length = numComp (default 2)
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(word: string, paragraph: string, age: number, numComp: number): string {
  const compJson = Array.from({ length: numComp }, (_, i) => `
    {
      "type": "mcq",
      "question": "Comprehension question ${i + 1} about the paragraph?",
      "options": ["correct answer phrase", "wrong phrase 1", "wrong phrase 2", "wrong phrase 3"],
      "answer": "correct answer phrase",
      "explanation": "Short explanation referencing the paragraph"
    }`).join(',');

  return `Paragraph: "${paragraph}"
Target word: "${word}"
Student age: ${age} years old

Create EXACTLY ${1 + numComp} questions suitable for a ${age}-year-old child:
1. One MCQ testing the meaning of "${word}" as used in the paragraph (4 options)
${Array.from({ length: numComp }, (_, i) => `${i + 2}. One comprehension MCQ about the paragraph (4 options)`).join('\n')}

Rules for ALL options:
- Every option must be a complete descriptive phrase or sentence (at least 5 words)
- Options should be plausible and similar in length
- Vocabulary and sentence complexity should suit a ${age}-year-old reader
- Do NOT use True/False questions

Return ONLY this exact JSON:
{
  "mcq": {
    "type": "mcq",
    "question": "What does '${word}' mean in the paragraph?",
    "options": ["correct meaning phrase", "wrong phrase 1", "wrong phrase 2", "wrong phrase 3"],
    "answer": "correct meaning phrase",
    "explanation": "Child-friendly explanation (1–2 sentences)"
  },
  "comp": [${compJson}
  ]
}`;
}

// ── Generate paragraph (fallback when word not in textbook) ──────────────────

export async function generateParagraph(word: string, age = 10): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: `You are an experienced primary school English teacher.
Write clear, child-friendly paragraphs.
Return ONLY the paragraph text — no title, no explanation, no extra text.`,
    messages: [{
      role: 'user',
      content: `Write a short paragraph of 100–150 words that uses the word "${word}" naturally in context. The paragraph should be appropriate for a ${age}-year-old child, tell a simple story or describe a situation, and make the meaning of "${word}" clear from context.`,
    }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return content.text.trim();
}

// ── Generate questions ────────────────────────────────────────────────────────

export async function generateWordQuestions(
  word: string,
  paragraph: string,
  age = 10,
  numComp = 2,
): Promise<WordQuestions> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    system: `You are an experienced primary school English teacher for students aged 7–12.
You create clear, child-friendly, educational questions.
Return ONLY valid JSON — no markdown fences, no extra text.`,
    messages: [{ role: 'user', content: buildPrompt(word, paragraph, age, numComp) }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const text = content.text.replace(/^```json\n?|\n?```$/g, '').trim();
  const parsed = JSON.parse(text) as WordQuestions;

  // Ensure comp is always an array
  if (!Array.isArray(parsed.comp)) {
    parsed.comp = [parsed.comp as unknown as CompQuestionData];
  }

  return parsed;
}

// ── Extract words from image (teacher photo upload) ──────────────────────────

export async function extractWordsFromImage(
  base64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
): Promise<string[]> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
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
          text: `Extract all vocabulary words from this image. These are English words that primary school students need to learn.

Return ONLY a plain list of words, one word per line, in lowercase, no numbers, no punctuation, no explanations.`,
        },
      ],
    }],
  });

  const content = message.content[0];
  if (content.type !== 'text') return [];

  return content.text
    .split('\n')
    .map((w) => w.trim().toLowerCase().replace(/[^a-z'-]/g, ''))
    .filter((w) => w.length > 1);
}
