'use client';

import { useState, useMemo, useRef } from 'react';
import SpeakableText from './SpeakableText';
import { makeUtterance, cancelAndSpeak, computeHighlightSchedule } from '@/lib/tts';

interface QuestionForMCQ {
  type: 'mcq' | 'true_false';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

interface Props {
  questionKey: string;
  data: QuestionForMCQ;
  submitted: boolean;
  selectedAnswer: string;
  onAnswer: (questionKey: string, answer: string, isCorrect: boolean) => void;
}

const SPEAKER_ICON = (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.27 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.27l4.113-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
  </svg>
);

function tokenize(text: string) {
  const tokens: Array<{ text: string; isWord: boolean; start: number }> = [];
  const re = /\S+|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ text: m[0], isWord: /\S/.test(m[0]), start: m.index });
  }
  return tokens;
}

export default function SessionMCQ({ questionKey, data, submitted, selectedAnswer, onAnswer }: Props) {
  const [speakingOption, setSpeakingOption] = useState<string | null>(null);
  const [highlightStart, setHighlightStart] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const isTF = data.type === 'true_false';
  const options = isTF ? ['True', 'False'] : (data.options ?? []);

  const tokenizedOptions = useMemo(
    () => options.map((opt) => ({ opt, tokens: tokenize(opt) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.options, isTF],
  );

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function speakOption(e: React.MouseEvent | React.KeyboardEvent, option: string) {
    e.stopPropagation();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingOption === option) {
      window.speechSynthesis.cancel();
      clearTimers();
      setSpeakingOption(null);
      setHighlightStart(-1);
      return;
    }

    const optTokens = tokenizedOptions.find((t) => t.opt === option)?.tokens ?? [];
    const utt = makeUtterance(option, 0.9);
    const schedule = computeHighlightSchedule(optTokens, 0.9);

    utt.onstart = () => {
      clearTimers();
      timers.current = schedule.map(({ charStart, delay }) =>
        setTimeout(() => setHighlightStart(charStart), delay),
      );
    };

    utt.onboundary = (ev) => {
      if (ev.name === 'word') setHighlightStart(ev.charIndex);
    };

    const done = () => { clearTimers(); setSpeakingOption(null); setHighlightStart(-1); };
    utt.onend = done;
    utt.onerror = done;
    setSpeakingOption(option);
    setHighlightStart(-1);
    cancelAndSpeak(utt);
  }

  return (
    <div className="space-y-3">
      <SpeakableText text={data.question} />

      <div className={`grid gap-2 ${isTF ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {tokenizedOptions.map(({ opt: option, tokens }, i) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === data.answer;
          const isSpeaking = speakingOption === option;

          let cls = 'flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ';
          if (!submitted) {
            cls += 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800 text-slate-700';
          } else if (isCorrect) {
            cls += 'border-emerald-400 bg-emerald-50 text-emerald-800';
          } else if (isSelected) {
            cls += 'border-red-400 bg-red-50 text-red-800';
          } else {
            cls += 'border-slate-100 bg-slate-50 text-slate-400';
          }

          const label = isTF ? option[0] : String.fromCharCode(65 + i);

          return (
            <button
              key={option}
              className={cls}
              disabled={submitted}
              onClick={() => onAnswer(questionKey, option, option === data.answer)}
            >
              <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold
                ${!submitted ? 'bg-slate-100 text-slate-500' :
                  isCorrect ? 'bg-emerald-200 text-emerald-800' :
                  isSelected ? 'bg-red-200 text-red-800' :
                  'bg-slate-100 text-slate-400'}`}>
                {label}
              </span>

              <span className="flex-1 text-left">
                {isSpeaking
                  ? tokens.map((tok, j) =>
                      tok.isWord ? (
                        <mark
                          key={j}
                          style={{
                            background: highlightStart === tok.start ? '#fef08a' : 'transparent',
                            borderRadius: '3px',
                            padding: '0 1px',
                          }}
                        >
                          {tok.text}
                        </mark>
                      ) : (
                        <span key={j}>{tok.text}</span>
                      )
                    )
                  : option}
              </span>

              <span
                role="button"
                tabIndex={0}
                title={isSpeaking ? 'Stop reading' : 'Read aloud'}
                onClick={(e) => speakOption(e, option)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && speakOption(e, option)}
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                {SPEAKER_ICON}
                {isSpeaking ? 'Stop' : 'Read aloud'}
              </span>

              {submitted && isCorrect && <span className="text-emerald-600">✓</span>}
              {submitted && isSelected && !isCorrect && <span className="text-red-500">✗</span>}
            </button>
          );
        })}
      </div>

      {submitted && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
          {data.explanation}
        </p>
      )}
    </div>
  );
}
