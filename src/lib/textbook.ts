import fs from 'fs';
import path from 'path';

let paragraphs: string[] | null = null;

function isChapterHeader(line: string): boolean {
  // Filter out chapter headers, titles, and section markers
  if (line.length < 3) return true;
  const upper = line.toUpperCase();
  if (upper === line && line.length < 100) return true; // ALL CAPS short lines
  if (/^(chapter|book|part|section)\s+/i.test(line)) return true;
  if (/^\*+$/.test(line.trim())) return true; // lines of asterisks
  return false;
}

function hasEncodingIssues(line: string): boolean {
  // Unicode replacement character — appears as black diamond with ?
  if (line.includes('\uFFFD')) return true;
  // High ratio of non-ASCII / non-printable characters
  const nonPrintable = (line.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g) ?? []).length;
  if (nonPrintable > 0) return true;
  return false;
}

/** Replace Windows-1252 / Latin-1 special characters with clean ASCII equivalents. */
function cleanLine(line: string): string {
  return line
    // Curly / smart single quotes → straight apostrophe
    .replace(/[\x91\x92\u2018\u2019]/g, "'")
    // Curly / smart double quotes → straight double quote
    .replace(/[\x93\x94\u201C\u201D]/g, '"')
    // En dash / em dash → hyphen
    .replace(/[\x96\x97\u2013\u2014]/g, '-')
    // Ellipsis character → three dots
    .replace(/[\x85\u2026]/g, '...')
    // Non-breaking space → regular space
    .replace(/\xA0/g, ' ')
    // Bullet / dagger / other Windows-1252 symbols → removed
    .replace(/[\x80-\x84\x86-\x90\x95\x98\x99\x9A-\x9F]/g, '')
    // Collapse multiple spaces
    .replace(/ {2,}/g, ' ')
    .trim();
}

function loadParagraphs(): string[] {
  if (paragraphs) return paragraphs;

  const filePath = path.join(process.cwd(), 'data', 'TextBook_Harry_Portter.txt');
  // Read as latin1 (covers Windows-1252) to avoid Unicode replacement characters
  const content = fs.readFileSync(filePath, 'latin1');

  paragraphs = content
    .split('\n')
    .map((line) => cleanLine(line))
    .filter((line) => line.length >= 50 && !isChapterHeader(line) && !hasEncodingIssues(line));

  return paragraphs;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find a paragraph containing the target word (whole-word, case-insensitive match).
 * Returns a random paragraph from the top 5 matches for variety.
 * Returns null if the word is not found.
 */
export function findParagraphForWord(word: string): string | null {
  try {
    const paras = loadParagraphs();
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    const matches = paras.filter((p) => regex.test(p));

    if (matches.length === 0) return null;

    const topMatches = matches.slice(0, 5);
    return topMatches[Math.floor(Math.random() * topMatches.length)];
  } catch {
    return null;
  }
}
