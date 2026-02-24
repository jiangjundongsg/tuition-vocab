'use client';

interface AnswerFeedbackProps {
  isCorrect: boolean;
  explanation: string;
  addedToWrongBank?: boolean;
}

export default function AnswerFeedback({ isCorrect, explanation, addedToWrongBank }: AnswerFeedbackProps) {
  return (
    <div
      className={`mt-5 p-4 rounded-2xl border-2 ${
        isCorrect
          ? 'bg-green-50 border-green-400'
          : 'bg-red-50 border-red-400'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-3xl">{isCorrect ? '🎉' : '💪'}</span>
        <p className={`text-xl font-black ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
          {isCorrect ? 'Correct! Well done!' : "Not quite — keep going!"}
        </p>
      </div>
      <p className="text-base text-gray-700 font-medium">{explanation}</p>
      {!isCorrect && addedToWrongBank && (
        <p className="mt-2 text-sm font-bold text-orange-600">
          📝 Added to your Tricky Words list for more practice!
        </p>
      )}
    </div>
  );
}
