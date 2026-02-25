'use client';

import { useState } from 'react';

interface Props {
  wordIndex: number;
  word: string;       // hidden until submitted — used for TTS and checking
  questionKey: string;
  submitted: boolean;
  isCorrect: boolean;
  onAnswer: (questionKey: string, typed: string, isCorrect: boolean) => void;
}

export default function DictationItem({ wordIndex, word, questionKey, submitted, isCorrect, onAnswer }: Props) {
  const [typed, setTyped] = useState('');
  const [speaking, setSpeaking] = useState(false);

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
    <div className={`p-4 rounded-xl border-2 transition-all ${
      !submitted ? 'border-gray-200 bg-white' :
      isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
    }`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center">
          {wordIndex + 1}
        </span>
        <button
          onClick={speak}
          disabled={speaking}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full text-sm font-bold transition-all disabled:opacity-60"
        >
          {speaking ? '🔊 Speaking...' : '🔊 Hear the word'}
        </button>
        {submitted && (
          <span className={`font-bold text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
            {isCorrect ? '✅ Correct!' : `❌ The word was: "${word}"`}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Type the word you heard..."
          disabled={submitted}
          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400 disabled:bg-gray-50"
        />
        {!submitted && (
          <button
            onClick={submit}
            disabled={!typed.trim()}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
          >
            Check
          </button>
        )}
      </div>
    </div>
  );
}
