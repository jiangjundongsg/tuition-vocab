'use client';

import { useState, useCallback } from 'react';
import SessionMCQ from './SessionMCQ';
import FillBlankExercise from './FillBlankExercise';
import { WordQuestions } from '@/lib/claude';
import { FillBlankQuestion } from '@/lib/fillblank';

export interface WordSetData {
  wordSetId: number;
  word: string;
  paragraph: string;
  questions: WordQuestions;
  fillBlank: FillBlankQuestion;
}

interface Props {
  wordData: WordSetData;
  wordIndex: number;
  totalWords: number;
  onComplete: () => void;
}

const QUESTION_KEYS = ['mcq', 'comp_0', 'comp_1', 'fill_blank'] as const;
type QuestionKey = (typeof QUESTION_KEYS)[number];

export default function WordPracticeCard({ wordData, wordIndex, totalWords, onComplete }: Props) {
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({});

  const totalQ = 4;
  const answeredCount = Object.keys(submitted).length;
  const allAnswered = answeredCount >= totalQ;

  const recordAnswer = useCallback(
    async (questionKey: string, answer: string, isCorrect: boolean) => {
      if (submitted[questionKey]) return;
      setSubmitted((s) => ({ ...s, [questionKey]: true }));
      setAnswers((a) => ({ ...a, [questionKey]: answer }));
      setCorrectMap((c) => ({ ...c, [questionKey]: isCorrect }));
      try {
        await fetch('/api/questions/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wordSetId: wordData.wordSetId,
            questionKey,
            isCorrect,
          }),
        });
      } catch { /* silent */ }
    },
    [wordData.wordSetId, submitted]
  );

  const correctCount = Object.values(correctMap).filter(Boolean).length;
  const isLast = wordIndex === totalWords - 1;

  return (
    <div className="space-y-5">
      {/* Word header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full">
            Word {wordIndex + 1} of {totalWords}
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-wide">{wordData.word}</h2>
      </div>

      {/* Paragraph */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Read the passage
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          {wordData.paragraph}
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">

        {/* Q1: Word Meaning MCQ */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">
            Q1 — Word Meaning
          </p>
          <SessionMCQ
            questionKey="mcq"
            data={wordData.questions.mcq}
            submitted={!!submitted['mcq']}
            selectedAnswer={answers['mcq'] ?? ''}
            onAnswer={recordAnswer}
          />
        </div>

        {/* Q2: Comprehension 1 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">
            Q2 — Comprehension
          </p>
          <SessionMCQ
            questionKey="comp_0"
            data={wordData.questions.comp[0]}
            submitted={!!submitted['comp_0']}
            selectedAnswer={answers['comp_0'] ?? ''}
            onAnswer={recordAnswer}
          />
        </div>

        {/* Q3: Comprehension 2 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">
            Q3 — Comprehension
          </p>
          <SessionMCQ
            questionKey="comp_1"
            data={wordData.questions.comp[1]}
            submitted={!!submitted['comp_1']}
            selectedAnswer={answers['comp_1'] ?? ''}
            onAnswer={recordAnswer}
          />
        </div>

        {/* Q4: Fill in the Blank */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">
            Q4 — Fill in the Blank
          </p>
          <FillBlankExercise
            questionKey="fill_blank"
            data={wordData.fillBlank}
            submitted={!!submitted['fill_blank']}
            onAnswer={recordAnswer}
          />
        </div>
      </div>

      {/* Score + Next button */}
      {allAnswered && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Score:{' '}
            <strong className={correctCount === 4 ? 'text-emerald-600' : 'text-indigo-600'}>
              {correctCount} / 4
            </strong>
            {correctCount === 4 && ' — Perfect!'}
          </span>
          <button
            onClick={onComplete}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            {isLast ? 'Continue to Dictation →' : 'Next Word →'}
          </button>
        </div>
      )}

      {/* Used to suppress unused import warning */}
      {(QUESTION_KEYS as readonly QuestionKey[]).length > 0 && null}
    </div>
  );
}
