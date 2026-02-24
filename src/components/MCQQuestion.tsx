'use client';

import { MCQQuestion as MCQData } from '@/lib/claude';

interface MCQQuestionProps {
  data: MCQData;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  submitted: boolean;
  selectedAnswer: string | null;
}

export default function MCQQuestion({ data, onAnswer, submitted, selectedAnswer }: MCQQuestionProps) {
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-4">
      <p className="text-xl font-bold text-gray-800">{data.question}</p>
      <div className="grid gap-3">
        {data.options.map((option, i) => {
          const letter = optionLetters[i];
          const isSelected = selectedAnswer === option;
          const isCorrect = option === data.answer;
          let bgClass = 'bg-white border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50';

          if (submitted) {
            if (isCorrect) bgClass = 'bg-green-100 border-2 border-green-500';
            else if (isSelected) bgClass = 'bg-red-100 border-2 border-red-400';
            else bgClass = 'bg-gray-50 border-2 border-gray-200 opacity-70';
          } else if (isSelected) {
            bgClass = 'bg-purple-100 border-2 border-purple-500';
          }

          return (
            <button
              key={option}
              onClick={() => !submitted && onAnswer(option, isCorrect)}
              disabled={submitted}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium text-base transition-all duration-150 ${bgClass} flex items-center gap-3`}
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                {letter}
              </span>
              <span>{option}</span>
              {submitted && isCorrect && <span className="ml-auto text-green-600 text-xl">✓</span>}
              {submitted && isSelected && !isCorrect && <span className="ml-auto text-red-500 text-xl">✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
