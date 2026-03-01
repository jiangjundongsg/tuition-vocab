'use client';

import { useState } from 'react';

interface Props {
  wordIndex: number;
  word: string;
  meaning?: string;
  questionKey: string;
  submitted: boolean;
  isCorrect: boolean;
  onAnswer: (questionKey: string, typed: string, isCorrect: boolean) => void;
}

export default function DictationItem({ wordIndex, word, meaning, questionKey, submitted, isCorrect, onAnswer }: Props) {
  const [typed, setTyped] = useState('');
  const [speaking, setSpeaking] = useState(false);

  // Replace the target word with "it" in the meaning so it doesn't give away the answer
  const safeMeaning = meaning
    ? meaning.replace(new RegExp(`\\b${word}\\b`, 'gi'), 'it')
    : undefined;

  function speak() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    utterance.lang = 'en-US';
    setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function submit() {
    if (!typed.trim() || submitted) return;
    const correct = typed.trim().toLowerCase() === word.toLowerCase();
    onAnswer(questionKey, typed.trim(), correct);
  }

  return (
    <div className={`bg-white rounded-xl border transition-colors ${
      !submitted ? 'border-slate-200' :
      isCorrect ? 'border-emerald-300 bg-emerald-50/50' :
      'border-red-300 bg-red-50/50'
    } p-4`}>
      {safeMeaning && (
        <p className="text-xs text-slate-500 italic mb-2 ml-10">
          Meaning: {safeMeaning}
        </p>
      )}
      <div className="flex items-center gap-3 mb-3">
        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
          {wordIndex + 1}
        </span>
        <button
          onClick={speak}
          disabled={speaking || submitted}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.27 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.27l4.113-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
          {speaking ? 'Speaking…' : 'Hear the word'}
        </button>

        {submitted && (
          <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
            {isCorrect ? '✓ Correct' : `✗ Answer: "${word}"`}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Type the word you heard…"
          disabled={submitted}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 disabled:bg-slate-50 transition-colors"
        />
        {!submitted && (
          <button
            onClick={submit}
            disabled={!typed.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            Check
          </button>
        )}
      </div>
    </div>
  );
}
