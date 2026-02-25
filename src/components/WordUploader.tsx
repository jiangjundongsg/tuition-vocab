'use client';

import { useState, useCallback } from 'react';

interface UploadResult {
  inserted: number;
  skipped: number;
  words: Array<{ word: string; zipf: number | null; difficulty: string; lessonNumber: number | null }>;
}

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
      setResult(data);
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
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (ev) => setText(ev.target?.result as string);
      reader.readAsText(file);
    }
  }, []);

  const difficultyBadge = (d: string) => {
    if (d === 'easy') return 'bg-emerald-100 text-emerald-700';
    if (d === 'medium') return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
          dragging ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <p className="text-center text-sm text-gray-400 font-medium mb-3">
          Drag & drop a .txt file, or type / paste below
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"1 cat\n1 dog\n2 happy\n2 curious magnificent\n(format: lesson_number word)"}
          rows={8}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-purple-400 resize-none bg-white"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={loading || !text.trim()}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-base hover:shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>📤 Upload Word List</>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-medium">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
          <p className="font-bold text-emerald-700">
            🎉 {result.inserted} word{result.inserted !== 1 ? 's' : ''} uploaded
            {result.skipped > 0 && <span className="text-emerald-500 font-normal"> · {result.skipped} skipped</span>}
          </p>
          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
            {result.words.map(({ word, difficulty, lessonNumber }) => (
              <span
                key={word}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${difficultyBadge(difficulty)}`}
              >
                {lessonNumber !== null && (
                  <span className="opacity-60">L{lessonNumber}</span>
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
