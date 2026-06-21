/**
 * Deepseek API wrapper — OpenAI-compatible chat completions.
 */
import { normalizeWordEntry } from '@/lib/wordfreq';

const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const BASE = 'https://api.deepseek.com/v1';

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

async function chat(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4000,
  model = MODEL,
): Promise<string> {
  if (!API_KEY) throw new Error('DEEPSEEK_API_KEY not configured');
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model, max_tokens: maxTokens, temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Deepseek ${res.status}: ${e.slice(0,300)}`); }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Deepseek empty response');
  return content;
}

function shuffleMCQ<T extends { options?: string[]; answer: string }>(q: T): T {
  if (!q.options || q.options.length <= 1) return q;
  return { ...q, options: [...q.options].sort(() => Math.random() - 0.5) };
}

// ── Paragraph generation ───────────────────────────────────────

export async function generateParagraph(
  word: string, age = 10, wordCount = 150,
): Promise<string> {
  const min = Math.max(50, wordCount - 25);
  const text = await chat(
    `You are a primary school English teacher. Return ONLY the paragraph — no title, no extra text.`,
    `Write a ${min}–${wordCount + 25}-word paragraph using "${word}" naturally. Appropriate for a ${age}-year-old. Make meaning clear from context.`,
    Math.max(400, wordCount * 2),
  );
  return text.trim();
}

// ── Question generation ────────────────────────────────────────

export async function generateWordQuestions(
  word: string, paragraph: string, config: QuestionConfig,
): Promise<WordQuestions> {
  const { age, numComprehension, compQuestionType, enableMcqMeaning, enableMcqSynonym, enableMcqAntonym, enableComprehension } = config;

  const parts: string[] = [];
  if (enableMcqMeaning) parts.push(`"meaning":{"type":"mcq","question":"What does '${word}' mean?","options":["correct phrase","wrong1","wrong2","wrong3"],"answer":"correct phrase","explanation":"brief"}`);
  if (enableMcqSynonym) parts.push(`"synonym":{"type":"mcq","question":"Synonym of '${word}'?","options":["correct","w1","w2","w3"],"answer":"correct","explanation":"brief"}`);
  if (enableMcqAntonym) parts.push(`"antonym":{"type":"mcq","question":"Antonym of '${word}'?","options":["correct","w1","w2","w3"],"answer":"correct","explanation":"brief"}`);
  if (enableComprehension && numComprehension > 0) {
    const items = Array.from({length:numComprehension},(_,i)=>
      compQuestionType==='true_false'
        ?`{"type":"mcq","question":"Q${i+1}","options":["True","False"],"answer":"True","explanation":"..."}`
        :`{"type":"mcq","question":"Q${i+1}","options":["correct","w1","w2","w3"],"answer":"correct","explanation":"..."}`
    ).join(',');
    parts.push(`"comprehension":[${items}]`);
  }

  const prompt = `Paragraph: "${paragraph}"
Word: "${word}"  |  Age: ${age}

Generate ONLY these types:
${enableMcqMeaning?'- meaning: MCQ (4 phrase options)':''}
${enableMcqSynonym?'- synonym: MCQ (4 single-word options)':''}
${enableMcqAntonym?'- antonym: MCQ (4 single-word options)':''}
${enableComprehension&&numComprehension>0?`- comprehension: ${numComprehension} Q(s). ${compQuestionType==='true_false'?'TRUE/FALSE.':compQuestionType==='mixed'?'Mix MCQ/TF.':'4-option MCQ.'}`:''}

Return ONLY valid JSON: {${parts.join(',')}}`;

  const text = await chat(
    `Primary school English teacher for ages 7-12. Return ONLY valid JSON. No markdown, no extra text.`,
    prompt, 4000,
  );

  const parsed = extractJson(text) as WordQuestions;
  if (parsed.meaning) parsed.meaning = shuffleMCQ(parsed.meaning);
  if (parsed.synonym) parsed.synonym = shuffleMCQ(parsed.synonym);
  if (parsed.antonym) parsed.antonym = shuffleMCQ(parsed.antonym);
  if (parsed.comprehension) parsed.comprehension = parsed.comprehension.map(shuffleMCQ);
  return parsed;
}

// ── Image extraction ───────────────────────────────────────────

export async function extractWordsFromImage(
  base64: string, mediaType: string,
): Promise<string[]> {
  const text = await chat(
    `Extract vocabulary words from images. Return ONLY one word/phrase per line, lowercase, no numbers.`,
    `[Image analysis requested — extract all English vocabulary words visible]`,
    500,
  );
  return text.split('\n').map(normalizeWordEntry).filter(w => w.length > 1);
}


// ── Sentence evaluation ──────────────────────────────────────────

export interface SentenceFeedback {
  score: number;       // 0-10 overall score
  grammar: string;     // grammar feedback
  vocabulary: string;  // vocabulary/usage feedback
  suggestions: string; // rewrite suggestions
  correct: boolean;    // true if score >= 6 (pass threshold)
}

export async function evaluateSentence(
  word: string,
  sentence: string,
  age: number,
): Promise<SentenceFeedback> {
  const text = await chat(
    `You are an English teacher evaluating a student's sentence. The student is ${age} years old.
Return ONLY valid JSON (no markdown, no extra text) with these fields:
- "score": number 0-10
- "grammar": brief grammar feedback
- "vocabulary": brief vocabulary/word-usage feedback
- "suggestions": how to improve (empty string if perfect)
- "correct": true if score >= 6, false otherwise

Be encouraging but honest. Score based on age-appropriate expectations.`,
    `Target word: "${word}"
Student sentence: "${sentence}"

Evaluate and return JSON.`,
    1000,
  );

  const parsed = extractJson(text) as SentenceFeedback;
  if (typeof parsed.score !== 'number') throw new Error('Invalid sentence evaluation response');
  return parsed;
}

function extractJson(raw: string): unknown {
  const c = raw.replace(/```json\s*|\s*```/g, '');
  const s = c.indexOf('{'), e = c.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error(`No JSON: ${raw.slice(0,200)}`);
  return JSON.parse(c.slice(s, e + 1));
}
