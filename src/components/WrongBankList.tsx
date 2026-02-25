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
      <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
        <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-semibold text-slate-700 mb-1">All clear!</p>
        <p className="text-sm text-slate-400">Answer some questions incorrectly and they will appear here for focused re-practice.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {items.length} question{items.length !== 1 ? 's' : ''} to review
        </p>
        <button
          onClick={onPractice}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Practice now'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Word</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Times wrong</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Last wrong</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-semibold text-slate-800">{item.word}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{item.typeLabel}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 font-bold text-xs">
                    {item.wrongCount}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-slate-400 text-xs hidden sm:table-cell">
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
