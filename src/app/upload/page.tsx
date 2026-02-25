'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WordUploader from '@/components/WordUploader';

export default function UploadPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const role = d.user?.role;
        if (role === 'teacher' || role === 'admin') {
          setAllowed(true);
        } else {
          router.replace('/login?message=teacher-only');
        }
      })
      .catch(() => router.replace('/login?message=teacher-only'))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Word List</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Add vocabulary words for students to practise. Each word is automatically scored for difficulty.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <WordUploader />
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Format guide</h3>
        <div className="space-y-2 text-sm text-slate-500">
          <div className="flex gap-3 items-baseline">
            <code className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-slate-700 shrink-0">1 cat</code>
            <span>Lesson 1, word &ldquo;cat&rdquo;</span>
          </div>
          <div className="flex gap-3 items-baseline">
            <code className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-slate-700 shrink-0">2 happy curious</code>
            <span>Lesson 2, two words on one line</span>
          </div>
          <div className="flex gap-3 items-baseline">
            <code className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-slate-700 shrink-0">magnificent</code>
            <span>No lesson number — word only</span>
          </div>
          <p className="pt-1 text-xs text-slate-400">
            Drag and drop a .txt file is also supported. Difficulty is scored automatically as Easy, Medium, or Hard.
          </p>
        </div>
      </div>
    </div>
  );
}
