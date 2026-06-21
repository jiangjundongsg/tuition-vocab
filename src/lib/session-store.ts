/**
 * Session store — persists in-progress practice/dictation/repractice state
 * so users can resume after logout / browser close / crash.
 */
import sql from './db';

export interface SessionData {
  type: 'practice' | 'dictation' | 'wrong_bank';
  lesson: string;
  phase: string;
  currentWordIndex: number;
  repracticeIndex: number;
  /** Record keyed by question key (string) or wrongBankId (serialized as string) */
  submitted: Record<string, boolean>;
  correct: Record<string, boolean>;
  answers: Record<string, string>;
}

export async function saveSession(userId: number, data: SessionData): Promise<void> {
  await sql`
    INSERT INTO practice_sessions (user_id, session_type, lesson_number, phase,
      current_word_index, repractice_index, submitted_json, correct_json, answers_json)
    VALUES (${userId}, ${data.type}, ${data.lesson}, ${data.phase},
      ${data.currentWordIndex}, ${data.repracticeIndex},
      ${JSON.stringify(data.submitted)}, ${JSON.stringify(data.correct)}, ${JSON.stringify(data.answers)})
    ON CONFLICT (user_id, session_type, lesson_number)
    DO UPDATE SET
      phase = EXCLUDED.phase,
      current_word_index = EXCLUDED.current_word_index,
      repractice_index = EXCLUDED.repractice_index,
      submitted_json = EXCLUDED.submitted_json,
      correct_json = EXCLUDED.correct_json,
      answers_json = EXCLUDED.answers_json,
      updated_at = now()
  `;
}

export async function loadSession(
  userId: number,
  type: string,
  lesson: string,
): Promise<SessionData | null> {
  const rows = await sql`
    SELECT * FROM practice_sessions
    WHERE user_id = ${userId}
      AND session_type = ${type}
      AND lesson_number = ${lesson}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    type: r.session_type as SessionData['type'],
    lesson: r.lesson_number as string,
    phase: r.phase as string,
    currentWordIndex: r.current_word_index as number,
    repracticeIndex: r.repractice_index as number,
    submitted: (safeJson(r.submitted_json) as Record<string, boolean>) ?? {},
    correct: (safeJson(r.correct_json) as Record<string, boolean>) ?? {},
    answers: (safeJson(r.answers_json) as Record<string, string>) ?? {},
  };
}

export async function deleteSession(
  userId: number,
  type: string,
  lesson: string,
): Promise<void> {
  await sql`
    DELETE FROM practice_sessions
    WHERE user_id = ${userId}
      AND session_type = ${type}
      AND lesson_number = ${lesson}
  `;
}

function safeJson(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string') return null;
  try { return JSON.parse(raw); } catch { return null; }
}
