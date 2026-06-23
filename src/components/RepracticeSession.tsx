'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import SessionMCQ from './SessionMCQ';
import FillBlankExercise from './FillBlankExercise';
import DictationItem from './DictationItem';
import { WordSetData } from './WordPracticeCard';

interface WrongBankItem {
  id: number;
  wordSetId: number;
  wordId: number;
  word: string;
  lessonNumber: string | null;
  questionKey: string;
  typeLabel: string;
  wrongCount: number;
}

export interface SessionData {
  type: 'practice' | 'dictation' | 'wrong_bank';
  lesson: string;
  phase: string;
  currentWordIndex: number;
  repracticeIndex: number;
  submitted: Record<string, boolean>;
  correct: Record<string, boolean>;
  answers: Record<string, string>;
}

interface Props {
  items: WrongBankItem[];
  lessonLabel: string;
  onDone: () => void;
  initialSession?: SessionData | null;
  onSave?: (data: SessionData) => void;
  onClear?: () => void;
}

export default function RepracticeSession({ items, lessonLabel, onDone, initialSession, onSave, onClear }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialSession?.currentWordIndex ?? 0);
  const [wordSets, setWordSets] = useState<Record<number, WordSetData | 'loading' | 'error'>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>(
    initialSession ? Object.fromEntries(Object.entries(initialSession.submitted).map(([k, v]) => [Number(k), v])) : {},
  );
  const [correct, setCorrect] = useState<Record<number, boolean>>(
    initialSession ? Object.fromEntries(Object.entries(initialSession.correct).map(([k, v]) => [Number(k), v])) : {},
  );
  const [answers, setAnswers] = useState<Record<number, string>>(initialSession?.answers ?? {});
  const [done, setDone] = useState(false);

  const item = items[currentIndex];

  // Autosave
  const saveTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const autosave = useCallback(() => {
    if (!onSave) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave({
        type: 'wrong_bank',
        lesson: lessonLabel,
        phase: 'repractice',
        currentWordIndex: currentIndex,
        repracticeIndex: 0,
        submitted: Object.fromEntries(Object.entries(submitted).map(([k, v]) => [String(k), v])),
        correct: Object.fromEntries(Object.entries(correct).map(([k, v]) => [String(k), v])),
        answers: { ...answers },
      });
    }, 300);
  }, [onSave, lessonLabel, currentIndex, submitted, correct, answers]);

  useEffect(() => { autosave(); }, [autosave]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // Clear when done
  const clearedRef = useRef(false);
  useEffect(() => {
    if (done && !clearedRef.current) {
      clearedRef.current = true;
      onClear?.();
    }
  }, [done, onClear]);

  // Load word set for current item
  useEffect(() => {
    if (!item) return;
    const id = item.wordId;
    if (wordSets[id]) return;
    setWordSets((prev) => ({ ...prev, [id]: 'loading' }));
    fetch(`/api/practice/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setWordSets((prev) => ({
          ...prev,
          [id]: {
            wordSetId: data.wordSetId,
            word: item.word,
            paragraph: data.paragraph,
            questions: data.questions,
            fillBlank: data.fillBlank,
          } as WordSetData,
        }));
      })
      .catch(() => setWordSets((prev) => ({ ...prev, [id]: 'error' })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  async function handleAnswer(wrongBankId: number, answer: string, isCorrect: boolean) {
    if (submitted[wrongBankId]) return;
    setSubmitted((s) => ({ ...s, [wrongBankId]: true }));
    setCorrect((c) => ({ ...c, [wrongBankId]: isCorrect }));
    setAnswers((a) => ({ ...a, [wrongBankId]: answer }));
    try {
      await fetch('/api/wrong-bank/repractice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wrongBankId, isCorrect }),
      });
    } catch { /* silent */ }
  }

  function next() {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setDone(true);
    }
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (done) {
    const correctCount = Object.values(correct).filter(Boolean).length;
    return (
      <div className="space-y-4">
        <div className="bg-indigo-600 rounded-2xl p-8 text-center text-white shadow-sm">
          <p className="text-2xl mb-3 text-amber-300">&#9733;</p>
          <h2 className="text-2xl font-bold mb-2">All done!</h2>
          <p className="text-indigo-100 text-sm mb-6">
            Corrected <strong>{correctCount}</strong> of <strong>{items.length}</strong> tricky questions for Lesson {lessonLabel}
          </p>
          <button
            onClick={onDone}
            className="bg-white text-indigo-700 font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-indigo-50 transition-colors"
          >
            Back to Tricky Words
          </button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const ws = wordSets[item.wordId];
  const wsData = ws && ws !== 'loading' && ws !== 'error' ? ws : null;
  const isSubmitted = !!submitted[item.id];
  const isCorrect = !!correct[item.id];
  const progress = ((currentIndex + (isSubmitted ? 1 : 0)) / items.length) * 100;

  const meaningExplanation = wsData?.questions.meaning?.explanation
    ?? wsData?.questions.synonym?.explanation
    ?? undefined;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-amber-900">Tricky Words — Lesson {lessonLabel}</h2>
            <p className="text-sm text-amber-700 mt-0.5">Re-answer questions you got wrong</p>
          </div>
          <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {items.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm space-y-4">
        {/* Word + type badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-lg">
            {item.word}
          </span>
          <span className="text-xs text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">
            {item.typeLabel}
          </span>
          {item.wrongCount > 1 && (
            <span className="text-xs text-red-500 font-semibold">
              ✗ wrong {item.wrongCount}×
            </span>
          )}
        </div>

        {/* Paragraph context */}
        {wsData && (
          <p className="text-sm text-stone-600 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 leading-relaxed">
            {wsData.paragraph}
          </p>
        )}

        {/* Loading state */}
        {!wsData && ws === 'loading' && item.questionKey !== 'dictation' && (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-stone-100 rounded w-3/4" />
            <div className="h-10 bg-stone-100 rounded" />
            <div className="h-10 bg-stone-100 rounded" />
          </div>
        )}

        {ws === 'error' && (
          <p className="text-sm text-red-500">Could not load question. Please try again.</p>
        )}

        {/* Meaning MCQ */}
        {wsData && item.questionKey === 'meaning' && wsData.questions.meaning && (
          <SessionMCQ
            questionKey={`wb_${item.id}_meaning`}
            data={wsData.questions.meaning}
            submitted={isSubmitted}
            selectedAnswer={answers[item.id] ?? ''}
            onAnswer={(_, ans, c) => handleAnswer(item.id, ans, c)}
          />
        )}

        {/* Synonym MCQ */}
        {wsData && item.questionKey === 'synonym' && wsData.questions.synonym && (
          <SessionMCQ
            questionKey={`wb_${item.id}_synonym`}
            data={wsData.questions.synonym}
            submitted={isSubmitted}
            selectedAnswer={answers[item.id] ?? ''}
            onAnswer={(_, ans, c) => handleAnswer(item.id, ans, c)}
          />
        )}

        {/* Antonym MCQ */}
        {wsData && item.questionKey === 'antonym' && wsData.questions.antonym && (
          <SessionMCQ
            questionKey={`wb_${item.id}_antonym`}
            data={wsData.questions.antonym}
            submitted={isSubmitted}
            selectedAnswer={answers[item.id] ?? ''}
            onAnswer={(_, ans, c) => handleAnswer(item.id, ans, c)}
          />
        )}

        {/* Comprehension (comp_0, comp_1, …) */}
        {wsData && item.questionKey.startsWith('comp_') && (() => {
          const idx = parseInt(item.questionKey.split('_')[1] ?? '0');
          const compQ = wsData.questions.comprehension?.[idx];
          return compQ ? (
            <SessionMCQ
              questionKey={`wb_${item.id}_comp${idx}`}
              data={compQ}
              submitted={isSubmitted}
              selectedAnswer={answers[item.id] ?? ''}
              onAnswer={(_, ans, c) => handleAnswer(item.id, ans, c)}
            />
          ) : null;
        })()}

        {/* Fill in the blank */}
        {wsData && item.questionKey === 'fill_blank' && wsData.fillBlank && (
          <FillBlankExercise
            questionKey={`wb_${item.id}_fill`}
            data={wsData.fillBlank}
            submitted={isSubmitted}
            onAnswer={(_, ans, c) => handleAnswer(item.id, ans, c)}
          />
        )}

        {/* Dictation */}
        {item.questionKey === 'dictation' && (
          <DictationItem
            wordIndex={currentIndex}
            word={item.word}
            meaning={meaningExplanation}
            questionKey={`wb_${item.id}_dict`}
            submitted={isSubmitted}
            isCorrect={isCorrect}
            onAnswer={(_, ans, c) => handleAnswer(item.id, ans, c)}
          />
        )}

        {/* Result banner + Next button */}
        {isSubmitted && (
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isCorrect
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
              {isCorrect ? '✓ Correct! Removed from Tricky Words.' : '✗ Still tricky — keep practising!'}
            </span>
            <button
              onClick={next}
              className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
            >
              {currentIndex < items.length - 1 ? 'Next →' : 'Finish →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
