'use client';

import { useState, useCallback, useEffect } from 'react';
import WordPracticeCard, { WordSetData } from './WordPracticeCard';
import DictationItem from './DictationItem';
import SessionMCQ from './SessionMCQ';
import FillBlankExercise from './FillBlankExercise';

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
  wrongCount: number;
}

interface Props {
  words: WordInfo[];
  lessonNumber: string;
  onDone?: () => void;
}

type Phase = 'words' | 'dictation' | 'repractice' | 'done';

export default function PracticeSession({ words, lessonNumber, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('words');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordSets, setWordSets] = useState<Record<number, WordSetData | 'loading' | 'error'>>({});
  const [dictationSubmitted, setDictationSubmitted] = useState<Record<string, boolean>>({});
  const [dictationCorrect, setDictationCorrect] = useState<Record<string, boolean>>({});

  // Repractice state
  const [wrongItems, setWrongItems] = useState<WrongBankItem[]>([]);
  const [repracticeIndex, setRepracticeIndex] = useState(0);
  const [repracticeSubmitted, setRepracticeSubmitted] = useState<Record<number, boolean>>({});
  const [repracticeCorrect, setRepracticeCorrect] = useState<Record<number, boolean>>({});
  const [repracticeAnswers, setRepracticeAnswers] = useState<Record<number, string>>({});

  const currentWord = words[currentWordIndex];

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

  // Load word set for current word (words phase)
  useEffect(() => {
    if (!currentWord) return;
    const id = currentWord.id;
    if (wordSets[id]) return;
    loadWordSet(id, currentWord.word);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord?.id]);

  // Load word set for current repractice item (if not already loaded)
  useEffect(() => {
    if (phase !== 'repractice') return;
    const item = wrongItems[repracticeIndex];
    if (!item) return;
    if (wordSets[item.wordId]) return;
    loadWordSet(item.wordId, item.word);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, repracticeIndex, wrongItems]);


  function handleWordComplete() {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex((i) => i + 1);
    } else {
      setPhase('dictation');
    }
  }

  const recordDictation = useCallback(
    async (questionKey: string, typed: string, isCorrect: boolean) => {
      if (dictationSubmitted[questionKey]) return;
      setDictationSubmitted((s) => ({ ...s, [questionKey]: true }));
      setDictationCorrect((c) => ({ ...c, [questionKey]: isCorrect }));

      const idx = parseInt(questionKey.split('_')[1] ?? '0');
      const wordInfo = words[idx];
      if (!wordInfo) return;
      const ws = wordSets[wordInfo.id];
      if (!ws || ws === 'loading' || ws === 'error') return;

      try {
        await fetch('/api/questions/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wordSetId: ws.wordSetId,
            questionKey: 'dictation',
            isCorrect,
          }),
        });
      } catch { /* silent */ }
    },
    [dictationSubmitted, wordSets, words]
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

  // ─── Done screen ─────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const correctDictation = Object.values(dictationCorrect).filter(Boolean).length;
    const correctRepractice = Object.values(repracticeCorrect).filter(Boolean).length;
    return (
      <div className="space-y-6">
        <div className="bg-blue-700 rounded-xl p-8 text-center text-white">
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <div className="text-blue-100 text-sm mb-4 space-y-1">
            <p>Dictation: {correctDictation} / {words.length} correct</p>
            {wrongItems.length > 0 && (
              <p>Tricky Words Review: {correctRepractice} / {wrongItems.length} corrected</p>
            )}
          </div>
          {onDone && (
            <button
              onClick={onDone}
              className="bg-white text-blue-700 font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition-colors"
            >
              Practice Another Lesson
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Repractice phase ─────────────────────────────────────────────────────────
  if (phase === 'repractice') {
    const item = wrongItems[repracticeIndex];
    if (!item) { setPhase('done'); return null; }

    const ws = wordSets[item.wordId];
    const wsData = ws && ws !== 'loading' && ws !== 'error' ? ws : null;
    const isSubmitted = !!repracticeSubmitted[item.id];
    const isCorrect = !!repracticeCorrect[item.id];

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-amber-900">Tricky Words Review</h2>
              <p className="text-sm text-amber-700 mt-0.5">
                Re-answer questions you got wrong earlier
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
              {repracticeIndex + 1} / {wrongItems.length}
            </span>
          </div>
        </div>

        {/* Word + question */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="bg-blue-700 text-white text-sm font-bold px-3 py-1 rounded-lg">
              {item.word}
            </span>
            <span className="text-xs text-slate-400">{item.typeLabel}</span>
            {item.wrongCount > 1 && (
              <span className="text-xs text-red-500 font-semibold">
                ✗ wrong {item.wrongCount}×
              </span>
            )}
          </div>

          {/* Paragraph context */}
          {wsData && (
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 leading-relaxed">
              {wsData.paragraph}
            </p>
          )}

          {/* The specific question */}
          {wsData && item.questionKey === 'mcq' && (
            <SessionMCQ
              questionKey={`repractice_${item.id}_mcq`}
              data={wsData.questions.mcq}
              submitted={isSubmitted}
              selectedAnswer={repracticeAnswers[item.id] ?? ''}
              onAnswer={(_, ans, correct) => handleRepracticeAnswer(item.id, ans, correct)}
            />
          )}
          {wsData && item.questionKey === 'comp_0' && (
            <SessionMCQ
              questionKey={`repractice_${item.id}_comp0`}
              data={wsData.questions.comp[0]}
              submitted={isSubmitted}
              selectedAnswer={repracticeAnswers[item.id] ?? ''}
              onAnswer={(_, ans, correct) => handleRepracticeAnswer(item.id, ans, correct)}
            />
          )}
          {wsData && item.questionKey === 'comp_1' && (
            <SessionMCQ
              questionKey={`repractice_${item.id}_comp1`}
              data={wsData.questions.comp[1]}
              submitted={isSubmitted}
              selectedAnswer={repracticeAnswers[item.id] ?? ''}
              onAnswer={(_, ans, correct) => handleRepracticeAnswer(item.id, ans, correct)}
            />
          )}
          {wsData && item.questionKey === 'fill_blank' && (
            <FillBlankExercise
              questionKey={`repractice_${item.id}_fill`}
              data={wsData.fillBlank}
              submitted={isSubmitted}
              onAnswer={(_, ans, correct) => handleRepracticeAnswer(item.id, ans, correct)}
            />
          )}
          {item.questionKey === 'dictation' && (
            <DictationItem
              wordIndex={repracticeIndex}
              word={item.word}
              meaning={wsData?.questions.mcq.explanation}
              questionKey={`repractice_${item.id}_dict`}
              submitted={isSubmitted}
              isCorrect={isCorrect}
              onAnswer={(_, ans, correct) => handleRepracticeAnswer(item.id, ans, correct)}
            />
          )}
          {!wsData && item.questionKey !== 'dictation' && (
            <p className="text-sm text-slate-400">Loading question…</p>
          )}

          {/* Result + Next */}
          {isSubmitted && (
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                {isCorrect ? '✓ Correct! Removed from Tricky Words.' : '✗ Still tricky — keep practising!'}
              </span>
              <button
                onClick={nextRepractice}
                className="ml-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                {repracticeIndex < wrongItems.length - 1 ? 'Next →' : 'Finish →'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Dictation phase ──────────────────────────────────────────────────────────
  if (phase === 'dictation') {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Dictation</h2>
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Review Tricky Words →
          </button>
        )}
      </div>
    );
  }

  // ─── Words phase ──────────────────────────────────────────────────────────────
  const currentWordSet = currentWord ? wordSets[currentWord.id] : null;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between text-sm font-semibold text-slate-600 mb-2">
          <span>Progress</span>
          <span>Word {currentWordIndex + 1} of {words.length}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${(currentWordIndex / words.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Word practice card */}
      {!currentWordSet || currentWordSet === 'loading' ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-blue-100 rounded-xl" />
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="h-20 bg-slate-100 rounded-xl" />
        </div>
      ) : currentWordSet === 'error' ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
          <p className="font-semibold mb-1">Could not load questions for &ldquo;{currentWord?.word}&rdquo;</p>
          <button
            onClick={handleWordComplete}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
          >
            Skip this word →
          </button>
        </div>
      ) : (
        <WordPracticeCard
          wordData={currentWordSet}
          wordIndex={currentWordIndex}
          totalWords={words.length}
          onComplete={handleWordComplete}
        />
      )}
    </div>
  );
}
