'use client';

import { useState, useCallback } from 'react';
import StudentSelector from './StudentSelector';

interface UploadResult {
  inserted: number;
  skipped: number;
}

export default function WordUploader() {
  const [text, setText] = useState('');
  const [targetUserIds, setTargetUserIds] = useState<number[]>([]);
  const [lessonLabel, setLessonLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleUpload = async () => {
    if (!text.trim()) return;
    if (targetUserIds.length === 0) {
      setError('Please select at least one student.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, unknown> = { words: text, targetUserIds };
      if (lessonLabel.trim()) body.lessonNumber = lessonLabel.trim();

      const res = await fetch('/api/words/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data as UploadResult);
      setText('');
      setLessonLabel('');
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
      {/* Student selector */}
      <StudentSelector selectedIds={targetUserIds} onChange={setTargetUserIds} />

      {/* Lesson label */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Lesson Label (optional)</p>
        <input
          type="text"
          value={lessonLabel}
          onChange={(e) => setLessonLabel(e.target.value)}
          placeholder="e.g. Lesson 1A (defaults to userID + date, e.g. 3260311)"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
        />
      </div>

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
          placeholder={"curious\nambitious\nmagnificent\neloquent\n\n(One word per line)"}
          rows={8}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 resize-none bg-white"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={loading || !text.trim() || targetUserIds.length === 0}
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
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1">
          <p className="font-semibold text-emerald-800 text-sm">
            {result.inserted} word{result.inserted !== 1 ? 's' : ''} uploaded successfully
            {result.skipped > 0 && (
              <span className="text-emerald-600 font-normal"> · {result.skipped} skipped (duplicates)</span>
            )}
          </p>
          <p className="text-xs text-emerald-600">
            Words assigned to {targetUserIds.length} student{targetUserIds.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
