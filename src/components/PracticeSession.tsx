'use client';

import { useState, useCallback } from 'react';
import { WordSetQuestions } from '@/lib/claude';
import SessionMCQ from './SessionMCQ';
import DictationItem from './DictationItem';

interface Props {
  wordSetId: number;
  questions: WordSetQuestions;
}

export default function PracticeSession({ wordSetId, questions }: Props) {
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [correct, setCorrect] = useState<Record<string, boolean>>({});

  const totalQuestions =
    questions.wordQuestions.length * 3 + // meaning + synonym + antonym per word
    questions.comprehension.length +
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
          <span>{answeredCount} / {totalQuestions} answered {allDone && `• ${correctCount} correct 🎉`}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
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
          <span className="text-sm font-normal text-gray-400">({questions.words.length} words × 3 questions each)</span>
        </h2>
        <div className="space-y-6">
          {questions.wordQuestions.map((wq, i) => (
            <div key={wq.word} className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
              {/* Word header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3">
                <span className="text-white font-black text-lg">Word {i + 1}: &ldquo;{wq.word}&rdquo;</span>
              </div>
              <div className="p-5 space-y-5">
                {/* Meaning */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-purple-500 mb-2">💡 Meaning</p>
                  <SessionMCQ
                    questionKey={`meaning_${i}`}
                    data={wq.meaning}
                    submitted={!!submitted[`meaning_${i}`]}
                    selectedAnswer={answers[`meaning_${i}`] ?? ''}
                    onAnswer={recordAnswer}
                  />
                </div>
                <hr className="border-gray-100" />
                {/* Synonym */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mb-2">🔗 Synonym</p>
                  <SessionMCQ
                    questionKey={`synonym_${i}`}
                    data={wq.synonym}
                    submitted={!!submitted[`synonym_${i}`]}
                    selectedAnswer={answers[`synonym_${i}`] ?? ''}
                    onAnswer={recordAnswer}
                  />
                </div>
                <hr className="border-gray-100" />
                {/* Antonym */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-500 mb-2">🔄 Antonym</p>
                  <SessionMCQ
                    questionKey={`antonym_${i}`}
                    data={wq.antonym}
                    submitted={!!submitted[`antonym_${i}`]}
                    selectedAnswer={answers[`antonym_${i}`] ?? ''}
                    onAnswer={recordAnswer}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Reading Comprehension ── */}
      <section>
        <h2 className="text-xl font-black text-blue-700 mb-4 flex items-center gap-2">
          📖 Reading Comprehension
          <span className="text-sm font-normal text-gray-400">(3 questions)</span>
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3">
            <span className="text-white font-bold text-sm">Read the paragraph carefully</span>
          </div>
          <div className="p-5 space-y-6">
            {/* Paragraph */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-gray-700 leading-relaxed">{questions.paragraph}</p>
            </div>
            {/* Comprehension MCQs */}
            {questions.comprehension.map((q, i) => (
              <div key={i}>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mb-2">
                  Question {i + 1}
                </p>
                <SessionMCQ
                  questionKey={`comp_${i}`}
                  data={q}
                  submitted={!!submitted[`comp_${i}`]}
                  selectedAnswer={answers[`comp_${i}`] ?? ''}
                  onAnswer={recordAnswer}
                />
              </div>
            ))}
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
              : ' Keep practising — you\'ll get better! 📚'}
          </p>
        </div>
      )}
    </div>
  );
}
