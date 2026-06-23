'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MistakePickSession, { MistakePickSessionData } from '@/components/MistakePickSession';
import { MistakePickQuestion } from '@/lib/deepseek';
import { paletteFor, friendlyLessonLabel, paletteWithProgress, LessonProgress } from '@/lib/lessonPalette';

export default function MistakePickPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<string[]>([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [questions, setQuestions] = useState<MistakePickQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [error, setError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [search, setSearch] = useState('');
  const [savedSession, setSavedSession] = useState<MistakePickSessionData | null>(null);
  const [showResume, setShowResume] = useState(false);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.replace('/login?message=login-required');
        else setAuthChecked(true);
      })
      .catch(() => router.replace('/login?message=login-required'));
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    fetch('/api/lessons')
      .then((r) => r.json())
      .then((d) => setLessons(d.lessons ?? []))
      .catch(() => {});
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked) return;
    fetch('/api/lessons/progress')
      .then((r) => r.json())
      .then((d) => setLessonProgress(d.progress ?? {}))
      .catch(() => {});
  }, [authChecked]);

  // Auto-open a lesson passed via ?lesson= (e.g. arriving from Dictation)
  useEffect(() => {
    if (!authChecked || autoSelectedRef.current) return;
    const lesson = new URLSearchParams(window.location.search).get('lesson');
    if (!lesson) return;
    autoSelectedRef.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    selectLesson(lesson);
  }, [authChecked]);

  function handleDone() {
    if (selectedLesson) {
      fetch('/api/lessons/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson: selectedLesson, step: 'mistake_pick' }),
      }).catch(() => {});
      setLessonProgress((prev) => ({
        ...prev,
        [selectedLesson]: {
          ...(prev[selectedLesson] ?? { practice: false, dictation: false, tricky: false, mistake_pick: false }),
          mistake_pick: true,
        },
      }));
    }
    setPracticing(false);
    setSelectedLesson('');
    setQuestions([]);
    setSavedSession(null);
    setShowResume(false);
  }

  const handleSave = useCallback(async (data: MistakePickSessionData) => {
    try {
      await fetch('/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch { /* silent */ }
  }, []);

  const handleClear = useCallback(async () => {
    try {
      await fetch(`/api/practice/session?type=mistake_pick&lesson=${encodeURIComponent(selectedLesson)}`, {
        method: 'DELETE',
      });
      setSavedSession(null);
    } catch { /* silent */ }
  }, [selectedLesson]);

  async function selectLesson(lesson: string) {
    setSelectedLesson(lesson);
    setQuestions([]);
    setError('');
    setShowResume(false);
    try {
      const sessionRes = await fetch(`/api/practice/session?type=mistake_pick&lesson=${encodeURIComponent(lesson)}`);
      const sessionData = await sessionRes.json();
      if (sessionData.session) {
        setSavedSession(sessionData.session);
        setShowResume(true);
        setLoading(true);
        const qRes = await fetch(`/api/mistake-pick?lesson=${encodeURIComponent(lesson)}`);
        const qData = await qRes.json();
        if (qRes.ok) setQuestions(qData.questions ?? []);
        setLoading(false);
        return;
      }
    } catch { /* proceed */ }

    setSavedSession(null);
    setShowResume(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/mistake-pick?lesson=${encodeURIComponent(lesson)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to load questions');
      setQuestions(data.questions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }

  function startPracticing() {
    fetch('/api/lessons/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson: selectedLesson, step: 'mistake_pick' }),
    }).catch(() => {});
    setPracticing(true);
  }

  if (!authChecked) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-100 rounded w-40" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  // ── Practicing ────────────────────────────────────────────────────
  if (practicing && questions.length > 0) {
    return (
      <MistakePickSession
        questions={questions} lessonNumber={selectedLesson}
        onDone={handleDone} onSave={handleSave} onClear={handleClear}
        initialSession={savedSession}
      />
    );
  }

  // ── Resume / ready-to-start ───────────────────────────────────────
  if (selectedLesson && questions.length > 0 && !practicing) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedLesson(''); setQuestions([]); setShowResume(false); }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Lessons
        </button>
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-purple-900 mb-1">
            Mistake Pick — {friendlyLessonLabel(selectedLesson)}
          </h2>
          <p className="text-purple-700 text-sm mb-4">
            {questions.length} words — one sentence per word. Each has a single grammar mistake to find and fix.
          </p>
          {showResume ? (
            <div className="space-y-3">
              <p className="text-sm text-purple-600 bg-purple-100 rounded-lg px-4 py-2">
                📝 You have an unfinished session. Resume where you left off.
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setShowResume(false); startPracticing(); }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  Resume Session
                </button>
                <button onClick={async () => { await handleClear(); startPracticing(); }}
                  className="flex-1 bg-white border border-purple-200 text-purple-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-purple-50 transition-colors">
                  Start Fresh
                </button>
              </div>
            </div>
          ) : (
            <button onClick={startPracticing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
              Start Mistake Pick →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Lesson selection ──────────────────────────────────────────────
  const defProgress: LessonProgress = { practice: false, dictation: false, tricky: false, mistake_pick: false };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-900">Mistake Pick</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Sharp grammar skills — one sentence per word, each with a single targeted mistake to find and fix.
        </p>
      </div>
      <div className="space-y-4">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search lessons..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 bg-slate-50/50 placeholder:text-slate-300"
          />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {lessons.filter((l) => !search || friendlyLessonLabel(l).toLowerCase().includes(search.toLowerCase()) || l.toLowerCase().includes(search.toLowerCase()))
            .map((lesson) => {
              const isSelected = selectedLesson === lesson;
              const p = paletteFor(lesson);
              const { palette: pp, isDone } = paletteWithProgress(lesson, lessonProgress[lesson] ?? defProgress);
              return (
                <button key={lesson} onClick={() => selectLesson(lesson)} disabled={loading}
                  className={`relative group flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl border text-sm font-semibold transition-all duration-200 disabled:opacity-50 ${
                    isSelected ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200'
                    : isDone ? `${pp.bg} ${pp.border} text-slate-400 line-through ${pp.hoverBorder} ${pp.text}`
                    : `${pp.bg} ${pp.border} text-slate-700 ${pp.hoverBorder} ${pp.text} hover:-translate-y-0.5 hover:shadow-sm`
                  }`}>
                  <svg className={`w-4 h-4 transition-colors ${
                    isSelected ? 'text-purple-200' : isDone ? `${pp.icon} opacity-50` : `${pp.icon} ${pp.iconHover}`
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="text-xs leading-tight text-center">{friendlyLessonLabel(lesson)}</span>
                </button>
              );
            })}
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 px-1 pt-1">
            <span className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
            Preparing questions with AI…
          </div>
        )}
        {error && <p className="text-sm text-red-500 px-1">{error}</p>}
      </div>
    </div>
  );
}
