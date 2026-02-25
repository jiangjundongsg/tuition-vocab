'use client';

export type DifficultyLevel = 'all' | 'easy' | 'medium' | 'hard';

interface Props {
  value: DifficultyLevel;
  onChange: (value: DifficultyLevel) => void;
}

const OPTIONS: { value: DifficultyLevel; label: string; active: string; inactive: string }[] = [
  {
    value: 'all',
    label: 'All levels',
    active: 'bg-indigo-600 text-white border-indigo-600',
    inactive: 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300',
  },
  {
    value: 'easy',
    label: 'Easy',
    active: 'bg-emerald-600 text-white border-emerald-600',
    inactive: 'bg-white text-slate-600 border-slate-300 hover:border-emerald-300',
  },
  {
    value: 'medium',
    label: 'Medium',
    active: 'bg-amber-500 text-white border-amber-500',
    inactive: 'bg-white text-slate-600 border-slate-300 hover:border-amber-300',
  },
  {
    value: 'hard',
    label: 'Hard',
    active: 'bg-red-600 text-white border-red-600',
    inactive: 'bg-white text-slate-600 border-slate-300 hover:border-red-300',
  },
];

export default function DifficultyFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
            value === opt.value ? opt.active : opt.inactive
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
