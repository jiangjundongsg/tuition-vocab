'use client';

// Generic MCQ/True-False question renderer
interface QuestionForMCQ {
  type: 'mcq' | 'true_false';
  question: string;
  options?: string[];  // present for mcq
  answer: string;
  explanation: string;
}

interface Props {
  questionKey: string;
  data: QuestionForMCQ;
  submitted: boolean;
  selectedAnswer: string;
  onAnswer: (questionKey: string, answer: string, isCorrect: boolean) => void;
}

export default function SessionMCQ({ questionKey, data, submitted, selectedAnswer, onAnswer }: Props) {
  const isTF = data.type === 'true_false';
  const options = isTF ? ['True', 'False'] : (data.options ?? []);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-800 leading-relaxed">{data.question}</p>

      <div className={`grid gap-2 ${isTF ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {options.map((option, i) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === data.answer;

          let cls = 'flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ';
          if (!submitted) {
            cls += 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 text-slate-700';
          } else if (isCorrect) {
            cls += 'border-emerald-400 bg-emerald-50 text-emerald-800';
          } else if (isSelected) {
            cls += 'border-red-400 bg-red-50 text-red-800';
          } else {
            cls += 'border-slate-100 bg-slate-50 text-slate-400';
          }

          const label = isTF ? option[0] : String.fromCharCode(65 + i); // A, B, C, D

          return (
            <button
              key={option}
              className={cls}
              disabled={submitted}
              onClick={() => onAnswer(questionKey, option, option === data.answer)}
            >
              <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold
                ${!submitted ? 'bg-slate-100 text-slate-500' :
                  isCorrect ? 'bg-emerald-200 text-emerald-800' :
                  isSelected ? 'bg-red-200 text-red-800' :
                  'bg-slate-100 text-slate-400'}`}>
                {label}
              </span>
              <span className="flex-1 text-left">{option}</span>
              {submitted && isCorrect && <span className="text-emerald-600">✓</span>}
              {submitted && isSelected && !isCorrect && <span className="text-red-500">✗</span>}
            </button>
          );
        })}
      </div>

      {submitted && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
          {data.explanation}
        </p>
      )}
    </div>
  );
}
