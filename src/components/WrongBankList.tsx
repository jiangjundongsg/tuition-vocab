'use client';

interface WrongBankItem {
  id: number;
  word: string;
  typeLabel: string;
  wrongCount: number;
  lastWrongAt: string;
}

interface Props {
  items: WrongBankItem[];
  onPractice: () => void;
  loading: boolean;
}

export default function WrongBankList({ items, onPractice, loading }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">🌟</div>
        <p className="font-bold text-lg">Your tricky words list is empty!</p>
        <p className="text-sm mt-1">Answer some questions wrong and they&apos;ll appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} question{items.length !== 1 ? 's' : ''} to practise</p>
        <button
          onClick={onPractice}
          disabled={loading}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-5 py-2 rounded-full text-sm shadow hover:shadow-md hover:scale-105 transition-all disabled:opacity-60"
        >
          {loading ? 'Loading...' : '🎯 Practice Now!'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-purple-50 text-purple-700 font-bold text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">Word</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-center px-4 py-3">Times Wrong</th>
              <th className="text-right px-4 py-3 hidden sm:table-cell">Last Wrong</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 font-bold text-gray-800">{item.word}</td>
                <td className="px-4 py-3 text-gray-600">{item.typeLabel}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                    {item.wrongCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                  {new Date(item.lastWrongAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
