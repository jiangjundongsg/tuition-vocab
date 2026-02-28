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

export default function PhotoUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFile(f: File) {
    setFile(f);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) selectFile(f);
  }, []);

  async function handleUpload() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/words/upload-photo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResult(data as UploadResult);
      setFile(null);
      setPreview(null);
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
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
        />

        {preview ? (
          <div className="p-4 flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Selected" className="max-h-48 rounded-lg object-contain shadow-sm" />
            <p className="text-xs text-slate-500">{file?.name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setResult(null); setError(null); }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center gap-2 text-center">
            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-semibold text-slate-600">Click or drag a photo here</p>
            <p className="text-xs text-slate-400">JPEG, PNG, WebP supported · Max 4 MB</p>
          </div>
        )}
      </div>

      {file && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Extracting words…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
