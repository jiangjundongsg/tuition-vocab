import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sql from '@/lib/db';
import { initDb } from '@/lib/db-init';
import { getCurrentUser } from '@/lib/auth';
import { scoreWords } from '@/lib/wordfreq';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MAX_PDF_BYTES = 32 * 1024 * 1024;

function todayYYMMDD(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(2);
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

    const body = await req.json();
    const { pdf, targetUserIds } = body as { pdf: string; targetUserIds: number[] };

    if (!pdf) return NextResponse.json({ error: 'pdf (base64) is required' }, { status: 400 });
    if (!targetUserIds || targetUserIds.length === 0) {
      return NextResponse.json({ error: 'targetUserIds is required' }, { status: 400 });
    }

    const pdfBytes = Buffer.from(pdf, 'base64');
    if (pdfBytes.length > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF too large (max 32 MB)' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `You are a primary school English teacher assistant. Your only job is to identify vocabulary study words.
Output ONLY a plain word list — one word per line, lowercase. No sentences, no explanations, no extra text.`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdf },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          {
            type: 'text',
            text: `Extract vocabulary study words for primary school students (ages 7–12). Output only words, one per line, lowercase.`,
          },
        ],
      }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Failed to extract words from PDF' }, { status: 500 });
    }

    const extractedWords = content.text
      .split('\n')
      .map((w) => w.trim().toLowerCase().replace(/[^a-z'-]/g, ''))
      .filter((w) => w.length > 1);

    if (extractedWords.length === 0) {
      return NextResponse.json({ error: 'No vocabulary words found in PDF' }, { status: 400 });
    }

    const userRows = await sql`SELECT id, display_name FROM users WHERE id = ANY(${targetUserIds}::int[])`;
    if (userRows.length === 0) {
      return NextResponse.json({ error: 'No valid target users found' }, { status: 400 });
    }

    const uniqueWords = [...new Set(extractedWords)];
    const scored = scoreWords(uniqueWords);

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const targetUser of userRows) {
      const targetId = Number(targetUser.id);
      const displayName = (targetUser.display_name as string) || String(targetId);
      const lessonNumber = `${displayName} ${todayYYMMDD()}`;

      for (const { word, zipf, difficulty } of scored) {
        try {
          await sql`
            INSERT INTO words (word, user_id, zipf_score, difficulty, lesson_number)
            VALUES (${word}, ${targetId}, ${zipf}, ${difficulty}, ${lessonNumber})
            ON CONFLICT (user_id, word) WHERE user_id IS NOT NULL DO UPDATE
              SET zipf_score    = EXCLUDED.zipf_score,
                  difficulty    = EXCLUDED.difficulty,
                  lesson_number = COALESCE(EXCLUDED.lesson_number, words.lesson_number)
          `;
          totalInserted++;
        } catch {
          totalSkipped++;
        }
      }
    }

    return NextResponse.json({ inserted: totalInserted, skipped: totalSkipped, words: extractedWords });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('PDF upload error:', message);
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
