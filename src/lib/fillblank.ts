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
 * The target word is always a blank. Up to 4 additional blanks are chosen
 * from words with zipf_score > 3.50 (length ≥ 4, not stopwords).
 * Total blanks: up to 5.
 */
export function generateFillBlank(paragraph: string, targetWord: string): FillBlankQuestion {
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

  // Find target word position (required blank)
  const targetLower = targetWord.toLowerCase();
  const targetIndex = tokens.findIndex((t) => t.word.toLowerCase() === targetLower);

  if (targetIndex === -1) {
    // Target word not found — just use a single-blank question
    return {
      type: 'fill_blank',
      displayText: `{{0}} ... ${paragraph.slice(0, 80)}...`,
      blanks: [{ id: 0, original: targetWord, hint: makeHint(targetWord) }],
    };
  }

  // Candidate words for additional blanks:
  // - not the target word
  // - length ≥ 4
  // - not a stopword
  // - zipf score < 4.2 (less common / harder words — better for fill-in-blank)
  const candidates = tokens
    .map((t, i) => ({ ...t, i }))
    .filter(({ i, word }) => {
      if (i === targetIndex) return false;
      const w = word.toLowerCase();
      if (w.length < 4) return false;
      if (STOPWORDS.has(w)) return false;
      if (!/^[a-z]/.test(w)) return false;
      const zipf = getZipfScore(w);
      if (zipf === null || zipf >= 4.2) return false;
      return true;
    });

  // Shuffle candidates and pick up to 4 additional blanks (total 5 with target)
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const extra = shuffled.slice(0, 4);

  // Collect all blank positions sorted by appearance in text
  const blankPositions = [
    { ...tokens[targetIndex], i: targetIndex },
    ...extra,
  ].sort((a, b) => a.start - b.start);

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
