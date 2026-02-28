'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import WrongBankList from '@/components/WrongBankList';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-900">Tricky Words</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Questions you&apos;ve answered incorrectly. Practice them again to improve.
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
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-100" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {lesson === 'No Lesson' ? 'No Lesson' : `Lesson ${lesson}`}
                  {' '}· {lessonItems.length} question{lessonItems.length !== 1 ? 's' : ''}
                </h2>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <WrongBankList items={lessonItems} />
            </div>
          ))}

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-700">
            <p className="font-semibold mb-1">How to improve your Tricky Words</p>
            <p className="text-indigo-500 text-xs">
              Go to <a href="/practice" className="underline font-semibold">Practice</a>, select the same lesson, and redo it.
              Each correct answer removes a question from this list.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
