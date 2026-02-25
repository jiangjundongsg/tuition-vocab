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

  // Question key format:
  //   wq_{wordIdx}_{qIdx}  — word questions
  //   comp_{qIdx}          — comprehension
  //   dictation_{idx}      — dictation

  const compCount = questions.comprehension.questions.length;
  const totalQuestions =
    questions.wordQuestions.length * 3 + // 3 per word
    compCount +
    questions.words.length; // dictation

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
      } catch {
        // silent — don't break UI if recording fails
      }
    },
    [wordSetId, submitted]
  );

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between text-sm font-semibold text-gray-600 mb-2">
          <span>Progress</span>
          <span>
            {answeredCount} / {totalQuestions} answered
            {allDone && ` · ${correctCount} correct 🎉`}
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500"
            style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ── Section 1: Word Questions ── */}
      <section>
        <h2 className="text-xl font-black text-purple-700 mb-4 flex items-center gap-2">
          📚 Word Questions
          <span className="text-sm font-normal text-gray-400">
            ({questions.words.length} words × 3 questions each)
          </span>
        </h2>
        <div className="space-y-6">
          {questions.wordQuestions.map((wq, wordIdx) => (
            <div
              key={wq.word}
              className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden"
            >
              {/* Word header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3">
                <span className="text-white font-black text-lg">
                  Word {wordIdx + 1}: &ldquo;{wq.word}&rdquo;
                </span>
              </div>
              <div className="p-5 space-y-5">
                {wq.questions.map((q, qIdx) => {
                  const qKey = `wq_${wordIdx}_${qIdx}`;
                  return (
                    <div key={qKey}>
                      {qIdx > 0 && <hr className="border-gray-100 mb-5" />}
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
        </div>
      </section>

      {/* ── Section 2: Reading Comprehension ── */}
      <section>
        <h2 className="text-xl font-black text-blue-700 mb-4 flex items-center gap-2">
          📖 Reading Comprehension
          <span className="text-sm font-normal text-gray-400">({compCount} questions)</span>
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3">
            <span className="text-white font-bold text-sm">Read the passage carefully</span>
          </div>
          <div className="p-5 space-y-6">
            {/* Passage */}
            {questions.comprehension.passage && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-gray-700 leading-relaxed text-sm">
                  {questions.comprehension.passage}
                </p>
              </div>
            )}
            {/* Comprehension questions */}
            {questions.comprehension.questions.map((q, qIdx) => {
              const qKey = `comp_${qIdx}`;
              return (
                <div key={qKey}>
                  {qIdx > 0 && <hr className="border-gray-100 mb-6" />}
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mb-2">
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
      </section>

      {/* ── Section 3: Dictation ── */}
      <section>
        <h2 className="text-xl font-black text-green-700 mb-2 flex items-center gap-2">
          🎧 Dictation
          <span className="text-sm font-normal text-gray-400">({questions.words.length} words)</span>
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Click &quot;Hear the word&quot; and type what you hear. Press Enter or &quot;Check&quot; to submit.
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

      {/* ── Completion Banner ── */}
      {allDone && (
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-400 rounded-2xl p-6 text-center text-white shadow-lg">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-2xl font-black mb-1">Session Complete!</h3>
          <p className="text-white/90">
            You got <strong>{correctCount}</strong> out of <strong>{totalQuestions}</strong> correct.
            {correctCount === totalQuestions
              ? ' Perfect score! Amazing! 🌟'
              : correctCount >= totalQuestions * 0.8
              ? ' Great job! Keep it up! 💪'
              : " Keep practising — you'll get better! 📚"}
          </p>
        </div>
      )}
    </div>
  );
}
