import { randomBytes, createHash } from 'crypto';
import sql from './db';

// One-time tokens for password reset. Only a SHA-256 hash is stored; the raw
// token lives only in the emailed link. Single-use (used_at) + expiring.

export type TokenPurpose = 'reset';

const TTL_HOURS: Record<TokenPurpose, number> = { reset: 1 };

const hashToken = (raw: string) => createHash('sha256').update(raw).digest('hex');

/**
 * Create a token for (userId, purpose) and return the RAW token to email.
 * Any prior unused token of the same purpose is invalidated first.
 */
export async function createAuthToken(userId: number, purpose: TokenPurpose): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + TTL_HOURS[purpose] * 3_600_000).toISOString();
  await sql`UPDATE auth_tokens SET used_at = now() WHERE user_id = ${userId} AND purpose = ${purpose} AND used_at IS NULL`;
  await sql`
    INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at)
    VALUES (${userId}, ${hashToken(raw)}, ${purpose}, ${expires}::timestamptz)
  `;
  await sql`DELETE FROM auth_tokens WHERE expires_at < now() - interval '7 days'`; // opportunistic cleanup
  return raw;
}

/** Consume a raw token; returns the user id if valid (unused + unexpired), else null. */
export async function consumeAuthToken(raw: string, purpose: TokenPurpose): Promise<number | null> {
  if (!raw) return null;
  const rows = await sql`
    SELECT id, user_id FROM auth_tokens
    WHERE token_hash = ${hashToken(raw)} AND purpose = ${purpose}
      AND used_at IS NULL AND expires_at > now()
  `;
  if (rows.length === 0) return null;
  await sql`UPDATE auth_tokens SET used_at = now() WHERE id = ${rows[0].id}`;
  return Number(rows[0].user_id);
}

/** How many tokens were issued for (userId, purpose) in the last hour (rate-limit). */
export async function recentTokenCount(userId: number, purpose: TokenPurpose): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*) AS n FROM auth_tokens
    WHERE user_id = ${userId} AND purpose = ${purpose} AND created_at > now() - interval '1 hour'
  `;
  return Number(rows[0].n);
}
