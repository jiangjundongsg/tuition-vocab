'use client';

import { useState } from 'react';
import { ComprehensionQuestion as CompData } from '@/lib/claude';

interface ComprehensionQuestionProps {
  data: CompData;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  submitted: boolean;
}

export default function ComprehensionQuestion({ data, onAnswer, submitted }: ComprehensionQuestionProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim()) return;
    // Simple check: answer must contain key words from expected answer
    const userWords = input.trim().toLowerCase().split(/\s+/);
    const answerWords = data.answer.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchCount = answerWords.filter((w) => userWords.some((u) => u.includes(w) || w.includes(u))).length;
    const isCorrect = answerWords.length === 0 || matchCount / answerWords.length >= 0.5;
    onAnswer(input.trim(), isCorrect);
  };

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
        <p className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-wide">Read this:</p>
        <p className="text-base text-gray-800 leading-relaxed">{data.paragraph}</p>
      </div>
      <div>
        <p className="text-lg font-bold text-gray-800 mb-3">{data.question}</p>
        {!submitted ? (
          <div className="space-y-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write your answer here..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base focus:outline-none focus:border-purple-500 resize-none font-medium"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold text-base hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              Submit Answer
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <p className="text-sm font-bold text-gray-500 mb-1">Model answer:</p>
            <p className="text-base font-medium text-gray-700">{data.answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
