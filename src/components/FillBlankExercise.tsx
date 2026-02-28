'use client';

import { useState } from 'react';
import { FillBlankQuestion } from '@/lib/fillblank';

interface Props {
  questionKey: string;
  data: FillBlankQuestion;
  submitted: boolean;
  onAnswer: (questionKey: string, answer: string, isCorrect: boolean) => void;
}

export default function FillBlankExercise({ questionKey, data, submitted, onAnswer }: Props) {
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState<Record<number, boolean>>({});

  function setInput(id: number, value: string) {
    setInputs((prev) => ({ ...prev, [id]: value }));
  }

  function check() {
    if (submitted || checked) return;
    const allFilled = data.blanks.every((b) => (inputs[b.id] ?? '').trim().length > 0);
    if (!allFilled) return;

    const results: Record<number, boolean> = {};
    let allCorrect = true;
    for (const blank of data.blanks) {
      const userAnswer = (inputs[blank.id] ?? '').trim().toLowerCase();
      const isCorrect = userAnswer === blank.original.toLowerCase();
      results[blank.id] = isCorrect;
      if (!isCorrect) allCorrect = false;
    }
    setCorrect(results);
    setChecked(true);
    onAnswer(questionKey, JSON.stringify(inputs), allCorrect);
  }

  const parts = data.displayText.split(/(\{\{\d+\}\})/g);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Fill in the Blanks
      </p>
      <p className="text-xs text-slate-400">
        The first letter of each missing word is shown. Fill in the complete word.
      </p>

      {/* Paragraph with inline blank inputs — first letter matches paragraph font/size exactly */}
      <div
        className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700"
        style={{ lineHeight: '2.6' }}
      >
        {parts.map((part, i) => {
          const match = part.match(/^\{\{(\d+)\}\}$/);
          if (match) {
            const id = parseInt(match[1]);
            const blank = data.blanks.find((b) => b.id === id);
            if (!blank) return null;

            const val = inputs[id] ?? '';
            const isChecked = checked;
            const isCorrect = correct[id];

            // Colour scheme: indigo when unchecked, green/red after checking
            const hintColor = !isChecked ? '#4F46E5' : isCorrect ? '#059669' : '#dc2626';
            const borderColor = !isChecked ? '#a5b4fc' : isCorrect ? '#6ee7b7' : '#fca5a5';
            const inputBg = isChecked ? (isCorrect ? '#ecfdf5' : '#fff1f2') : 'transparent';
            const inputColor = !isChecked ? '#1e1b4b' : isCorrect ? '#065f46' : '#991b1b';

            return (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'flex-end',
                  verticalAlign: 'bottom',
                  margin: '0 1px',
                }}
              >
                {/* First letter — exactly same font, size, and weight as surrounding paragraph text */}
                <span
                  style={{
                    fontSize: 'inherit',      // same size as paragraph text
                    fontFamily: 'inherit',    // same font as paragraph text
                    fontWeight: 'inherit',    // same weight as paragraph text
                    lineHeight: 'inherit',
                    color: hintColor,
                    userSelect: 'none',
                    paddingBottom: '2px',
                  }}
                >
                  {blank.original[0]}
                </span>

                {/* Underline input — bottom-aligned with text baseline */}
                <input
                  type="text"
                  value={val}
                  onChange={(e) => setInput(id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && check()}
                  disabled={isChecked || submitted}
                  placeholder="___"
                  style={{
                    border: 'none',
                    borderBottom: `2px solid ${borderColor}`,
                    background: inputBg,
                    width: `${Math.max((blank.original.length - 1) * 8 + 16, 32)}px`,
                    padding: '0 2px 1px',
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                    outline: 'none',
                    color: inputColor,
                    fontWeight: 600,
                  }}
                />

                {/* Show correct answer in brackets if wrong */}
                {isChecked && !isCorrect && (
                  <span
                    style={{
                      fontSize: '0.75em',
                      color: '#059669',
                      fontWeight: 700,
                      paddingBottom: '2px',
                      marginLeft: '2px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ({blank.original})
                  </span>
                )}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>

      {!checked && !submitted && (
        <button
          onClick={check}
          disabled={!data.blanks.every((b) => (inputs[b.id] ?? '').trim().length > 0)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors shadow-sm"
        >
          Check Answers
        </button>
      )}

      {checked && (
        <p className={`text-xs px-3 py-2 rounded-xl border ${
          Object.values(correct).every(Boolean)
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-amber-50 border-amber-100 text-amber-700'
        }`}>
          {Object.values(correct).every(Boolean)
            ? 'All blanks correct!'
            : `${Object.values(correct).filter(Boolean).length} of ${data.blanks.length} correct. Correct answers shown in brackets.`}
        </p>
      )}
    </div>
  );
}
