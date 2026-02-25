'use client';

import { QuestionData } from '@/lib/claude';
import SessionMCQ from './SessionMCQ';
import FillBlankQuestion from './FillBlankQuestion';

interface Props {
  questionKey: string;
  data: QuestionData;
  submitted: boolean;
  selectedAnswer: string;
  isCorrect: boolean;
  onAnswer: (questionKey: string, answer: string, isCorrect: boolean) => void;
}

const TYPE_LABEL: Record<QuestionData['type'], string> = {
  mcq: '🔤 Multiple Choice',
  fill_blank: '✏️ Fill in the Blank',
  true_false: '✔️ True or False',
};

export default function QuestionRenderer({ questionKey, data, submitted, selectedAnswer, isCorrect, onAnswer }: Props) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-purple-400 mb-2">
        {TYPE_LABEL[data.type]}
      </p>
      {data.type === 'fill_blank' ? (
        <FillBlankQuestion
          questionKey={questionKey}
          data={data}
          submitted={submitted}
          isCorrect={isCorrect}
          onAnswer={onAnswer}
        />
      ) : (
        <SessionMCQ
          questionKey={questionKey}
          data={data}
          submitted={submitted}
          selectedAnswer={selectedAnswer}
          onAnswer={onAnswer}
        />
      )}
    </div>
  );
}
