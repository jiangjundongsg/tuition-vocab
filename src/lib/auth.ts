import { cookies } from 'next/headers';
import sql from './db';

const USER_COOKIE = 'vocab_user_id';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
  role: string; // 'student' | 'teacher' | 'admin'
  age: number | null;
  lastLesson: string | null;
  lastDictationLesson: string | null;
  passageSource: string;
  // Per-user question config
  numComprehension: number;
  numBlanks: number;
  blankZipfMax: number;
  passageWordCount: number;
  compQuestionType: string;
  enableMcqMeaning: boolean;
  enableMcqSynonym: boolean;
  enableMcqAntonym: boolean;
  enableComprehension: boolean;
  enableFillBlank: boolean;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get(USER_COOKIE)?.value;
    if (!userIdStr) return null;

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) return null;

    const rows = await sql`
      SELECT id, email, display_name, role, age, last_lesson, last_dictation_lesson, passage_source,
             num_comprehension, num_blanks, blank_zipf_max, passage_word_count, comp_question_type,
             enable_mcq_meaning, enable_mcq_synonym, enable_mcq_antonym,
             enable_comprehension, enable_fill_blank
      FROM users WHERE id = ${userId}
    `;

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      id: Number(r.id),
      email: r.email as string,
      displayName: r.display_name as string | null,
      role: (r.role as string) ?? 'student',
      age: r.age != null ? Number(r.age) : null,
      lastLesson: r.last_lesson as string | null,
      lastDictationLesson: r.last_dictation_lesson as string | null,
      passageSource: (r.passage_source as string) || 'TextBook_Harry_Portter',
      numComprehension: Number(r.num_comprehension) || 2,
      numBlanks: Number(r.num_blanks) || 5,
      blankZipfMax: Number(r.blank_zipf_max) || 4.2,
      passageWordCount: Number(r.passage_word_count) || 150,
      compQuestionType: (r.comp_question_type as string) || 'mcq',
      enableMcqMeaning: r.enable_mcq_meaning !== false,
      enableMcqSynonym: r.enable_mcq_synonym === true,
      enableMcqAntonym: r.enable_mcq_antonym === true,
      enableComprehension: r.enable_comprehension !== false,
      enableFillBlank: r.enable_fill_blank !== false,
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
