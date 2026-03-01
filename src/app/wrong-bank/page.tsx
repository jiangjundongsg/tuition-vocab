'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import WrongBankList from '@/components/WrongBankList';
import RepracticeSession from '@/components/RepracticeSession';

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

  if (!authChecked) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-100 rounded w-40" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  const byLesson = items.reduce<Record<string, WrongItem[]>>((acc, item) => {
    const key = item.lessonNumber ?? 'No Lesson';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // ── Repractice session view ───────────────────────────────────────────────
  if (practicingLesson !== null) {
    const sessionItems = byLesson[practicingLesson] ?? [];
    return (
      <div className="space-y-4">
        <button
          onClick={() => setPracticingLesson(null)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tricky Words
        </button>
        <RepracticeSession
          items={sessionItems}
          lessonLabel={practicingLesson === 'No Lesson' ? practicingLesson : practicingLesson}
          onDone={() => {
            setPracticingLesson(null);
            fetchItems(); // refresh list after session
          }}
        />
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-900">Tricky Words</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Questions you&apos;ve answered incorrectly. Pick a lesson and practise them again.
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <WrongBankList items={[]} />
      ) : (
        <div className="space-y-6">
          {Object.entries(byLesson).sort().map(([lesson, lessonItems]) => (
            <div key={lesson} className="space-y-2">
              {/* Lesson header with Practice button */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {lesson === 'No Lesson' ? 'No Lesson' : `Lesson ${lesson}`}
                  {' '}· {lessonItems.length} question{lessonItems.length !== 1 ? 's' : ''}
                </h2>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <WrongBankList items={lessonItems} />

              {/* Practice button for this lesson */}
              <div className="flex justify-end">
                <button
                  onClick={() => setPracticingLesson(lesson)}
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
