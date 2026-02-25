'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Word {
  id: number;
  word: string;
  difficulty: string;
  lesson_number: number | null;
  zipf_score: number | null;
}

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];

export default function WordsPage() {
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLesson, setEditLesson] = useState('');
  const [editDifficulty, setEditDifficulty] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filterLesson, setFilterLesson] = useState<number | null>(null);
  const [lessonNumbers, setLessonNumbers] = useState<number[]>([]);
  const [error, setError] = useState('');

  const fetchWords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/words');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWords(data.words as Word[]);
      setLessonNumbers(data.lessonNumbers ?? []);
    } catch {
      setError('Could not load words.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const role = d.user?.role;
        if (role !== 'teacher' && role !== 'admin') {
          router.replace('/login?message=teacher-only');
        } else {
          fetchWords();
        }
      })
      .catch(() => router.replace('/login?message=teacher-only'));
  }, [router, fetchWords]);

  function startEdit(word: Word) {
    setEditingId(word.id);
    setEditLesson(word.lesson_number !== null ? String(word.lesson_number) : '');
    setEditDifficulty(word.difficulty);
  }

  async function saveEdit(id: number) {
    setSaving(true);
    try {
      const lessonNumber = editLesson.trim() === '' ? null : parseInt(editLesson);
      const res = await fetch(`/api/words/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonNumber, difficulty: editDifficulty }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setWords((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...data.word, lesson_number: data.word.lesson_number } : w))
      );
      setEditingId(null);
    } catch {
      setError('Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteWord(id: number) {
    if (!confirm('Delete this word? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/words/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch {
      setError('Could not delete word.');
    } finally {
      setDeletingId(null);
    }
  }

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-emerald-100 text-emerald-700';
    if (d === 'medium') return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  const filtered = filterLesson !== null
    ? words.filter((w) => w.lesson_number === filterLesson)
    : words;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Word List</h1>
          <p className="text-slate-500 text-sm mt-1">{words.length} words total</p>
        </div>
        <Link
          href="/upload"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Upload Words
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Lesson filter */}
      {lessonNumbers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterLesson(null)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
              filterLesson === null
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
            }`}
          >
            All
          </button>
          {lessonNumbers.map((n) => (
            <button
              key={n}
              onClick={() => setFilterLesson(n)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                filterLesson === n
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'
              }`}
            >
              Lesson {n}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="font-semibold text-slate-700 mb-1">No words yet.</p>
          <Link href="/upload" className="text-indigo-600 font-semibold text-sm hover:underline mt-1 inline-block">
            Upload a word list →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Word</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lesson</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Difficulty</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((word) => (
                <tr key={word.id} className="hover:bg-slate-50 transition-colors">
                  {editingId === word.id ? (
                    <>
                      <td className="px-5 py-2.5 font-semibold text-slate-800">{word.word}</td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          value={editLesson}
                          onChange={(e) => setEditLesson(e.target.value)}
                          placeholder="—"
                          className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <select
                          value={editDifficulty}
                          onChange={(e) => setEditDifficulty(e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                        >
                          {DIFFICULTY_OPTIONS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-2.5 text-right space-x-2">
                        <button
                          onClick={() => saveEdit(word.id)}
                          disabled={saving}
                          className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                          {saving ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5 transition-colors"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-2.5 font-semibold text-slate-800">{word.word}</td>
                      <td className="px-4 py-2.5 text-center text-slate-400 text-xs">
                        {word.lesson_number !== null ? `Lesson ${word.lesson_number}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${difficultyColor(word.difficulty)}`}>
                          {word.difficulty}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right space-x-3">
                        <button
                          onClick={() => startEdit(word)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteWord(word.id)}
                          disabled={deletingId === word.id}
                          className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          {deletingId === word.id ? '...' : 'Delete'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
