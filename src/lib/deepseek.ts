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
    `You are the best English teacher in the world. Your mission is to help a young student master the word "${word}" through contextual reading — the most effective, research-backed way to build lasting vocabulary. Craft a paragraph where the word's meaning is unmistakable from context, the language is rich but never condescending, and the student walks away truly knowing the word. Return ONLY the paragraph — no title, no extra text.`,
    `Write a ${min}–${wordCount + 25}-word paragraph using "${word}" naturally. Make it engaging and perfectly suited for a ${age}-year-old. The student is learning English vocabulary through short paragraphs — your paragraph should make the meaning of "${word}" crystal clear from context, so the student can infer and internalize it effortlessly.`,
    Math.max(10000, wordCount * 200),
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
    `You are the best English teacher in the world, helping a young student master vocabulary through the most efficient, research-backed method: contextual reading followed by targeted recall. Design questions that don't just test — they teach. Wrong options should be plausible enough to make the student think, but the correct answer should become obvious once they truly understand the word from the paragraph. Make every question a learning moment. Return ONLY valid JSON. No markdown, no extra text.`,
    prompt, 8000,
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
    `You are the best English teacher in the world, evaluating a young student's attempt to use a new vocabulary word in their own sentence. This is the ultimate test of mastery — can the student use "${word}" correctly and naturally? Your feedback should be the perfect balance of encouragement and precise, actionable guidance. Praise what they did well first, then give one clear thing to improve. Make them feel proud of trying, and excited to try again. The student is ${age} years old.
Return ONLY valid JSON (no markdown, no extra text) with these fields:
- "score": number 0-10
- "grammar": brief grammar feedback
- "vocabulary": brief vocabulary/word-usage feedback
- "suggestions": how to improve (empty string if perfect)
- "correct": true if score >= 7, false otherwise

Be encouraging but honest. Score based on age-appropriate expectations.`,
    `Target word: "${word}"
Student sentence: "${sentence}"

Evaluate and return JSON.`,
    4000,
  );

  const parsed = extractJson(text) as SentenceFeedback;
  if (typeof parsed.score !== 'number') throw new Error('Invalid sentence evaluation response');
  return parsed;
}

// ── Mistake-pick question generation ────────────────────────────

export interface MistakePickQuestion {
  sentence: string;          // the sentence with one intentional error
  word: string;              // the vocabulary word used in this sentence
  correction: {
    mistake: string;         // description of what's wrong, e.g. "go → went"
    explanation: string;     // explanation in Chinese
    errorType: string;       // category of error
  };
  correctSentence: string;   // fully corrected sentence
}

export interface MistakePickSet {
  lesson: string;
  questions: MistakePickQuestion[];
}

const errorCategories = [
  '时态错用 (wrong tense: e.g. past tense required but present used, or vice versa)',
  '主谓不一致 (subject-verb disagreement: singular/plural mismatch)',
  '缺少非谓语动词/多个动词连用 (multiple verbs without non-finite form, e.g. missing -ing or to-infinitive)',
  '缺少谓语动词/缺少系动词be (missing main verb or missing linking verb "be")',
  '主动/被动语态错用 (active/passive voice misuse)',
  '某些词后接动名词/不定式错误 (gerund vs infinitive after certain verbs, e.g. "enjoy to do" → "enjoy doing")',
  '介词后没用动词-ing (missing -ing after preposition)',
  '形容词/副词错用 (adjective vs adverb confusion, e.g. "run quick" → "run quickly")',
  '比较级/最高级错用 (comparative/superlative misuse, e.g. "more better")',
  '-ing/-ed结尾形容词错用 (-ing vs -ed adjective, e.g. "I am boring" → "I am bored")',
  '并列连词/从属连词错用 (coordinating/subordinating conjunction misuse: and/or/but, because/although/etc.)',
  '代词不一致/关系代词错用/不定代词错用 (pronoun disagreement, relative pronoun misuse, indefinite pronoun error)',
  '可数名词单复数错用/可数不可数错用 (countable noun singular/plural misuse, countable/uncountable confusion)',
  '冠词错用/多冠词/少冠词 (article misuse: a/an/the, extra or missing article)',
  '介词错用/多介词/少介词 (wrong preposition, extra or missing preposition)',
  '基数词/序数词错用 (cardinal vs ordinal number misuse, e.g. "the one time" → "the first time")',
];

export async function generateMistakePickQuestions(
  words: { word: string }[],
  lessonNumber: string,
  age: number,
): Promise<MistakePickSet> {
  const wordList = words.map((w) => `"${w.word}"`).join(', ');
  const count = words.length;

  const text = await chat(
    `You are the best English teacher in the world, preparing "error correction" (改错题) exercises for a ${age}-year-old student. The student is learning vocabulary from Lesson ${lessonNumber} and needs to sharpen their ability to spot and fix grammar mistakes — just like the Chinese college entrance exam (高考) error-correction section.

For EACH vocabulary word below, create ONE sentence that:
1. Uses that word naturally in context — the word should feel like it belongs
2. Contains exactly ONE intentional grammar mistake — pick the single error category that is MOST appropriate for that specific word. For example:
   - For a VERB, a tense or voice error is often most fitting
   - For an ADJECTIVE ending in -ing/-ed, an -ing/-ed confusion is most fitting
   - For a NOUN that can be countable/uncountable, a singular/plural or article error is most fitting
   - For a word commonly followed by a gerund/infinitive, that kind of error is most fitting
3. Makes the mistake subtle and realistic — a common error a ${age}-year-old might actually make, not an absurd one
4. Is suitable for a ${age}-year-old's reading level

The error categories you may choose from:
${errorCategories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Return ONLY valid JSON (no markdown, no extra text):
{
  "questions": [
    {
      "sentence": "The sentence containing exactly 1 error",
      "word": "the_vocabulary_word",
      "correction": { "mistake": "wrong → correct", "explanation": "Brief explanation in Chinese", "errorType": "Category name in Chinese" },
      "correctSentence": "The fully corrected sentence"
    }
  ]
}

Rules (IMPORTANT):
- Generate exactly ${count} questions — ONE per vocabulary word, no more, no less
- The vocabulary words are: ${wordList}
- Each question MUST use a DIFFERENT word from the list — cover every single word
- Each question has exactly ONE mistake (not two, not zero)
- Choose the MOST appropriate error category for each word based on its part of speech and nature
- Vary the error categories across words — don't reuse the same category repeatedly unless it's the only fitting one
- The "mistake" field format: "wrong_text → correct_text"
- The "explanation" should be in Chinese (中文), brief and clear for a ${age}-year-old
- The "errorType" should be one of the Chinese category names listed above
- The "correctSentence" must be grammatically perfect
- Sentences should be natural and age-appropriate — don't force words into bizarre contexts`,
    `Create ${count} error-correction sentences — ONE for each vocabulary word: ${wordList}. Lesson ${lessonNumber}, student age ${age}. For each word, pick the single most appropriate error category for that word's nature.`,
    8000,
  );

  const parsed = extractJson(text) as { questions: MistakePickQuestion[] };
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('Invalid mistake-pick response: missing questions array');
  }

  // Validate each question
  for (const q of parsed.questions) {
    if (!q.sentence || !q.correctSentence || !q.correction) {
      throw new Error(`Invalid question format for word "${q.word}": missing required fields`);
    }
    if (!q.correction.mistake || !q.correction.explanation || !q.correction.errorType) {
      throw new Error(`Invalid correction format for word "${q.word}"`);
    }
  }

  return { lesson: lessonNumber, questions: parsed.questions };
}

function extractJson(raw: string): unknown {
  const c = raw.replace(/```json\s*|\s*```/g, '');
  const s = c.indexOf('{'), e = c.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error(`No JSON: ${raw.slice(0,200)}`);
  return JSON.parse(c.slice(s, e + 1));
}
