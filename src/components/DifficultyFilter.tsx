'use client';

export type DifficultyLevel = 'all' | 'easy' | 'medium' | 'hard';

interface DifficultyFilterProps {
  value: DifficultyLevel;
  onChange: (value: DifficultyLevel) => void;
}

const options: { value: DifficultyLevel; label: string; emoji: string; color: string }[] = [
  { value: 'all', label: 'All', emoji: '🌈', color: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' },
  { value: 'easy', label: 'Easy', emoji: '🌱', color: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' },
  { value: 'medium', label: 'Medium', emoji: '🔥', color: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200' },
  { value: 'hard', label: 'Hard', emoji: '🚀', color: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' },
];

export default function DifficultyFilter({ value, onChange }: DifficultyFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 font-bold text-base transition-all duration-150 ${opt.color} ${
            value === opt.value ? 'ring-4 ring-offset-1 ring-purple-400 scale-105 shadow-md' : ''
          }`}
        >
          <span>{opt.emoji}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
