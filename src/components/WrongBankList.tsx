'use client';

interface WrongBankItem {
  id: number;
  question_id: number;
  question_type: string;
  wrong_count: number;
  last_wrong_at: string;
  word: string;
  difficulty: string;
}

interface WrongBankListProps {
  items: WrongBankItem[];
  onPractice: () => void;
  loading: boolean;
}

const typeLabel = (t: string) => {
  if (t === 'mcq') return '🔤 MCQ';
  if (t === 'fill') return '✏️ Fill';
  return '📖 Reading';
};

const difficultyColor = (d: string) => {
  if (d === 'easy') return 'bg-green-100 text-green-700';
  if (d === 'medium') return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

export default function WrongBankList({ items, onPractice, loading }: WrongBankListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-6xl mb-4">🌟</p>
        <p className="text-2xl font-black text-gray-700">Your tricky words list is empty!</p>
        <p className="text-gray-500 mt-2 font-medium">
          Practice some words and any you get wrong will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-600 font-medium">
          {items.length} tricky {items.length === 1 ? 'word' : 'words'} to practice
        </p>
        <button
          onClick={onPractice}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-2xl font-black text-base hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? '⏳ Loading...' : '🎯 Practice Now!'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border-2 border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-purple-50">
            <tr>
              <th className="text-left px-4 py-3 font-black text-purple-700">Word</th>
              <th className="text-left px-4 py-3 font-black text-purple-700">Difficulty</th>
              <th className="text-left px-4 py-3 font-black text-purple-700">Question Type</th>
              <th className="text-center px-4 py-3 font-black text-purple-700">Times Wrong</th>
              <th className="text-left px-4 py-3 font-black text-purple-700">Last Wrong</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 font-bold text-gray-800 capitalize text-base">{item.word}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${difficultyColor(item.difficulty)}`}>
                    {item.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-600">{typeLabel(item.question_type)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-black text-sm">
                    {item.wrong_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(item.last_wrong_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
