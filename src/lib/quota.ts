/**
 * Per-user daily AI call quota — shared by every route that calls the AI.
 *
 * Sentence evaluation and mistake-pick are NEVER cached, so they spend a quota
 * unit on every submission. Passage/question generation is cached in word_sets,
 * so it only spends quota the first time a word is practiced. Keep the limit
 * generous enough that a heavy practice day doesn't block sentence writing.
 *
 * Override with the DAILY_AI_LIMIT env var.
 */
import sql from '@/lib/db';

export const DAILY_AI_LIMIT = Number(process.env.DAILY_AI_LIMIT) || 200;

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Throws if the user has reached the daily AI limit. */
export async function checkAiQuota(userId: number): Promise<void> {
  const rows = await sql`SELECT ai_calls_today, ai_date FROM users WHERE id = ${userId}`;
  const calls = Number(rows[0]?.ai_calls_today ?? 0);
  const date = rows[0]?.ai_date as string | null;
  const effective = date === today() ? calls : 0;
  if (effective >= DAILY_AI_LIMIT) {
    throw new Error(`Daily AI limit reached (${DAILY_AI_LIMIT} calls). Try again tomorrow.`);
  }
}

/** Adds `count` to the user's AI calls for today (resetting on a new day). */
export async function incrementAiQuota(userId: number, count: number): Promise<void> {
  const t = today();
  await sql`
    UPDATE users SET
      ai_calls_today = CASE WHEN ai_date = ${t} THEN ai_calls_today + ${count} ELSE ${count} END,
      ai_date = ${t}
    WHERE id = ${userId}
  `;
}
