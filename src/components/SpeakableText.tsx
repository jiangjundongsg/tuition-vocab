'use client';

import { useState, useMemo, useRef } from 'react';
import { makeUtterance, cancelAndSpeak } from '@/lib/tts';

function tokenize(text: string) {
  const tokens: Array<{ text: string; isWord: boolean; start: number }> = [];
  const re = /\S+|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ text: m[0], isWord: /\S/.test(m[0]), start: m.index });
  }
  return tokens;
}

const SPEAKER_ICON = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.27 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.27l4.113-3.784a1 1 0 011 .076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
  </svg>
);

interface Props {
  text: string;
  rate?: number;
  className?: string;
}

export default function SpeakableText({
  text,
  rate = 0.9,
  className = 'text-sm font-medium text-slate-800 leading-relaxed',
}: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [highlightStart, setHighlightStart] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const tokens = useMemo(() => tokenize(text), [text]);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function handleSpeak() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      clearTimers();
      setSpeaking(false);
      setHighlightStart(-1);
      return;
    }

    const utt = makeUtterance(text, rate);

    // Timer-based highlighting — works on every play regardless of browser onboundary support.
    // Calibration: ~13.5 chars/sec at rate=1.0 (≈135 WPM × 6 chars/word ÷ 60).
    utt.onstart = () => {
      clearTimers();
      const msPerChar = 1000 / (rate * 13.5);
      timers.current = tokens
        .filter((t) => t.isWord)
        .map((tok) => setTimeout(() => setHighlightStart(tok.start), tok.start * msPerChar));
    };

    // onboundary gives more accurate timing when the browser supports it.
    utt.onboundary = (e) => {
      if (e.name === 'word') setHighlightStart(e.charIndex);
    };

    const done = () => { clearTimers(); setSpeaking(false); setHighlightStart(-1); };
    utt.onend = done;
    utt.onerror = done;

    setSpeaking(true);
    setHighlightStart(-1);
    cancelAndSpeak(utt);
  }

  return (
    <div className="flex items-start gap-2">
      <span className={`flex-1 ${className}`}>
        {tokens.map((tok, i) =>
          tok.isWord ? (
            <mark
              key={i}
              style={{
                background: highlightStart === tok.start ? '#fef08a' : 'transparent',
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
      </span>

      <button
        onClick={handleSpeak}
        title={speaking ? 'Stop reading' : 'Read aloud'}
        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
      >
        {SPEAKER_ICON}
        {speaking ? 'Stop' : 'Read aloud'}
      </button>
    </div>
  );
}
