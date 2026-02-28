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
  options: string[];  // exactly 4, each option is a full descriptive phrase
  answer: string;
  explanation: string;
}

export interface WordQuestions {
  mcq: MCQData;
  comp: [CompQuestionData, CompQuestionData];
}

// ── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an experienced primary school English teacher for students aged 7–12.
You create clear, child-friendly, educational questions.
Return ONLY valid JSON — no markdown fences, no extra text.`;

function buildPrompt(word: string, paragraph: string): string {
  return `Paragraph: "${paragraph}"
Target word: "${word}"

Create EXACTLY 3 questions:
1. One MCQ testing the meaning of "${word}" as used in the paragraph above (4 options)
2. Two comprehension MCQs about the paragraph (4 options each)

Rules for ALL options:
- Every option must be a complete descriptive phrase or sentence (at least 5 words) — never just one or two words
- Options should be plausible and similar in length to avoid guessing by elimination
- Do NOT use True/False questions

Return ONLY this exact JSON:
{
  "mcq": {
    "type": "mcq",
    "question": "What does '${word}' mean in the paragraph?",
    "options": ["a full phrase describing the correct meaning", "a plausible but wrong phrase", "another plausible but wrong phrase", "another plausible but wrong phrase"],
    "answer": "a full phrase describing the correct meaning",
    "explanation": "Child-friendly explanation (1–2 sentences)"
  },
  "comp": [
    {
      "type": "mcq",
      "question": "A comprehension question requiring thought about the paragraph?",
      "options": ["the correct answer in a full phrase", "a plausible but wrong full phrase", "another plausible but wrong full phrase", "another plausible but wrong full phrase"],
      "answer": "the correct answer in a full phrase",
      "explanation": "Short explanation referencing the paragraph"
    },
    {
      "type": "mcq",
      "question": "Another comprehension question about the paragraph?",
      "options": ["the correct answer in a full phrase", "a plausible but wrong full phrase", "another plausible but wrong full phrase", "another plausible but wrong full phrase"],
      "answer": "the correct answer in a full phrase",
      "explanation": "Short explanation referencing the paragraph"
    }
  ]
}`;
}

// ── Generate ─────────────────────────────────────────────────────────────────

export async function generateWordQuestions(
  word: string,
  paragraph: string
): Promise<WordQuestions> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(word, paragraph) }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const text = content.text.replace(/^```json\n?|\n?```$/g, '').trim();
  return JSON.parse(text) as WordQuestions;
}
