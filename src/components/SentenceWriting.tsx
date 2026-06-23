'use client';

import { useState } from 'react';
import { SentenceFeedback } from '@/lib/deepseek';

interface Props {
  questionKey: string;
  word: string;
  age: number;
  submitted: boolean;
  onAnswer: (questionKey: string, answer: string, isCorrect: boolean) => void;
}

export default function SentenceWriting({ questionKey, word, age, submitted: initialSubmitted, onAnswer }: Props) {
  const [sentence, setSentence] = useState('');
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<SentenceFeedback | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const trimmed = sentence.trim();
    if (trimmed.length < 3) {
      setError('Please write a complete sentence.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/practice/evaluate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, sentence: trimmed, age }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || d.error || 'Evaluation failed');
      }
      const fb: SentenceFeedback = await res.json();
      setFeedback(fb);
      setSubmitted(true);
      onAnswer(questionKey, trimmed, fb.correct);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleRewrite() {
    setSentence('');
    setFeedback(null);
    setSubmitted(false);
    setError('');
  }

  // Not yet submitted — input mode
  if (!submitted) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-stone-600 font-medium">
          Write a sentence using the word <strong className="text-indigo-600">&ldquo;{word}&rdquo;</strong>:
        </p>
        <textarea
          value={sentence}
          onChange={(e) => { setSentence(e.target.value); setError(''); }}
          placeholder={`Type your sentence here using "${word}"…`}
          disabled={loading}
          rows={3}
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white placeholder:text-stone-300 resize-none disabled:opacity-50"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={loading || sentence.trim().length < 3}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-300 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Evaluating…
            </span>
          ) : (
            'Submit Sentence'
          )}
        </button>
      </div>
    );
  }

  // Submitted — show feedback
  if (feedback) {
    const scoreColor = feedback.score >= 8 ? 'text-emerald-600' : feedback.score >= 7 ? 'text-amber-600' : 'text-red-600';
    const bgColor = feedback.score >= 8 ? 'bg-emerald-50 border-emerald-200' : feedback.score >= 7 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

    return (
      <div className="space-y-3">
        {/* The sentence */}
        <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3">
          <p className="text-xs text-stone-400 mb-1">Your sentence:</p>
          <p className="text-sm text-stone-800 italic">&ldquo;{sentence}&rdquo;</p>
        </div>

        {/* Score */}
        <div className={`${bgColor} rounded-xl p-4 border`}>
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-2xl font-bold ${scoreColor}`}>{feedback.score}/10</span>
            <span className={`text-sm font-semibold ${scoreColor}`}>
              {feedback.score >= 8 ? '🌟 Excellent!' : feedback.score >= 7 ? '👍 Good effort!' : '📝 Needs work'}
            </span>
          </div>

          {feedback.grammar && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-stone-500 mb-0.5">Grammar</p>
              <p className="text-sm text-stone-700">{feedback.grammar}</p>
            </div>
          )}
          {feedback.vocabulary && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-stone-500 mb-0.5">Vocabulary & Usage</p>
              <p className="text-sm text-stone-700">{feedback.vocabulary}</p>
            </div>
          )}
          {feedback.suggestions && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-stone-500 mb-0.5">Suggestions</p>
              <p className="text-sm text-stone-700">{feedback.suggestions}</p>
            </div>
          )}
        </div>

        {/* Rewrite button if not correct */}
        {!feedback.correct && (
          <button
            onClick={handleRewrite}
            className="w-full bg-white border-2 border-indigo-200 hover:border-indigo-400 text-indigo-600 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            ✏️ Rewrite Your Sentence
          </button>
        )}
      </div>
    );
  }

  return null;
}
