import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import sql from './db';

const COOKIE_NAME = 'vocab_session';

export async function getOrCreateSession(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME);

  if (existing?.value) {
    // Verify it exists in DB
    const rows = await sql`
      SELECT session_id FROM sessions WHERE session_id = ${existing.value}
    `;
    if (rows.length > 0) {
      return existing.value;
    }
  }

  // Create new session
  const sessionId = uuidv4();
  await sql`
    INSERT INTO sessions (session_id) VALUES (${sessionId})
    ON CONFLICT DO NOTHING
  `;

  // Set cookie (HttpOnly, 1 year)
  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return sessionId;
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}
