'use client';

import { useState, useCallback, useRef } from 'react';

interface UploadResult {
  inserted: number;
  skipped: number;
  lessonNumber: string;
  words: Array<{ word: string; zipf: number | null; difficulty: string; lessonNumber: string }>;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  high:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium:  'bg-amber-50 text-amber-700 border-amber-200',
  low:     'bg-red-50 text-red-700 border-red-200',
  unknown: 'bg-slate-50 text-slate-500 border-slate-200',
};

export default function PDFUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [lessonNumber, setLessonNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFile(f: File) {
    setFile(f);
    setResult(null);
    setError(null);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') selectFile(f);
  }, []);

  async function handleUpload() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      if (lessonNumber.trim()) {
        formData.append('lessonNumber', lessonNumber.trim());
      }

      const res = await fetch('/api/words/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data as UploadResult);
      setFile(null);
      setLessonNumber('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
          dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
        />

        {file ? (
          <div className="p-6 flex flex-col items-center gap-3">
            {/* PDF icon */}
            <svg className="w-12 h-12 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 4h5v7h7v9H6V4zm2 9h8v1H8v-1zm0 2h8v1H8v-1zm0 2h5v1H8v-1z"/>
            </svg>
            <p className="text-sm font-semibold text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setError(null); }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center gap-2 text-center">
            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-semibold text-slate-600">Click or drag a PDF here</p>
            <p className="text-xs text-slate-400">PDF files only · Max 32 MB</p>
          </div>
        )}
      </div>

      {/* Optional lesson number input */}
      {file && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600 font-medium shrink-0">Lesson number</label>
          <input
            type="text"
            value={lessonNumber}
            onChange={(e) => setLessonNumber(e.target.value)}
            placeholder="e.g. 1A, 2B (defaults to today's date)"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
          />
        </div>
      )}

      {file && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Extracting words from PDF…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Extract &amp; Upload Words
            </>
          )}
        </button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <p className="font-semibold text-emerald-800 text-sm">
            {result.inserted} word{result.inserted !== 1 ? 's' : ''} extracted &amp; uploaded
            {result.skipped > 0 && (
              <span className="text-emerald-600 font-normal"> · {result.skipped} skipped</span>
            )}
            <span className="text-emerald-600 font-normal"> · Lesson {result.lessonNumber}</span>
          </p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {result.words.map(({ word, difficulty }) => (
              <span
                key={word}
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  DIFFICULTY_COLORS[difficulty] ?? DIFFICULTY_COLORS.unknown
                }`}
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
