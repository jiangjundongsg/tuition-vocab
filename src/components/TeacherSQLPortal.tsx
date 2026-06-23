'use client';

import { useState } from 'react';

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export default function TeacherSQLPortal() {
  const [query, setQuery] = useState('SELECT * FROM words LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runQuery() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/teacher/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Query failed');
        return;
      }
      setResult(data as QueryResult);
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!result || result.rows.length === 0) return;
    const cols = Object.keys(result.rows[0]);
    const lines = [
      cols.join(','),
      ...result.rows.map((row) =>
        cols.map((c) => {
          const v = row[c];
          if (v === null || v === undefined) return '';
          const str = String(v);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = result && result.rows.length > 0 ? Object.keys(result.rows[0]) : [];

  return (
    <div className="space-y-4">
      {/* Query textarea */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">SQL Query</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={5}
          spellCheck={false}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 resize-y"
          placeholder="SELECT * FROM words LIMIT 10;"
        />
        <p className="text-xs text-slate-400 mt-1">
          Allowed: SELECT, INSERT, UPDATE, DELETE. DDL (DROP, CREATE, ALTER, TRUNCATE) is blocked.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={runQuery}
          disabled={loading || !query.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run Query'}
        </button>
        {result && result.rows.length > 0 && (
          <button
            onClick={downloadCsv}
            className="border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Download CSV
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned
              {result.truncated && ' (showing first 200)'}
            </span>
          </div>

          {result.rows.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-8 text-center text-sm text-slate-400">
              Query executed successfully. No rows returned.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="text-left px-3 py-2 font-semibold text-slate-600 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {columns.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-2 text-slate-700 font-mono max-w-xs truncate"
                          title={String(row[col] ?? '')}
                        >
                          {row[col] === null ? (
                            <span className="text-slate-300 italic">null</span>
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
