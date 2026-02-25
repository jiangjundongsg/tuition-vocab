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
        <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="text-5xl">📚</div>
        <h1 className="text-4xl font-black text-gray-800">Upload Word List</h1>
        <p className="text-base text-gray-500 max-w-lg mx-auto">
          Add vocabulary words for students to practise. Each word is automatically scored for difficulty.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <WordUploader />
      </div>

      {/* Tips box */}
      <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
        <h3 className="font-bold text-indigo-700 text-base mb-3">💡 Format guide</h3>
        <ul className="space-y-2 text-indigo-800 text-sm">
          <li className="flex gap-2"><span className="font-mono bg-indigo-100 px-1.5 rounded">1 cat</span><span>Lesson 1, word "cat"</span></li>
          <li className="flex gap-2"><span className="font-mono bg-indigo-100 px-1.5 rounded">2 happy curious</span><span>Lesson 2, two words per line</span></li>
          <li className="flex gap-2"><span className="font-mono bg-indigo-100 px-1.5 rounded">magnificent</span><span>No lesson number — word only</span></li>
          <li className="mt-1 text-indigo-600">You can also drag and drop a .txt file. Words auto-score as 🌱 Easy · 🔥 Medium · 🚀 Hard</li>
        </ul>
      </div>
    </div>
  );
}
