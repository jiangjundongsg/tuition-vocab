import { getZipfScore } from './wordfreq';

export interface FillBlankQuestion {
  type: 'fill_blank';
  displayText: string;  // paragraph text with {{N}} placeholders for each blank
  blanks: Array<{
    id: number;
    original: string;  // the actual word to fill
    hint: string;      // first letter + underscores e.g. "c_____" for "curious"
  }>;
}

const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'they', 'have', 'been', 'were', 'their',
  'what', 'when', 'where', 'will', 'would', 'could', 'should', 'which',
  'there', 'than', 'then', 'into', 'over', 'also', 'just', 'like', 'some',
  'time', 'very', 'more', 'most', 'much', 'only', 'said', 'your', 'about',
  'after', 'before', 'other', 'even', 'back', 'well', 'such', 'each', 'both',
  'once', 'does', 'itself', 'them', 'those', 'these', 'here', 'come', 'came',
  'know', 'look', 'make', 'made', 'take', 'took', 'went', 'going', 'being',
  'having', 'because', 'through', 'while', 'still', 'again', 'never',
]);

function makeHint(word: string): string {
  if (word.length <= 1) return '_';
  return word[0] + '_'.repeat(word.length - 1);
}

/**
 * Generate a fill-in-blank question from a paragraph + target word.
 * @param paragraph    The passage text
 * @param targetWord   Always included as one blank
 * @param numBlanks    Total number of blanks (default 5, configurable by teacher)
 * @param zipfMax      Max zipf score for candidates (default 4.2 — picks harder words)
 */
export function generateFillBlank(
  paragraph: string,
  targetWord: string,
  numBlanks = 5,
  zipfMax = 4.2,
): FillBlankQuestion {
  // Tokenize: find all word tokens with their positions
  const tokens: Array<{ word: string; start: number; end: number }> = [];
  const wordRegex = /\b([a-zA-Z'-]+)\b/g;
  let match;

  while ((match = wordRegex.exec(paragraph)) !== null) {
    tokens.push({
      word: match[1],
      start: match.index,
      end: match.index + match[1].length,
    });
  }

  // Find target word position — required blank.
  // 1) Try exact case-insensitive match.
  // 2) Fallback: prefix/stem match for inflected forms (e.g. "curious" → "curiously").
  const targetLower = targetWord.toLowerCase();
  let targetIndex = tokens.findIndex((t) => t.word.toLowerCase() === targetLower);

  if (targetIndex === -1 && targetLower.length > 2) {
    targetIndex = tokens.findIndex((t) => {
      const tl = t.word.toLowerCase();
      return tl.startsWith(targetLower) || targetLower.startsWith(tl);
    });
  }
  // targetIndex may still be -1 if the word simply isn't in the passage.
  // In that case we proceed without a forced blank — candidates fill all slots.
  // The full paragraph is always shown (no "..." truncation).

  // Candidate words: length ≥ 4, not stopword, zipf < zipfMax (harder/less common words)
  // When targetIndex === -1, no token is excluded by the index check (no index equals -1).
  const candidates = tokens
    .map((t, i) => ({ ...t, i }))
    .filter(({ i, word }) => {
      if (i === targetIndex) return false;
      const w = word.toLowerCase();
      if (w.length < 4) return false;
      if (STOPWORDS.has(w)) return false;
      if (!/^[a-z]/.test(w)) return false;
      const zipf = getZipfScore(w);
      if (zipf === null || zipf >= zipfMax) return false;
      return true;
    });

  // Shuffle and pick extras — one fewer slot when we have a forced target blank
  const extraSlots = targetIndex !== -1 ? numBlanks - 1 : numBlanks;
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const extra = shuffled.slice(0, extraSlots);

  // Collect all blank positions sorted by appearance in text
  const blankPositions = [
    ...(targetIndex !== -1 ? [{ ...tokens[targetIndex], i: targetIndex }] : []),
    ...extra,
  ].sort((a, b) => a.start - b.start);

  // If we couldn't find any blanks at all, return the full paragraph with no inputs
  if (blankPositions.length === 0) {
    return { type: 'fill_blank', displayText: paragraph, blanks: [] };
  }

  // Build display text with {{N}} placeholders
  let displayText = '';
  let lastEnd = 0;
  const blanks: FillBlankQuestion['blanks'] = [];

  blankPositions.forEach((pos, blankId) => {
    displayText += paragraph.slice(lastEnd, pos.start);
    displayText += `{{${blankId}}}`;
    lastEnd = pos.end;
    blanks.push({
      id: blankId,
      original: pos.word,
      hint: makeHint(pos.word),
    });
  });
  displayText += paragraph.slice(lastEnd);

  return { type: 'fill_blank', displayText, blanks };
}
