'use client';

import { useState, useCallback, useEffect } from 'react';
import WordPracticeCard, { WordSetData } from './WordPracticeCard';
import DictationItem from './DictationItem';

interface WordInfo {
  id: number;
  word: string;
}

interface Props {
  words: WordInfo[];
  onDone?: () => void;
}

type Phase = 'words' | 'dictation' | 'done';

export default function PracticeSession({ words, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('words');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordSets, setWordSets] = useState<Record<number, WordSetData | 'loading' | 'error'>>({});
  const [dictationSubmitted, setDictationSubmitted] = useState<Record<string, boolean>>({});
  const [dictationCorrect, setDictationCorrect] = useState<Record<string, boolean>>({});
  const [dictationAnswers, setDictationAnswers] = useState<Record<string, string>>({});

  const currentWord = words[currentWordIndex];

  // Load word set for current word
  useEffect(() => {
    if (!currentWord) return;
    const id = currentWord.id;
    if (wordSets[id]) return; // already loaded or loading

    setWordSets((prev) => ({ ...prev, [id]: 'loading' }));

    fetch(`/api/practice/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setWordSets((prev) => ({
          ...prev,
          [id]: {
            wordSetId: data.wordSetId,
            word: currentWord.word,
            paragraph: data.paragraph,
            questions: data.questions,
            fillBlank: data.fillBlank,
          } as WordSetData,
        }));
      })
      .catch(() => {
        setWordSets((prev) => ({ ...prev, [id]: 'error' }));
      });
  }, [currentWord, wordSets]);

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
      setDictationAnswers((a) => ({ ...a, [questionKey]: typed }));
      setDictationCorrect((c) => ({ ...c, [questionKey]: isCorrect }));

      // Find the word_set_id for this word (dictation key = "dictation_N")
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

  if (phase === 'done') {
    const totalDictation = words.length;
    const correctDictation = Object.values(dictationCorrect).filter(Boolean).length;
    return (
      <div className="space-y-6">
        <div className="bg-blue-700 rounded-xl p-8 text-center text-white">
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-blue-100 text-sm mb-4">
            Dictation: {correctDictation} / {totalDictation} correct
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <a
              href="/wrong-bank"
              className="bg-white text-blue-700 font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition-colors"
            >
              Review Tricky Words
            </a>
            {onDone && (
              <button
                onClick={onDone}
                className="border border-white/50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                Practice Another Lesson
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'dictation') {
    return (
      <div className="space-y-5">
        {/* Section header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Dictation</h2>
          <p className="text-sm text-slate-500">
            Click to hear each word, then type what you hear. Press Enter or &ldquo;Check&rdquo; to submit.
          </p>
        </div>

        <div className="space-y-3">
          {words.map((w, i) => (
            <DictationItem
              key={w.id}
              wordIndex={i}
              word={w.word}
              questionKey={`dictation_${i}`}
              submitted={!!dictationSubmitted[`dictation_${i}`]}
              isCorrect={!!dictationCorrect[`dictation_${i}`]}
              onAnswer={recordDictation}
            />
          ))}
        </div>

        {allDictationDone && (
          <button
            onClick={() => setPhase('done')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Finish Session →
          </button>
        )}
      </div>
    );
  }

  // Phase: words
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
            style={{ width: `${((currentWordIndex) / words.length) * 100}%` }}
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
          <p className="text-xs">This word may not appear in the Harry Potter text. Try skipping to the next word.</p>
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
