'use client';

import { MCQQuestion } from '@/lib/claude';

interface Props {
  questionKey: string;
  data: MCQQuestion;
  submitted: boolean;
  selectedAnswer: string;
  onAnswer: (questionKey: string, answer: string, isCorrect: boolean) => void;
}

export default function SessionMCQ({ questionKey, data, submitted, selectedAnswer, onAnswer }: Props) {
  const labels = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-2">
      <p className="font-semibold text-gray-800 text-sm">{data.question}</p>
      <div className="grid grid-cols-1 gap-1.5">
        {data.options.map((option, i) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === data.answer;

          let cls = 'flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm cursor-pointer transition-all duration-150 ';
          if (!submitted) {
            cls += 'border-gray-200 hover:border-purple-300 hover:bg-purple-50';
          } else if (isCorrect) {
            cls += 'border-green-400 bg-green-50 text-green-800';
          } else if (isSelected && !isCorrect) {
            cls += 'border-red-400 bg-red-50 text-red-800';
          } else {
            cls += 'border-gray-200 bg-gray-50 text-gray-400';
          }

          return (
            <button
              key={option}
              className={cls}
              disabled={submitted}
              onClick={() => onAnswer(questionKey, option, option === data.answer)}
            >
              <span className="font-bold text-xs w-5 h-5 rounded-full bg-current/10 flex items-center justify-center shrink-0">
                {labels[i]}
              </span>
              <span>{option}</span>
              {submitted && isCorrect && <span className="ml-auto">✅</span>}
              {submitted && isSelected && !isCorrect && <span className="ml-auto">❌</span>}
            </button>
          );
        })}
      </div>
      {submitted && (
        <p className="text-xs text-gray-500 italic mt-1">💡 {data.explanation}</p>
      )}
    </div>
  );
}
