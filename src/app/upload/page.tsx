'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WordUploader from '@/components/WordUploader';
import PhotoUploader from '@/components/PhotoUploader';

export default function UploadPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<'csv' | 'photo'>('csv');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const role = d.user?.role;
        if (role === 'teacher' || role === 'admin') setAllowed(true);
        else router.replace('/login?message=teacher-only');
      })
      .catch(() => router.replace('/login?message=teacher-only'))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl text-slate-900">Upload Word List</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Add vocabulary words for students to practise. Each word is automatically scored for difficulty.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab('csv')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'csv'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          CSV / Text
        </button>
        <button
          onClick={() => setTab('photo')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'photo'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📷 Photo
        </button>
      </div>

      {tab === 'csv' ? (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <WordUploader />
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Format Guide (CSV)</p>
            <div className="space-y-3 text-sm text-slate-500">
              {[
                { code: '1A,curious',    desc: 'Lesson 1A, word "curious"' },
                { code: '2B,magnificent', desc: 'Lesson 2B, word "magnificent"' },
                { code: 'ambitious',      desc: 'No lesson number — word only' },
              ].map(({ code, desc }) => (
                <div key={code} className="flex gap-3 items-center">
                  <code className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-700 shrink-0">
                    {code}
                  </code>
                  <span className="text-slate-400 text-xs">{desc}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 pt-1">
                Lesson number can be any text (e.g. 1A, 2B, Unit3). Difficulty is scored automatically as High, Medium, Low, or Unknown.
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <PhotoUploader />
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">How it works</p>
            <div className="space-y-2.5 text-xs text-slate-500">
              {[
                'Take a photo of a printed or handwritten word list.',
                'Upload the photo — Claude AI will extract the vocabulary words.',
                'Words are automatically assigned to today\'s lesson (date in yyyymmdd format).',
                'Difficulty is scored automatically based on word frequency data.',
              ].map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-indigo-400 font-bold shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
