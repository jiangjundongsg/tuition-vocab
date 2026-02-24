'use client';

import { useState } from 'react';
import { GeneratedQuestions } from '@/lib/claude';
import MCQQuestion from './MCQQuestion';
import FillBlankQuestion from './FillBlankQuestion';
import ComprehensionQuestion from './ComprehensionQuestion';
import AnswerFeedback from './AnswerFeedback';

interface QuestionCardProps {
  word: string;
  questionId: number;
  questions: GeneratedQuestions;
  onAnswerSubmitted?: (questionType: 'mcq' | 'fill' | 'comprehension', isCorrect: boolean) => void;
}

type Tab = 'mcq' | 'fill' | 'comprehension';

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: 'mcq', label: 'Multiple Choice', emoji: '🔤' },
  { id: 'fill', label: 'Fill in Blank', emoji: '✏️' },
  { id: 'comprehension', label: 'Comprehension', emoji: '📖' },
];

interface TabState {
  submitted: boolean;
  isCorrect: boolean | null;
  selectedAnswer: string | null;
  addedToWrongBank: boolean;
}

const initialTabState: TabState = {
  submitted: false,
  isCorrect: null,
  selectedAnswer: null,
  addedToWrongBank: false,
};

export default function QuestionCard({ word, questionId, questions, onAnswerSubmitted }: QuestionCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('mcq');
  const [states, setStates] = useState<Record<Tab, TabState>>({
    mcq: { ...initialTabState },
    fill: { ...initialTabState },
    comprehension: { ...initialTabState },
  });

  const handleAnswer = async (tab: Tab, answer: string, isCorrect: boolean) => {
    // Update local state
    setStates((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], submitted: true, isCorrect, selectedAnswer: answer },
    }));

    // Report to parent
    onAnswerSubmitted?.(tab, isCorrect);

    // POST to answer API
    try {
      const res = await fetch('/api/questions/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, questionType: tab, isCorrect }),
      });
      const data = await res.json();

      if (!isCorrect) {
        setStates((prev) => ({
          ...prev,
          [tab]: { ...prev[tab], addedToWrongBank: true },
        }));
      }

      console.log('Answer recorded:', data);
    } catch (err) {
      console.error('Failed to record answer:', err);
    }
  };

  const currentState = states[activeTab];
  const explanation =
    activeTab === 'mcq'
      ? questions.mcq.explanation
      : activeTab === 'fill'
      ? questions.fill.explanation
      : questions.comprehension.explanation;

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-purple-100">
      {/* Word header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
        <p className="text-white text-sm font-bold opacity-80 uppercase tracking-widest">Word</p>
        <h2 className="text-white text-4xl font-black capitalize">{word}</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-100">
        {tabs.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold transition-colors duration-150 ${
              activeTab === id
                ? 'border-b-4 border-purple-500 text-purple-700 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{emoji}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'mcq' && (
          <MCQQuestion
            data={questions.mcq}
            onAnswer={(ans, correct) => handleAnswer('mcq', ans, correct)}
            submitted={states.mcq.submitted}
            selectedAnswer={states.mcq.selectedAnswer}
          />
        )}
        {activeTab === 'fill' && (
          <FillBlankQuestion
            data={questions.fill}
            onAnswer={(ans, correct) => handleAnswer('fill', ans, correct)}
            submitted={states.fill.submitted}
          />
        )}
        {activeTab === 'comprehension' && (
          <ComprehensionQuestion
            data={questions.comprehension}
            onAnswer={(ans, correct) => handleAnswer('comprehension', ans, correct)}
            submitted={states.comprehension.submitted}
          />
        )}

        {currentState.submitted && currentState.isCorrect !== null && (
          <AnswerFeedback
            isCorrect={currentState.isCorrect}
            explanation={explanation}
            addedToWrongBank={currentState.addedToWrongBank}
          />
        )}
      </div>
    </div>
  );
}
