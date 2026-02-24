'use client';

import { useState, useCallback } from 'react';

interface UploadResult {
  inserted: number;
  skipped: number;
  words: Array<{ word: string; zipf: number | null; difficulty: string }>;
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

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-green-100 text-green-700';
    if (d === 'medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-4 border-dashed rounded-3xl p-6 transition-colors duration-150 ${
          dragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <p className="text-center text-gray-500 font-medium mb-3">
          Drag & drop a .txt file here, or type/paste words below
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="cat&#10;dog&#10;happy&#10;curious&#10;magnificent&#10;...one word per line (or comma-separated)"
          rows={8}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-base font-medium focus:outline-none focus:border-purple-500 resize-none bg-white"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={loading || !text.trim()}
        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black text-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="animate-spin text-2xl">⏳</span>
            <span>Processing words...</span>
          </>
        ) : (
          <>
            <span>📤</span>
            <span>Upload Word List</span>
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
          <p className="text-red-700 font-bold">❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <p className="font-black text-green-700 text-lg">
              {result.inserted} words uploaded!{result.skipped > 0 && ` (${result.skipped} skipped)`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {result.words.map(({ word, difficulty }) => (
              <span
                key={word}
                className={`px-3 py-1 rounded-full text-sm font-bold ${difficultyColor(difficulty)}`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
