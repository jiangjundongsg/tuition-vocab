import { cookies } from 'next/headers';
import sql from './db';

const USER_COOKIE = 'vocab_user_id';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get(USER_COOKIE)?.value;
    if (!userIdStr) return null;

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) return null;

    const rows = await sql`
      SELECT id, email, display_name FROM users WHERE id = ${userId}
    `;

    if (rows.length === 0) return null;

    return {
      id: Number(rows[0].id),
      email: rows[0].email as string,
      displayName: rows[0].display_name as string | null,
    };
  } catch {
    return null;
  }
}

export async function setUserCookie(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE, String(userId), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
}

export async function clearUserCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(USER_COOKIE);
}
