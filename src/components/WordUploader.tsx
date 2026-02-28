'use client';

import { useState, useCallback } from 'react';

interface UploadResult {
  inserted: number;
  skipped: number;
  words: Array<{ word: string; zipf: number | null; difficulty: string; lessonNumber: string | null }>;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  high:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium:  'bg-amber-50 text-amber-700 border-amber-200',
  low:     'bg-red-50 text-red-700 border-red-200',
  unknown: 'bg-slate-50 text-slate-500 border-slate-200',
};

export default function WordUploader() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleUpload = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/words/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data as UploadResult);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/plain' || file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      const reader = new FileReader();
      reader.onload = (ev) => setText(ev.target?.result as string);
      reader.readAsText(file);
    }
  }, []);

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
          dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        <p className="text-center text-xs text-slate-400 mb-3">
          Drag & drop a .csv or .txt file here, or type/paste below
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"1A,curious\n1A,ambitious\n1A,magnificent\n2B,eloquent\n\n(Format: lesson_number,word)"}
          rows={8}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 resize-none bg-white"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={loading || !text.trim()}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing…
          </>
        ) : 'Upload Word List'}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <p className="font-semibold text-emerald-800 text-sm">
            {result.inserted} word{result.inserted !== 1 ? 's' : ''} uploaded successfully
            {result.skipped > 0 && (
              <span className="text-emerald-600 font-normal"> · {result.skipped} skipped</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {result.words.map(({ word, difficulty, lessonNumber }) => (
              <span
                key={word}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  DIFFICULTY_COLORS[difficulty] ?? DIFFICULTY_COLORS.unknown
                }`}
              >
                {lessonNumber !== null && (
                  <span className="opacity-50">L{lessonNumber}</span>
                )}
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
