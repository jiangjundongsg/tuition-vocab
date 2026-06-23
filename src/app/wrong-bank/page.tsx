'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import WrongBankList from '@/components/WrongBankList';
import RepracticeSession, { SessionData } from '@/components/RepracticeSession';

interface WrongItem {
  id: number;
  wordId: number;
  wordSetId: number;
  word: string;
  lessonNumber: string | null;
  questionKey: string;
  typeLabel: string;
  wrongCount: number;
  lastWrongAt: string;
}

export default function WrongBankPage() {
  const router = useRouter();
  const [items, setItems] = useState<WrongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [practicingLesson, setPracticingLesson] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<SessionData | null>(null);
  const [showResume, setShowResume] = useState(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.replace('/login?message=login-required');
        else setAuthChecked(true);
      })
      .catch(() => router.replace('/login?message=login-required'));
  }, [router]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wrong-bank');
      const data = await res.json();
      if (res.ok) setItems(data.items ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (authChecked) fetchItems();
  }, [authChecked, fetchItems]);

  // Auto-open a lesson passed via ?lesson= (e.g. arriving from Mistake Pick)
  useEffect(() => {
    if (!authChecked || loading || autoOpenedRef.current) return;
    const lesson = new URLSearchParams(window.location.search).get('lesson');
    if (!lesson) return;
    autoOpenedRef.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    if (items.some((i) => (i.lessonNumber ?? 'No Lesson') === lesson)) {
      startPracticingLesson(lesson);
    }
  }, [authChecked, loading, items]);

  const handleSave = useCallback(async (data: SessionData) => {
    try {
      await fetch('/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch { /* silent */ }
  }, []);

  const handleClear = useCallback(async () => {
    if (!practicingLesson) return;
    try {
      await fetch(`/api/practice/session?type=wrong_bank&lesson=${encodeURIComponent(practicingLesson)}`, {
        method: 'DELETE',
      });
    } catch { /* silent */ }
  }, [practicingLesson]);

  if (!authChecked) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-stone-100 rounded w-40" />
        <div className="h-32 bg-stone-100 rounded-2xl" />
      </div>
    );
  }

  const byLesson = items.reduce<Record<string, WrongItem[]>>((acc, item) => {
    const key = item.lessonNumber ?? 'No Lesson';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  async function startPracticingLesson(lesson: string) {
    // Mark tricky_clicked for this lesson
    fetch('/api/lessons/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson, step: 'tricky' }),
    }).catch(() => {});
    // Check for saved session
    try {
      const res = await fetch(`/api/practice/session?type=wrong_bank&lesson=${encodeURIComponent(lesson)}`);
      const d = await res.json();
      if (d.session) {
        setSavedSession(d.session);
        setShowResume(true);
        setPracticingLesson(lesson);
        return;
      }
    } catch { /* proceed */ }
    setSavedSession(null);
    setShowResume(false);
    setPracticingLesson(lesson);
  }

  // ── Repractice session view ───────────────────────────────────────────────
  if (practicingLesson !== null) {
    const sessionItems = byLesson[practicingLesson] ?? [];

    // Resume prompt
    if (showResume && savedSession) {
      return (
        <div className="space-y-6">
          <button
            onClick={() => { setPracticingLesson(null); setShowResume(false); setSavedSession(null); }}
            className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-700 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tricky Words
          </button>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-amber-900">Unfinished Session</h2>
            <p className="text-sm text-amber-700">
              You have an unfinished review for <strong>Lesson {practicingLesson}</strong>.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setShowResume(false)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                Resume Session
              </button>
              <button
                onClick={() => { setSavedSession(null); setShowResume(false); }}
                className="bg-white border border-stone-200 text-stone-600 hover:text-stone-800 font-medium px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <button
          onClick={() => setPracticingLesson(null)}
          className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-700 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tricky Words
        </button>
        <RepracticeSession
          items={sessionItems}
          lessonLabel={practicingLesson}
          onDone={() => {
            setPracticingLesson(null);
            fetchItems();
          }}
          initialSession={savedSession}
          onSave={handleSave}
          onClear={handleClear}
        />
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-stone-900">Tricky Words</h1>
        <p className="text-stone-400 mt-1 text-sm">
          Questions you&apos;ve answered incorrectly. Pick a lesson and practise them again.
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-stone-100 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <WrongBankList items={[]} />
      ) : (
        <div className="space-y-6">
          {Object.entries(byLesson).sort().map(([lesson, lessonItems]) => (
            <div key={lesson} className="space-y-2">
              {/* Lesson header with Practice button */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-stone-200" />
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-stone-400">
                  <svg className="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  {lesson === 'No Lesson' ? 'No Lesson' : `Lesson ${lesson}`}
                  {' '}· {lessonItems.length} question{lessonItems.length !== 1 ? 's' : ''}
                </h2>
                <div className="h-px flex-1 bg-stone-200" />
              </div>

              <WrongBankList items={lessonItems} />

              {/* Practice button for this lesson */}
              <div className="flex justify-end">
                <button
                  onClick={() => startPracticingLesson(lesson)}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Practice {lessonItems.length} question{lessonItems.length !== 1 ? 's' : ''} →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
