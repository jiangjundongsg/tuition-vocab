import fs from 'fs';
import path from 'path';

// Cache paragraphs per source file
const cache = new Map<string, string[]>();

function isChapterHeader(line: string): boolean {
  if (line.length < 3) return true;
  const upper = line.toUpperCase();
  if (upper === line && line.length < 100) return true;
  if (/^(chapter|book|part|section)\s+/i.test(line)) return true;
  if (/^\*+$/.test(line.trim())) return true;
  return false;
}

function hasEncodingIssues(line: string): boolean {
  if (line.includes('\uFFFD')) return true;
  const nonPrintable = (line.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) ?? []).length;
  if (nonPrintable > 0) return true;
  return false;
}

/** Replace Windows-1252 / Latin-1 special characters with clean ASCII equivalents. */
function cleanLine(line: string): string {
  return line
    .replace(/[\x91\x92\u2018\u2019]/g, "'")
    .replace(/[\x93\x94\u201C\u201D]/g, '"')
    .replace(/[\x96\x97\u2013\u2014]/g, '-')
    .replace(/[\x85\u2026]/g, '...')
    .replace(/\xA0/g, ' ')
    .replace(/[\x80-\x84\x86-\x90\x95\x98\x99\x9A-\x9F]/g, '')
    // Strip Latin-1 supplement punctuation / symbols (A1–BF) that appear as garbage
    .replace(/[\xA1-\xBF]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function loadParagraphs(source: string): string[] {
  const cached = cache.get(source);
  if (cached) return cached;

  // Sanitise source: only allow alphanumeric, underscores, hyphens
  const safeName = source.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(process.cwd(), 'data', `${safeName}.txt`);

  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'latin1');

  const paragraphs = content
    .split('\n')
    .map((line) => cleanLine(line))
    .filter((line) => line.length >= 50 && !isChapterHeader(line) && !hasEncodingIssues(line));

  cache.set(source, paragraphs);
  return paragraphs;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find a paragraph containing the target word (whole-word, case-insensitive).
 * Returns a random paragraph from the top 5 matches for variety.
 * Returns null if the source file doesn't exist or the word isn't found.
 */
export function findParagraphForWord(
  word: string,
  source = 'TextBook_Harry_Portter',
): string | null {
  try {
    const paras = loadParagraphs(source);
    if (paras.length === 0) return null;

    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    const matches = paras.filter((p) => regex.test(p));

    if (matches.length === 0) return null;

    const topMatches = matches.slice(0, 5);
    return topMatches[Math.floor(Math.random() * topMatches.length)];
  } catch {
    return null;
  }
}
