'use client';

import { useState, useCallback, useEffect } from 'react';
import DictationItem from './DictationItem';
import SessionMCQ from './SessionMCQ';
import FillBlankExercise from './FillBlankExercise';
import { WordSetData } from './WordPracticeCard';

interface WordInfo {
  id: number;
  word: string;
}

interface WrongBankItem {
  id: number;
  wordSetId: number;
  wordId: number;
  word: string;
  lessonNumber: string | null;
  questionKey: string;
  typeLabel: string;
  correctAnswer: string;
  wrongCount: number;
}

interface Props {
  words: WordInfo[];
  lessonNumber: string;
  onDone?: () => void;
}

type Phase = 'dictation' | 'repractice' | 'done';

export default function DictationSession({ words, lessonNumber, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('dictation');
  const [wordSets, setWordSets] = useState<Record<number, WordSetData | 'loading' | 'error'>>({});
  const [dictationSubmitted, setDictationSubmitted] = useState<Record<string, boolean>>({});
  const [dictationCorrect, setDictationCorrect] = useState<Record<string, boolean>>({});

  const [wrongItems, setWrongItems] = useState<WrongBankItem[]>([]);
  const [repracticeIndex, setRepracticeIndex] = useState(0);
  const [repracticeSubmitted, setRepracticeSubmitted] = useState<Record<number, boolean>>({});
  const [repracticeCorrect, setRepracticeCorrect] = useState<Record<number, boolean>>({});
  const [repracticeAnswers, setRepracticeAnswers] = useState<Record<number, string>>({});

  // Pending dictation answers awaiting word set load (wordId → answer info)
  const [pendingDictation, setPendingDictation] = useState<Record<number, { isCorrect: boolean; word: string }>>({});

  function loadWordSet(wordId: number, wordLabel: string) {
    setWordSets((prev) => ({ ...prev, [wordId]: 'loading' }));
    fetch(`/api/practice/${wordId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setWordSets((prev) => ({
          ...prev,
          [wordId]: {
            wordSetId: data.wordSetId,
            word: wordLabel,
            paragraph: data.paragraph,
            questions: data.questions,
            fillBlank: data.fillBlank,
          } as WordSetData,
        }));
      })
      .catch(() => {
        setWordSets((prev) => ({ ...prev, [wordId]: 'error' }));
      });
  }

  // Load all word sets upfront (for meanings in dictation)
  useEffect(() => {
    words.forEach((w) => {
      if (wordSets[w.id]) return;
      loadWordSet(w.id, w.word);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load word set for repractice item if not already loaded
  useEffect(() => {
    if (phase !== 'repractice') return;
    const item = wrongItems[repracticeIndex];
    if (!item || wordSets[item.wordId]) return;
    loadWordSet(item.wordId, item.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, repracticeIndex, wrongItems]);

  // Flush pending dictation answers once word sets finish loading
  useEffect(() => {
    const pending = Object.entries(pendingDictation);
    if (pending.length === 0) return;
    const flushed: number[] = [];
    for (const [wordIdStr, { isCorrect, word }] of pending) {
      const wordId = Number(wordIdStr);
      const ws = wordSets[wordId];
      if (!ws || ws === 'loading' || ws === 'error') continue;
      flushed.push(wordId);
      fetch('/api/questions/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordSetId: ws.wordSetId, questionKey: 'dictation', isCorrect, correctAnswer: word }),
      }).catch(() => {});
    }
    if (flushed.length > 0) {
      setPendingDictation((p) => {
        const next = { ...p };
        flushed.forEach((id) => delete next[id]);
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordSets]);

  const recordDictation = useCallback(
    async (questionKey: string, typed: string, isCorrect: boolean) => {
      if (dictationSubmitted[questionKey]) return;
      setDictationSubmitted((s) => ({ ...s, [questionKey]: true }));
      setDictationCorrect((c) => ({ ...c, [questionKey]: isCorrect }));

      const idx = parseInt(questionKey.split('_')[1] ?? '0');
      const wordInfo = words[idx];
      if (!wordInfo) return;
      const ws = wordSets[wordInfo.id];
      if (!ws || ws === 'loading' || ws === 'error') {
        // Word set not ready yet — buffer and send once it loads
        setPendingDictation((p) => ({ ...p, [wordInfo.id]: { isCorrect, word: wordInfo.word } }));
        return;
      }

      try {
        await fetch('/api/questions/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wordSetId: ws.wordSetId, questionKey: 'dictation', isCorrect, correctAnswer: wordInfo.word }),
        });
      } catch { /* silent */ }
    },
    [dictationSubmitted, wordSets, words],
  );

  const allDictationDone = words.every((_, i) => dictationSubmitted[`dictation_${i}`]);

  async function finishDictation() {
    try {
      const res = await fetch(`/api/wrong-bank?lesson=${encodeURIComponent(lessonNumber)}`);
      const data = await res.json();
      const items: WrongBankItem[] = data.items ?? [];
      if (items.length === 0) {
        setPhase('done');
      } else {
        setWrongItems(items);
        setRepracticeIndex(0);
        setRepracticeSubmitted({});
        setRepracticeCorrect({});
        setRepracticeAnswers({});
        setPhase('repractice');
      }
    } catch {
      setPhase('done');
    }
  }

  async function handleRepracticeAnswer(wrongBankId: number, answer: string, isCorrect: boolean) {
    if (repracticeSubmitted[wrongBankId]) return;
    setRepracticeSubmitted((s) => ({ ...s, [wrongBankId]: true }));
    setRepracticeCorrect((c) => ({ ...c, [wrongBankId]: isCorrect }));
    setRepracticeAnswers((a) => ({ ...a, [wrongBankId]: answer }));
    try {
      await fetch('/api/wrong-bank/repractice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wrongBankId, isCorrect }),
      });
    } catch { /* silent */ }
  }

  function nextRepractice() {
    if (repracticeIndex < wrongItems.length - 1) {
      setRepracticeIndex((i) => i + 1);
    } else {
      setPhase('done');
    }
  }

  // ─── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const correctDictation = Object.values(dictationCorrect).filter(Boolean).length;
    const correctRepractice = Object.values(repracticeCorrect).filter(Boolean).length;
    return (
      <div className="bg-indigo-600 rounded-xl p-8 text-center text-white">
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
        <div className="text-indigo-100 text-sm mb-4 space-y-1">
          <p>Dictation: {correctDictation} / {words.length} correct</p>
          {wrongItems.length > 0 && (
            <p>Tricky Words Review: {correctRepractice} / {wrongItems.length} corrected</p>
          )}
        </div>
        {onDone && (
          <button
            onClick={onDone}
            className="bg-white text-indigo-700 font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-indigo-50 transition-colors"
          >
            Practice Another Lesson
          </button>
        )}
      </div>
    );
  }

  // ─── Repractice ────────────────────────────────────────────────────────────
  if (phase === 'repractice') {
    const item = wrongItems[repracticeIndex];
    if (!item) { setPhase('done'); return null; }
    const ws = wordSets[item.wordId];
    const wsData = ws && ws !== 'loading' && ws !== 'error' ? ws : null;
    const isSubmitted = !!repracticeSubmitted[item.id];
    const isCorrect = !!repracticeCorrect[item.id];

    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-amber-900">Tricky Words Review</h2>
              <p className="text-sm text-amber-700 mt-0.5">Re-answer questions you got wrong earlier</p>
            </div>
            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
              {repracticeIndex + 1} / {wrongItems.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-lg">{item.word}</span>
            <span className="text-xs text-slate-400">{item.typeLabel}</span>
            {item.wrongCount > 1 && (
              <span className="text-xs text-red-500 font-semibold">✗ wrong {item.wrongCount}×</span>
            )}
          </div>

          {wsData && (
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-relaxed">
              {wsData.paragraph}
            </p>
          )}

          {wsData && item.questionKey === 'mcq' && (
            <SessionMCQ questionKey={`rp_${item.id}_mcq`} data={wsData.questions.mcq} submitted={isSubmitted} selectedAnswer={repracticeAnswers[item.id] ?? ''} onAnswer={(_, a, c) => handleRepracticeAnswer(item.id, a, c)} />
          )}
          {wsData && item.questionKey.startsWith('comp_') && (() => {
            const idx = parseInt(item.questionKey.split('_')[1] ?? '0');
            const compQ = wsData.questions.comp[idx];
            return compQ ? (
              <SessionMCQ questionKey={`rp_${item.id}_comp${idx}`} data={compQ} submitted={isSubmitted} selectedAnswer={repracticeAnswers[item.id] ?? ''} onAnswer={(_, a, c) => handleRepracticeAnswer(item.id, a, c)} />
            ) : null;
          })()}
          {wsData && item.questionKey === 'fill_blank' && (
            <FillBlankExercise questionKey={`rp_${item.id}_fill`} data={wsData.fillBlank} submitted={isSubmitted} onAnswer={(_, a, c) => handleRepracticeAnswer(item.id, a, c)} />
          )}
          {item.questionKey === 'dictation' && (
            <DictationItem wordIndex={repracticeIndex} word={item.word} meaning={wsData?.questions.mcq.explanation} questionKey={`rp_${item.id}_dict`} submitted={isSubmitted} isCorrect={isCorrect} onAnswer={(_, a, c) => handleRepracticeAnswer(item.id, a, c)} />
          )}
          {!wsData && item.questionKey !== 'dictation' && (
            <p className="text-sm text-slate-400">Loading question…</p>
          )}

          {isSubmitted && (
            <div className={`flex items-center justify-between p-3 rounded-lg ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                {isCorrect ? '✓ Correct! Removed from Tricky Words.' : '✗ Still tricky — keep practising!'}
              </span>
              <button onClick={nextRepractice} className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors">
                {repracticeIndex < wrongItems.length - 1 ? 'Next →' : 'Finish →'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Dictation ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Dictation — Lesson {lessonNumber}</h2>
        <p className="text-sm text-slate-500">
          Click to hear each word, then type what you hear. The word meaning is shown as a hint.
        </p>
      </div>

      <div className="space-y-3">
        {words.map((w, i) => {
          const ws = wordSets[w.id];
          const meaning = ws && ws !== 'loading' && ws !== 'error'
            ? ws.questions.mcq.explanation
            : undefined;
          return (
            <DictationItem
              key={w.id}
              wordIndex={i}
              word={w.word}
              meaning={meaning}
              questionKey={`dictation_${i}`}
              submitted={!!dictationSubmitted[`dictation_${i}`]}
              isCorrect={!!dictationCorrect[`dictation_${i}`]}
              onAnswer={recordDictation}
            />
          );
        })}
      </div>

      {allDictationDone && (
        <button
          onClick={finishDictation}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          Review Tricky Words →
        </button>
      )}
    </div>
  );
}
