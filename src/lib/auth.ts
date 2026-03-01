import { cookies } from 'next/headers';
import sql from './db';

const USER_COOKIE = 'vocab_user_id';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
  role: string; // 'student' | 'teacher' | 'admin'
  age: number | null;
  passageSource: string;
  // Per-user question config
  numComprehension: number;
  numBlanks: number;
  blankZipfMax: number;
  passageWordCount: number;
  compQuestionType: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get(USER_COOKIE)?.value;
    if (!userIdStr) return null;

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) return null;

    const rows = await sql`
      SELECT id, email, display_name, role, age, passage_source,
             num_comprehension, num_blanks, blank_zipf_max, passage_word_count, comp_question_type
      FROM users WHERE id = ${userId}
    `;

    if (rows.length === 0) return null;

    return {
      id: Number(rows[0].id),
      email: rows[0].email as string,
      displayName: rows[0].display_name as string | null,
      role: (rows[0].role as string) ?? 'student',
      age: rows[0].age != null ? Number(rows[0].age) : null,
      passageSource: (rows[0].passage_source as string) || 'TextBook_Harry_Portter',
      numComprehension: Number(rows[0].num_comprehension) || 2,
      numBlanks: Number(rows[0].num_blanks) || 5,
      blankZipfMax: Number(rows[0].blank_zipf_max) || 4.2,
      passageWordCount: Number(rows[0].passage_word_count) || 150,
      compQuestionType: (rows[0].comp_question_type as string) || 'mcq',
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
