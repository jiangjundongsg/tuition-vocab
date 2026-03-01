import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { scoreWords } from '@/lib/wordfreq';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_PDF_BYTES = 32 * 1024 * 1024; // 32 MB — Claude's PDF limit

function todayYYYYMMDD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export async function POST(req: NextRequest) {
  try {
    await initDb();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('pdf') as File | null;
    const lessonOverride = (formData.get('lessonNumber') as string | null)?.trim() || null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    // Accept application/pdf or files with .pdf extension (some browsers omit MIME type)
    const isPDF = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength === 0) {
      return NextResponse.json({ error: 'The PDF file appears to be empty' }, { status: 400 });
    }
    if (bytes.byteLength > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF is too large (max 32 MB)' }, { status: 400 });
    }

    const base64 = Buffer.from(bytes).toString('base64');

    // Use claude-sonnet-4-6 which has confirmed document/PDF support
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            {
              type: 'text',
              text: `Extract all vocabulary words from this document. These are English words that primary school students need to learn.

Return ONLY a plain list of words, one word per line, in lowercase, with no numbers, no punctuation, no explanations, no extra text.

Example output:
curious
magnificent
ambitious`,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Failed to extract words from PDF' }, { status: 500 });
    }

    // Parse and clean extracted words
    const extractedWords = content.text
      .split('\n')
      .map((w) => w.trim().toLowerCase().replace(/[^a-z'-]/g, ''))
      .filter((w) => w.length > 1);

    if (extractedWords.length === 0) {
      return NextResponse.json(
        { error: 'No vocabulary words could be found in the PDF. Please check the file contents.' },
        { status: 400 }
      );
    }

    // Use provided lesson number or default to today's date
    const lessonNumber = lessonOverride || todayYYYYMMDD();

    // Deduplicate
    const uniqueWords = [...new Set(extractedWords)];
    const scored = scoreWords(uniqueWords);

    const inserted: Array<{
      word: string;
      zipf: number | null;
      difficulty: string;
      lessonNumber: string;
    }> = [];
    const skipped: string[] = [];

    for (const { word, zipf, difficulty } of scored) {
      try {
        await sql`
          INSERT INTO words (word, zipf_score, difficulty, lesson_number)
          VALUES (${word}, ${zipf}, ${difficulty}, ${lessonNumber})
          ON CONFLICT (word) DO UPDATE
            SET zipf_score    = EXCLUDED.zipf_score,
                difficulty    = EXCLUDED.difficulty,
                lesson_number = COALESCE(EXCLUDED.lesson_number, words.lesson_number)
        `;
        inserted.push({ word, zipf, difficulty, lessonNumber });
      } catch {
        skipped.push(word);
      }
    }

    return NextResponse.json({
      inserted: inserted.length,
      skipped: skipped.length,
      words: inserted,
      lessonNumber,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('PDF upload error:', message);
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
