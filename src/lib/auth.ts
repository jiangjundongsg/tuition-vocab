import { cookies } from 'next/headers';
import sql from './db';

const USER_COOKIE = 'vocab_user_id';

export interface AuthUser {
  id: number;
  email: string | null;
  username: string | null;
  displayName: string | null;
  role: string; // 'student' | 'teacher' | 'admin'
  status: string; // 'pending' | 'approved' | 'rejected'
  teacherId: number | null; // approving teacher (students only)
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
  enableSentenceWriting: boolean;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const userIdStr = cookieStore.get(USER_COOKIE)?.value;
    if (!userIdStr) return null;

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId)) return null;

    const rows = await sql`
      SELECT id, email, username, display_name, role, status, teacher_id, age,
             last_lesson, last_dictation_lesson, passage_source,
             num_comprehension, num_blanks, blank_zipf_max, passage_word_count, comp_question_type,
             enable_mcq_meaning, enable_mcq_synonym, enable_mcq_antonym,
             enable_comprehension, enable_fill_blank, enable_sentence_writing
      FROM users WHERE id = ${userId}
    `;

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      id: Number(r.id),
      email: r.email as string | null,
      username: r.username as string | null,
      displayName: r.display_name as string | null,
      role: (r.role as string) ?? 'student',
      status: (r.status as string) ?? 'approved',
      teacherId: r.teacher_id != null ? Number(r.teacher_id) : null,
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
      enableSentenceWriting: r.enable_sentence_writing === true,
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

// ── Teacher ↔ student ownership ──────────────────────────────────────────────

/** IDs of every student belonging to a teacher (the students they may manage). */
export async function studentIdsOf(teacherId: number): Promise<number[]> {
  const rows = await sql`SELECT id FROM users WHERE teacher_id = ${teacherId}`;
  return rows.map((r) => Number(r.id));
}

/**
 * Whether `user` may view/manage the student with id `studentId`.
 * admin → any user; teacher → only students whose teacher_id is theirs.
 */
export async function canManageStudent(user: AuthUser, studentId: number): Promise<boolean> {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  const rows = await sql`SELECT 1 FROM users WHERE id = ${studentId} AND teacher_id = ${user.id}`;
  return rows.length > 0;
}
