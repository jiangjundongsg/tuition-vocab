'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MistakePickQuestion } from '@/lib/deepseek';

interface Props {
  questions: MistakePickQuestion[];
  lessonNumber: string;
  onDone?: () => void;
  onSave?: (data: MistakePickSessionData) => void;
  onClear?: () => void;
  initialSession?: MistakePickSessionData | null;
}

export interface MistakePickSessionData {
  type: 'mistake_pick';
  lesson: string;
  currentIndex: number;
  submitted: Record<number, boolean>;
  correct: Record<number, boolean>;
  answers: Record<number, string>;
}

export default function MistakePickSession({
  questions, lessonNumber, onDone, onSave, onClear, initialSession,
}: Props) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialSession?.currentIndex ?? 0);
  const [submitted, setSubmitted] = useState<Record<number, boolean>>(initialSession?.submitted ?? {});
  const [correct, setCorrect] = useState<Record<number, boolean>>(initialSession?.correct ?? {});
  const [answers, setAnswers] = useState<Record<number, string>>(initialSession?.answers ?? {});
  // Pre-fill the box with the original (erroneous) sentence so the student edits
  // in place rather than retyping the whole thing. A saved answer takes priority.
  const startIdx = initialSession?.currentIndex ?? 0;
  const [inputValue, setInputValue] = useState(
    initialSession?.answers?.[startIdx] ?? questions[startIdx]?.sentence ?? ''
  );
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const question = questions[currentIndex];
  const isSubmitted = !!submitted[currentIndex];
  const isCorrect = !!correct[currentIndex];

  // Autosave
  const saveTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const autosave = useCallback(() => {
    if (!onSave) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave({
        type: 'mistake_pick', lesson: lessonNumber, currentIndex,
        submitted: { ...submitted, [currentIndex]: isSubmitted },
        correct, answers: { ...answers, [currentIndex]: inputValue },
      });
    }, 300);
  }, [onSave, lessonNumber, currentIndex, submitted, correct, answers, inputValue, isSubmitted]);

  useEffect(() => { autosave(); }, [autosave]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const clearedRef = useRef(false);
  useEffect(() => {
    if (done && !clearedRef.current) { clearedRef.current = true; onClear?.(); }
  }, [done, onClear]);

  useEffect(() => {
    if (!isSubmitted && inputRef.current) inputRef.current.focus();
  }, [currentIndex, isSubmitted]);

  function handleSubmit() {
    if (isSubmitted || !question) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ').trim();
    const userNorm = normalize(trimmed);
    const correctNorm = normalize(question.correctSentence);
    const isAnswerCorrect = userNorm === correctNorm;
    setSubmitted((s) => ({ ...s, [currentIndex]: true }));
    setCorrect((c) => ({ ...c, [currentIndex]: isAnswerCorrect }));
    setAnswers((a) => ({ ...a, [currentIndex]: trimmed }));
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setInputValue(answers[nextIdx] ?? questions[nextIdx]?.sentence ?? '');
    } else { setDone(true); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isSubmitted) {
      e.preventDefault(); handleSubmit();
    }
  }

  // ── Done screen ────────────────────────────────────────────────────
  if (done) {
    const correctCount = Object.values(correct).filter(Boolean).length;
    return (
      <div className="space-y-6">
        <div className="bg-purple-600 rounded-xl p-8 text-center text-white">
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold mb-2">Mistake Pick Complete!</h2>
          <p className="text-purple-100 text-sm mb-6">
            Corrected <strong>{correctCount}</strong> of <strong>{questions.length}</strong> sentences
          </p>
          <div className="flex flex-col gap-3 items-center w-full sm:w-auto">
            {onDone && (
              <button onClick={onDone}
                className="w-full sm:w-auto bg-white text-purple-700 font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-purple-50 transition-colors">
                Pick Another Lesson
              </button>
            )}
            <button onClick={() => { onDone?.(); router.push('/'); }}
              className="w-full sm:w-auto border-2 border-white/50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-white/10 transition-colors">
              Go to Home →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  // ── Question card ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-purple-900">Mistake Pick — Lesson {lessonNumber}</h2>
            <p className="text-sm text-purple-700 mt-0.5">Find and correct the grammar mistakes</p>
          </div>
          <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + (isSubmitted ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
        {/* Word badge */}
        <div className="flex items-center gap-2">
          <span className="bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded-lg">{question.word}</span>
          <span className="text-xs text-slate-400">Vocabulary word in this sentence</span>
        </div>

        {/* Sentence with error */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-sm font-medium text-red-400 mb-1 uppercase tracking-wide">Sentence with errors:</p>
          <p className="text-lg text-slate-800 leading-relaxed font-medium">{question.sentence}</p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">✏️ Type the corrected sentence:</label>
          <textarea ref={inputRef} value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown} disabled={isSubmitted}
            placeholder="Write the corrected sentence here..."
            rows={3}
            className={`w-full px-4 py-3 rounded-xl border-2 text-sm transition-colors resize-none ${
              isSubmitted
                ? isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-red-300 bg-red-50 text-red-700'
                : 'border-slate-200 bg-slate-50 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100'
            } disabled:opacity-80`} />
          {!isSubmitted && (
            <>
              <button onClick={handleSubmit} disabled={!inputValue.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                Check Answer
              </button>
              <p className="text-xs text-slate-400 text-center">Ctrl + Enter to submit</p>
            </>
          )}
        </div>

        {/* Result */}
        {isSubmitted && (
          <div className="space-y-4">
            <div className={`flex items-start gap-3 p-4 rounded-xl ${
              isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              <span className="text-xl mt-0.5">{isCorrect ? '✅' : '❌'}</span>
              <div className="flex-1 space-y-2">
                <p className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                  {isCorrect ? 'Perfect! You found and fixed all the mistakes.' : 'Not quite — review the corrections below.'}
                </p>

                {/* Correct sentence */}
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide font-medium">Correct sentence:</p>
                  <p className="text-sm text-green-700 font-semibold leading-relaxed">{question.correctSentence}</p>
                </div>

                {/* User's answer if wrong */}
                {!isCorrect && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide font-medium">Your answer:</p>
                    <p className="text-sm text-red-600 leading-relaxed">{answers[currentIndex]}</p>
                  </div>
                )}

                {/* Mistake detail */}
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Mistake to learn from:</p>
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{question.correction.errorType}</span>
                      <span className="text-sm font-mono text-red-600">{question.correction.mistake}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{question.correction.explanation}</p>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={handleNext}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
              {currentIndex < questions.length - 1 ? 'Next Question →' : 'Finish →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
