'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import WrongBankList from '@/components/WrongBankList';
import RepracticeSession, { SessionData } from '@/components/RepracticeSession';
import LessonTable, { LessonRow } from '@/components/LessonTable';

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
  const [lessonRows, setLessonRows] = useState<LessonRow[]>([]);
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

  // Lesson metadata (upload date + status) to enrich the tricky-words table.
  useEffect(() => {
    if (!authChecked) return;
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((d) => setLessonRows(d.lessonRows ?? []))
      .catch(() => {});
  }, [authChecked]);

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

  // Rows for the lesson table: one per lesson that has tricky words, enriched
  // with upload date + status from /api/lessons. Sorted by last attended, then
  // first-upload date, both descending (matching the other sections).
  const metaByLesson = Object.fromEntries(lessonRows.map((r) => [r.lessonNumber, r]));
  const trickyCounts = Object.fromEntries(Object.entries(byLesson).map(([k, v]) => [k, v.length]));
  const lessonTableRows: LessonRow[] = Object.keys(byLesson)
    .map((key) => metaByLesson[key] ?? {
      lessonNumber: key,
      uploadedAt: null,
      lastAttendedAt: null,
      progress: { practice: false, dictation: false, tricky: false, mistake_pick: false },
    })
    .sort((a, b) => {
      const la = a.lastAttendedAt ? Date.parse(a.lastAttendedAt) : -Infinity;
      const lb = b.lastAttendedAt ? Date.parse(b.lastAttendedAt) : -Infinity;
      if (la !== lb) return lb - la;
      const ua = a.uploadedAt ? Date.parse(a.uploadedAt) : -Infinity;
      const ub = b.uploadedAt ? Date.parse(b.uploadedAt) : -Infinity;
      return ub - ua;
    });

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
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors"
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
                className="bg-white border border-slate-200 text-slate-600 hover:text-slate-800 font-medium px-6 py-2.5 rounded-xl text-sm transition-colors"
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
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors"
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
          nextUrl={`/mistake-pick?lesson=${encodeURIComponent(practicingLesson)}`}
          nextLabel="Go to Mistake Pick →"
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
        <div className="space-y-2">
          <LessonTable
            rows={lessonTableRows}
            onSelect={startPracticingLesson}
            extraHeader="Tricky"
            renderExtra={(row) => trickyCounts[row.lessonNumber] ?? 0}
          />
          <p className="text-xs text-slate-400 px-1">Click a lesson to re-practise its tricky questions.</p>
        </div>
      )}
    </div>
  );
}
