import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { scoreWords } from '@/lib/wordfreq';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

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
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPEG, PNG, GIF, or WebP image.' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Ask Claude vision to extract vocabulary words from the image
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: file.type as AllowedType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Extract all vocabulary words from this image. These are English words that primary school students need to learn.

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
      return NextResponse.json({ error: 'Failed to extract words from image' }, { status: 500 });
    }

    // Parse and clean extracted words
    const extractedWords = content.text
      .split('\n')
      .map((w) => w.trim().toLowerCase().replace(/[^a-z'-]/g, ''))
      .filter((w) => w.length > 1);

    if (extractedWords.length === 0) {
      return NextResponse.json(
        { error: 'No vocabulary words could be found in the image. Please try a clearer photo.' },
        { status: 400 }
      );
    }

    // Lesson number = today's date in yyyymmdd format
    const lessonNumber = todayYYYYMMDD();

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
    console.error('Photo upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
