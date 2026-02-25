'use client';

import { useState, useCallback } from 'react';
import { WordSetQuestions } from '@/lib/claude';
import QuestionRenderer from './QuestionRenderer';
import DictationItem from './DictationItem';

interface Props {
  wordSetId: number;
  questions: WordSetQuestions;
}

export default function PracticeSession({ wordSetId, questions }: Props) {
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [correct, setCorrect] = useState<Record<string, boolean>>({});

  const compCount = questions.comprehension.questions.length;
  const totalQuestions =
    questions.wordQuestions.length * 3 +
    compCount +
    questions.words.length;

  const answeredCount = Object.keys(submitted).length;
  const correctCount = Object.values(correct).filter(Boolean).length;
  const allDone = answeredCount === totalQuestions;

  const recordAnswer = useCallback(
    async (questionKey: string, answer: string, isCorrect: boolean) => {
      if (submitted[questionKey]) return;
      setSubmitted((s) => ({ ...s, [questionKey]: true }));
      setAnswers((a) => ({ ...a, [questionKey]: answer }));
      setCorrect((c) => ({ ...c, [questionKey]: isCorrect }));
      try {
        await fetch('/api/questions/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wordSetId, questionKey, isCorrect }),
        });
      } catch { /* silent */ }
    },
    [wordSetId, submitted]
  );

  const pct = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between text-sm font-semibold text-slate-600 mb-2">
          <span>Session progress</span>
          <span>{answeredCount} / {totalQuestions}{allDone && ` · ${correctCount} correct`}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {allDone && (
          <p className="text-xs text-slate-400 mt-1 text-right">
            {pct === 100 && correctCount === totalQuestions
              ? 'Perfect score!'
              : correctCount >= totalQuestions * 0.8
              ? 'Great job!'
              : 'Keep practising!'}
          </p>
        )}
      </div>

      {/* ── Section 1: Word Questions ─────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Word Questions · {questions.words.length} words × 3 each
          </h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {questions.wordQuestions.map((wq, wordIdx) => (
          <div key={wq.word} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Word header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                {wordIdx + 1}
              </span>
              <span className="font-bold text-slate-800">{wq.word}</span>
            </div>

            <div className="p-5 divide-y divide-slate-100">
              {wq.questions.map((q, qIdx) => {
                const qKey = `wq_${wordIdx}_${qIdx}`;
                return (
                  <div key={qKey} className={qIdx > 0 ? 'pt-5 mt-1' : ''}>
                    <QuestionRenderer
                      questionKey={qKey}
                      data={q}
                      submitted={!!submitted[qKey]}
                      selectedAnswer={answers[qKey] ?? ''}
                      isCorrect={!!correct[qKey]}
                      onAnswer={recordAnswer}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ── Section 2: Comprehension ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Reading Comprehension · {compCount} questions
          </h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-semibold text-slate-700">Read the passage carefully</span>
          </div>

          <div className="p-5 space-y-6">
            {questions.comprehension.passage && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {questions.comprehension.passage}
                </p>
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {questions.comprehension.questions.map((q, qIdx) => {
                const qKey = `comp_${qIdx}`;
                return (
                  <div key={qKey} className={qIdx > 0 ? 'pt-5 mt-1' : ''}>
                    <p className="text-xs font-semibold text-slate-400 mb-3">
                      Question {qIdx + 1}
                    </p>
                    <QuestionRenderer
                      questionKey={qKey}
                      data={q}
                      submitted={!!submitted[qKey]}
                      selectedAnswer={answers[qKey] ?? ''}
                      isCorrect={!!correct[qKey]}
                      onAnswer={recordAnswer}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Dictation ─────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Dictation · {questions.words.length} words
          </h2>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <p className="text-xs text-slate-400">
          Click to hear the word, then type what you hear. Press Enter or &quot;Check&quot; to submit.
        </p>

        <div className="space-y-3">
          {questions.words.map((word, i) => (
            <DictationItem
              key={i}
              wordIndex={i}
              word={word}
              questionKey={`dictation_${i}`}
              submitted={!!submitted[`dictation_${i}`]}
              isCorrect={!!correct[`dictation_${i}`]}
              onAnswer={recordAnswer}
            />
          ))}
        </div>
      </section>

      {/* ── Completion ───────────────────────────────────────── */}
      {allDone && (
        <div className="bg-indigo-600 rounded-xl p-6 text-center text-white">
          <p className="text-3xl mb-2">🎉</p>
          <h3 className="text-xl font-bold mb-1">Session Complete</h3>
          <p className="text-indigo-100 text-sm">
            You scored <strong className="text-white">{correctCount}</strong> out of{' '}
            <strong className="text-white">{totalQuestions}</strong>.{' '}
            {correctCount === totalQuestions
              ? 'Perfect — outstanding work!'
              : correctCount >= totalQuestions * 0.8
              ? 'Excellent effort! Keep it up.'
              : 'Good attempt. Review your Tricky Words and practise again.'}
          </p>
        </div>
      )}
    </div>
  );
}
