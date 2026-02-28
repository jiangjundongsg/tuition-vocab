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

function loadParagraphs(): string[] {
  if (paragraphs) return paragraphs;

  const filePath = path.join(process.cwd(), 'data', 'TextBook_Harry_Portter.txt');
  const content = fs.readFileSync(filePath, 'utf-8');

  paragraphs = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length >= 50 && !isChapterHeader(line));

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
