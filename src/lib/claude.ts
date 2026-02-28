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
  type: 'mcq' | 'true_false';
  question: string;
  options?: string[];  // present for mcq, absent for true_false
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
1. One MCQ testing the meaning of "${word}" as used in the paragraph above (4 child-friendly options)
2. Two comprehension questions about the paragraph (each can be MCQ with 4 options OR True/False)

Return ONLY this exact JSON:
{
  "mcq": {
    "type": "mcq",
    "question": "What does '${word}' mean in the paragraph?",
    "options": ["correct meaning", "wrong option", "wrong option", "wrong option"],
    "answer": "correct meaning",
    "explanation": "Child-friendly explanation (1–2 sentences)"
  },
  "comp": [
    {
      "type": "mcq",
      "question": "A comprehension question about the paragraph?",
      "options": ["correct answer", "wrong option", "wrong option", "wrong option"],
      "answer": "correct answer",
      "explanation": "Short explanation"
    },
    {
      "type": "true_false",
      "question": "A true or false statement about the paragraph.",
      "answer": "True",
      "explanation": "Short explanation"
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
