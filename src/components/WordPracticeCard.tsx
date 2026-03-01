'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import SessionMCQ from './SessionMCQ';
import FillBlankExercise from './FillBlankExercise';
import { WordQuestions } from '@/lib/claude';
import { FillBlankQuestion } from '@/lib/fillblank';
import { makeUtterance, cancelAndSpeak } from '@/lib/tts';

// ── Speak word button ────────────────────────────────────────────────────────

function SpeakButton({ word }: { word: string }) {
  const [speaking, setSpeaking] = useState(false);

  function speak() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = makeUtterance(word, 0.8);
    setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <button
      onClick={speak}
      disabled={speaking}
      title="Hear the word"
      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.27 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.27l4.113-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
      </svg>
      {speaking ? 'Speaking…' : 'Hear'}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface WordSetData {
  wordSetId: number;
  word: string;
  paragraph: string;
  questions: WordQuestions;
  fillBlank: FillBlankQuestion;
}

interface Props {
  wordId: number;
  wordData: WordSetData;
  wordIndex: number;
  totalWords: number;
  onComplete: () => void;
}

export default function WordPracticeCard({ wordId, wordData: initialData, wordIndex, totalWords, onComplete }: Props) {
  const [data, setData] = useState<WordSetData>(initialData);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [readingPassage, setReadingPassage] = useState(false);
  const [passageHighlight, setPassageHighlight] = useState(-1);
  const passageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const passageTokens = useMemo(() => {
    const tokens: Array<{ text: string; isWord: boolean; start: number }> = [];
    const re = /\S+|\s+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(data.paragraph)) !== null) {
      tokens.push({ text: m[0], isWord: /\S/.test(m[0]), start: m.index });
    }
    return tokens;
  }, [data.paragraph]);

  const compKeys = data.questions.comp.map((_, i) => `comp_${i}`);
  const allKeys = ['mcq', ...compKeys, 'fill_blank'];
  const totalQ = allKeys.length;
  const allAnswered = Object.keys(submitted).length >= totalQ;

  const recordAnswer = useCallback(
    async (questionKey: string, answer: string, isCorrect: boolean) => {
      if (submitted[questionKey]) return;
      setSubmitted((s) => ({ ...s, [questionKey]: true }));
      setAnswers((a) => ({ ...a, [questionKey]: answer }));
      setCorrectMap((c) => ({ ...c, [questionKey]: isCorrect }));
      try {
        await fetch('/api/questions/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wordSetId: data.wordSetId, questionKey, isCorrect }),
        });
      } catch { /* silent */ }
    },
    [data.wordSetId, submitted]
  );

  async function handleChangePassage() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/practice/${wordId}/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error('Refresh failed');
      const newData = await res.json();
      window.speechSynthesis?.cancel();
      clearPassageTimers();
      setData({
        wordSetId: newData.wordSetId,
        word: data.word,
        paragraph: newData.paragraph,
        questions: newData.questions,
        fillBlank: newData.fillBlank,
      });
      // Reset all answers and speech state for the new passage
      setSubmitted({});
      setAnswers({});
      setCorrectMap({});
      setReadingPassage(false);
      setPassageHighlight(-1);
    } catch {
      // silently ignore — leave current passage
    } finally {
      setRefreshing(false);
    }
  }

  function clearPassageTimers() {
    passageTimers.current.forEach(clearTimeout);
    passageTimers.current = [];
  }

  function readPassage() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (readingPassage) {
      window.speechSynthesis.cancel();
      clearPassageTimers();
      setReadingPassage(false);
      setPassageHighlight(-1);
      return;
    }
    const utterance = makeUtterance(data.paragraph, 0.85);

    utterance.onstart = () => {
      clearPassageTimers();
      const msPerChar = 1000 / (0.85 * 13.5);
      passageTimers.current = passageTokens
        .filter((t) => t.isWord)
        .map((tok) => setTimeout(() => setPassageHighlight(tok.start), tok.start * msPerChar));
    };

    utterance.onboundary = (e) => {
      if (e.name === 'word') setPassageHighlight(e.charIndex);
    };

    const done = () => { clearPassageTimers(); setReadingPassage(false); setPassageHighlight(-1); };
    utterance.onend = done;
    utterance.onerror = done;
    setReadingPassage(true);
    setPassageHighlight(-1);
    cancelAndSpeak(utterance);
  }

  const correctCount = Object.values(correctMap).filter(Boolean).length;
  const isLast = wordIndex === totalWords - 1;

  return (
    <div className="space-y-5">
      {/* Word header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full">
            Word {wordIndex + 1} of {totalWords}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-wide flex-1">{data.word}</h2>
          <SpeakButton word={data.word} />
        </div>
      </div>

      {/* Paragraph */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Read the passage</p>
          <div className="flex items-center gap-2">
            {/* Read aloud */}
            <button
              onClick={readPassage}
              title={readingPassage ? 'Stop reading' : 'Read passage aloud'}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.27 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.27l4.113-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
              {readingPassage ? 'Stop' : 'Read aloud'}
            </button>
            {/* Change passage */}
            <button
              onClick={handleChangePassage}
              disabled={refreshing || Object.keys(submitted).length > 0}
              title={Object.keys(submitted).length > 0 ? 'Cannot change passage after answering' : 'Load a different passage'}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {refreshing ? (
                <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {refreshing ? 'Loading…' : 'Change passage'}
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {passageTokens.map((tok, i) =>
            tok.isWord ? (
              <mark
                key={i}
                style={{
                  background: passageHighlight === tok.start ? '#fef08a' : 'transparent',
                  borderRadius: '3px',
                  padding: '0 1px',
                }}
              >
                {tok.text}
              </mark>
            ) : (
              <span key={i}>{tok.text}</span>
            )
          )}
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {/* Q1: Word Meaning MCQ */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">Q1 — Word Meaning</p>
          <SessionMCQ
            questionKey="mcq"
            data={data.questions.mcq}
            submitted={!!submitted['mcq']}
            selectedAnswer={answers['mcq'] ?? ''}
            onAnswer={recordAnswer}
          />
        </div>

        {/* Comprehension questions (variable count) */}
        {data.questions.comp.map((compQ, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">
              Q{i + 2} — Comprehension
            </p>
            <SessionMCQ
              questionKey={`comp_${i}`}
              data={compQ}
              submitted={!!submitted[`comp_${i}`]}
              selectedAnswer={answers[`comp_${i}`] ?? ''}
              onAnswer={recordAnswer}
            />
          </div>
        ))}

        {/* Fill in the Blank */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">
            Q{data.questions.comp.length + 2} — Fill in the Blank
          </p>
          <FillBlankExercise
            questionKey="fill_blank"
            data={data.fillBlank}
            submitted={!!submitted['fill_blank']}
            onAnswer={recordAnswer}
          />
        </div>
      </div>

      {/* Score + Next button */}
      {allAnswered && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Score:{' '}
            <strong className={correctCount === totalQ ? 'text-emerald-600' : 'text-indigo-600'}>
              {correctCount} / {totalQ}
            </strong>
            {correctCount === totalQ && ' — Perfect!'}
          </span>
          <button
            onClick={onComplete}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            {isLast ? 'Continue to Dictation →' : 'Next Word →'}
          </button>
        </div>
      )}
    </div>
  );
}
