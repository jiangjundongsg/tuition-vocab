import wordfreqData from '../../data/wordfreq-en-25000.json';

// Build a lookup map: word -> zipf score
let wordMap: Map<string, number> | null = null;

function getWordMap(): Map<string, number> {
  if (wordMap) return wordMap;

  wordMap = new Map<string, number>();
  const data = wordfreqData as [string, number][];

  for (const [word, logFreq] of data) {
    // Convert natural log frequency to Zipf score
    // zipf = (logFreq * log10(e)) + 9
    const zipf = logFreq * 0.4343 + 9;
    wordMap.set(word.toLowerCase(), zipf);
  }

  return wordMap;
}

export function getZipfScore(word: string): number | null {
  const map = getWordMap();
  return map.get(word.toLowerCase()) ?? null;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export function getDifficulty(word: string): { zipf: number | null; difficulty: Difficulty } {
  const zipf = getZipfScore(word);

  if (zipf === null) {
    return { zipf: null, difficulty: 'hard' };
  }

  let difficulty: Difficulty;
  if (zipf >= 5.5) {
    difficulty = 'easy';
  } else if (zipf >= 4.0) {
    difficulty = 'medium';
  } else {
    difficulty = 'hard';
  }

  return { zipf, difficulty };
}

export function scoreWords(words: string[]): Array<{
  word: string;
  zipf: number | null;
  difficulty: Difficulty;
}> {
  return words
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0)
    .map((word) => {
      const { zipf, difficulty } = getDifficulty(word);
      return { word, zipf, difficulty };
    });
}
