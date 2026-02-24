'use client';

import { useState, useEffect, useCallback } from 'react';
import WrongBankList from '@/components/WrongBankList';
import QuestionCard from '@/components/QuestionCard';
import { GeneratedQuestions } from '@/lib/claude';

interface WrongBankItem {
  id: number;
  question_id: number;
  question_type: string;
  wrong_count: number;
  last_wrong_at: string;
  word: string;
  difficulty: string;
}

interface PracticeItem {
  questionId: number;
  questionType: string;
  wrongCount: number;
  word: string;
  difficulty: string;
  question: unknown;
  allQuestions: GeneratedQuestions;
}

export default function WrongBankPage() {
  const [items, setItems] = useState<WrongBankItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPractice, setLoadingPractice] = useState(false);
  const [practiceItem, setPracticeItem] = useState<PracticeItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/wrong-bank');
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setError('Failed to load your tricky words');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handlePractice = async () => {
    setLoadingPractice(true);
    setError(null);
    setPracticeItem(null);

    try {
      const res = await fetch('/api/wrong-bank/practice');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);
      if (!data.item) {
        await fetchList();
        return;
      }

      setPracticeItem(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load practice question');
    } finally {
      setLoadingPractice(false);
    }
  };

  const handleAnswerSubmitted = async () => {
    // Refresh list after answering
    setTimeout(() => fetchList(), 500);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="text-5xl">🌟</div>
        <h1 className="text-4xl font-black text-gray-800">My Tricky Words</h1>
        <p className="text-lg text-gray-600 font-medium">
          Words you got wrong are here — keep practising until you master them all!
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
          <p className="text-red-700 font-bold">❌ {error}</p>
        </div>
      )}

      {/* Current practice question */}
      {practiceItem && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-black text-gray-700 text-lg">
              🎯 Practice Question — wrong {practiceItem.wrongCount}x
            </p>
            <button
              onClick={() => setPracticeItem(null)}
              className="text-sm text-gray-500 hover:text-gray-700 font-bold"
            >
              ✕ Close
            </button>
          </div>
          <QuestionCard
            word={practiceItem.word}
            questionId={practiceItem.questionId}
            questions={practiceItem.allQuestions}
            onAnswerSubmitted={handleAnswerSubmitted}
          />
          <div className="text-center">
            <button
              onClick={handlePractice}
              className="px-6 py-3 bg-white border-2 border-orange-400 text-orange-600 rounded-2xl font-black text-base hover:bg-orange-50 transition-colors"
            >
              🔀 Next Practice Question
            </button>
          </div>
        </div>
      )}

      {/* Wrong bank list */}
      {loadingList ? (
        <div className="text-center py-12">
          <span className="text-4xl animate-spin inline-block">⏳</span>
          <p className="text-gray-500 font-medium mt-2">Loading your tricky words...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-lg p-6 border-2 border-purple-100">
          <WrongBankList
            items={items}
            onPractice={handlePractice}
            loading={loadingPractice}
          />
        </div>
      )}
    </div>
  );
}
