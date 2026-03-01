'use client';

import { useState, useEffect } from 'react';

interface Config {
  numComprehension: number;
  numBlanks: number;
  blankZipfMax: number;
  passageWordCount: number;
  compQuestionType: string;
}

const COMP_TYPE_OPTIONS = [
  { value: 'mcq',        label: 'MCQ (4 options)',        desc: 'All comprehension questions are multiple-choice with 4 options' },
  { value: 'true_false', label: 'True / False',           desc: 'All comprehension questions are true/false statements' },
  { value: 'mixed',      label: 'Mixed (MCQ + True/False)', desc: 'Alternates between MCQ and true/false questions' },
];

export default function TeacherConfig() {
  const [config, setConfig] = useState<Config>({
    numComprehension: 2,
    numBlanks: 5,
    blankZipfMax: 4.2,
    passageWordCount: 150,
    compQuestionType: 'mcq',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/teacher/config')
      .then((r) => r.json())
      .then((d) => setConfig({
        numComprehension: d.numComprehension ?? 2,
        numBlanks: d.numBlanks ?? 5,
        blankZipfMax: d.blankZipfMax ?? 4.2,
        passageWordCount: d.passageWordCount ?? 150,
        compQuestionType: d.compQuestionType ?? 'mcq',
      }))
      .catch(() => setError('Could not load config.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/teacher/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig({
        numComprehension: data.numComprehension ?? config.numComprehension,
        numBlanks: data.numBlanks ?? config.numBlanks,
        blankZipfMax: data.blankZipfMax ?? config.blankZipfMax,
        passageWordCount: data.passageWordCount ?? config.passageWordCount,
        compQuestionType: data.compQuestionType ?? config.compQuestionType,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-40 bg-slate-100 rounded-xl" />;
  }

  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2";
  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Question Settings</p>
        <p className="text-xs text-slate-400">Changes take effect immediately for new practice sessions. Existing cached word sets are cleared when you save.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
      {saved && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">Settings saved — word sets cache cleared.</div>}

      {/* Row 1: question counts */}
      <div className="grid sm:grid-cols-3 gap-5">
        <div>
          <label className={labelClass}>Comprehension questions</label>
          <input
            type="number"
            min={1}
            max={4}
            value={config.numComprehension}
            onChange={(e) => setConfig((c) => ({ ...c, numComprehension: parseInt(e.target.value) || 2 }))}
            className={inputClass}
          />
          <p className="text-xs text-slate-400 mt-1">1–4 (default 2)</p>
        </div>

        <div>
          <label className={labelClass}>Fill-blank word count</label>
          <input
            type="number"
            min={1}
            max={10}
            value={config.numBlanks}
            onChange={(e) => setConfig((c) => ({ ...c, numBlanks: parseInt(e.target.value) || 5 }))}
            className={inputClass}
          />
          <p className="text-xs text-slate-400 mt-1">1–10 blanks (default 5)</p>
        </div>

        <div>
          <label className={labelClass}>Blank word Zipf max</label>
          <input
            type="number"
            min={2.0}
            max={7.0}
            step={0.1}
            value={config.blankZipfMax}
            onChange={(e) => setConfig((c) => ({ ...c, blankZipfMax: parseFloat(e.target.value) || 4.2 }))}
            className={inputClass}
          />
          <p className="text-xs text-slate-400 mt-1">Words with Zipf &lt; this are blanked (default 4.2)</p>
        </div>
      </div>

      {/* Row 2: passage settings */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Passage Settings</p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Passage word count (AI-generated)</label>
            <input
              type="number"
              min={50}
              max={400}
              step={10}
              value={config.passageWordCount}
              onChange={(e) => setConfig((c) => ({ ...c, passageWordCount: parseInt(e.target.value) || 150 }))}
              className={inputClass}
            />
            <p className="text-xs text-slate-400 mt-1">50–400 words (default 150). Applies when word is not found in textbook.</p>
          </div>

          <div>
            <label className={labelClass}>Comprehension question type</label>
            <select
              value={config.compQuestionType}
              onChange={(e) => setConfig((c) => ({ ...c, compQuestionType: e.target.value }))}
              className={inputClass}
            >
              {COMP_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {COMP_TYPE_OPTIONS.find((o) => o.value === config.compQuestionType)?.desc}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-sm"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
