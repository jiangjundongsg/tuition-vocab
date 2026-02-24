'use client';

import { useState } from 'react';
import { FillBlankQuestion as FillData } from '@/lib/claude';

interface FillBlankQuestionProps {
  data: FillData;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  submitted: boolean;
}

export default function FillBlankQuestion({ data, onAnswer, submitted }: FillBlankQuestionProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim()) return;
    const isCorrect = input.trim().toLowerCase() === data.answer.toLowerCase();
    onAnswer(input.trim(), isCorrect);
  };

  // Replace _____ with the user's input or the answer
  const displaySentence = data.sentence.replace(
    '_____',
    submitted
      ? `[${data.answer}]`
      : input
      ? `[${input}]`
      : '_____'
  );

  return (
    <div className="space-y-5">
      <p className="text-lg font-semibold text-gray-700">Fill in the blank:</p>
      <p className="text-xl text-gray-800 font-medium bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
        {displaySentence}
      </p>
      {!submitted && (
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Type your answer here..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-lg focus:outline-none focus:border-purple-500 font-medium"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold text-base hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            Check
          </button>
        </div>
      )}
      {submitted && (
        <div className="flex items-center gap-2 text-base font-medium text-gray-600">
          <span>Answer:</span>
          <span className="text-purple-700 font-bold text-lg">{data.answer}</span>
        </div>
      )}
    </div>
  );
}
