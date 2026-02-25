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
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
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

      setPracticeData({
        wordSetId: data.item.wordSetId,
        words: data.item.words,
        questions: data.item.questions,
      });
    } catch {
      setError('Could not load practice questions.');
    } finally {
      setLoadingPractice(false);
    }
  }

  function handleSessionDone() {
    setTimeout(() => {
      fetchList();
      setPracticeData(null);
    }, 1500);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-purple-700 mb-2">🌟 My Tricky Words</h1>
        <p className="text-gray-500">Questions you&apos;ve answered incorrectly — keep practising!</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {practiceData ? (
        <div>
          <button
            onClick={() => { setPracticeData(null); fetchList(); }}
            className="mb-4 text-purple-600 font-bold text-sm hover:underline"
          >
            ← Back to Tricky Words list
          </button>
          <PracticeSession
            wordSetId={practiceData.wordSetId}
            questions={practiceData.questions}
          />
          <button
            onClick={handleSessionDone}
            className="mt-6 w-full text-purple-600 font-bold text-sm py-2 rounded-xl hover:bg-purple-50 transition-all"
          >
            ✅ Done — refresh my list
          </button>
        </div>
      ) : loadingList ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
        </div>
      ) : (
        <WrongBankList items={items} onPractice={startPractice} loading={loadingPractice} />
      )}
    </div>
  );
}
