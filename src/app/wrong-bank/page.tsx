'use client';

import { useEffect, useState, useCallback } from 'react';
import WrongBankList from '@/components/WrongBankList';
import PracticeSession from '@/components/PracticeSession';
import { WordSetQuestions } from '@/lib/claude';

interface WrongItem {
  id: number;
  word: string;
  typeLabel: string;
  wrongCount: number;
  lastWrongAt: string;
}

interface PracticeData {
  wordSetId: number;
  words: string[];
  questions: WordSetQuestions;
}

export default function WrongBankPage() {
  const [items, setItems] = useState<WrongItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPractice, setLoadingPractice] = useState(false);
  const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
  const [error, setError] = useState('');

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/wrong-bank');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { /* silent */ }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function startPractice() {
    setLoadingPractice(true);
    setError('');
    setPracticeData(null);
    try {
      const res = await fetch('/api/wrong-bank/practice');
      const data = await res.json();
      if (!res.ok || !data.item) {
        setError(data.message ?? 'No questions to practise.');
        return;
      }
      setPracticeData({ wordSetId: data.item.wordSetId, words: data.item.words, questions: data.item.questions });
    } catch {
      setError('Could not load practice questions.');
    } finally {
      setLoadingPractice(false);
    }
  }

  function handleSessionDone() {
    setTimeout(() => { fetchList(); setPracticeData(null); }, 1500);
  }

  return (
    <div className="space-y-6">

      {practiceData ? (
        <>
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setPracticeData(null); fetchList(); }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Tricky Words
            </button>
          </div>
          <PracticeSession wordSetId={practiceData.wordSetId} questions={practiceData.questions} />
          <button
            onClick={handleSessionDone}
            className="w-full border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            Done — refresh my list
          </button>
        </>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tricky Words</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Questions you&apos;ve answered incorrectly. Practise them until you get them right.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {loadingList ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
            </div>
          ) : (
            <WrongBankList items={items} onPractice={startPractice} loading={loadingPractice} />
          )}
        </>
      )}
    </div>
  );
}
