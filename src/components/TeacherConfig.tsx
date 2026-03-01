'use client';

import { useState, useEffect } from 'react';

interface Config {
  numComprehension: number;
  numBlanks: number;
  blankZipfMax: number;
}

export default function TeacherConfig() {
  const [config, setConfig] = useState<Config>({ numComprehension: 2, numBlanks: 5, blankZipfMax: 4.2 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/teacher/config')
      .then((r) => r.json())
      .then((d) => setConfig(d))
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
      setConfig(data);
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
