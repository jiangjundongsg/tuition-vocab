'use client';

import { useState } from 'react';
import { friendlyLessonLabel, lessonStatus, LessonProgress, LessonStatus } from '@/lib/lessonPalette';

export interface LessonRow {
  lessonNumber: string;
  uploadedAt: string | null;
  lastAttendedAt: string | null;
  progress: LessonProgress;
}

interface Props {
  rows: LessonRow[];
  onSelect: (lessonNumber: string) => void;
  selectedLesson?: string | null;
  /** Highlights the row the student most recently practised. */
  lastLesson?: string | null;
  disabled?: boolean;
  /** Show the search box (default true). */
  searchable?: boolean;
  /** Optional trailing column header (e.g. "Tricky"). */
  extraHeader?: string;
  /** Renders the trailing column cell for a row. */
  renderExtra?: (row: LessonRow) => React.ReactNode;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type SortKey = 'lesson' | 'uploaded' | 'status' | 'extra';

export default function LessonTable({
  rows,
  onSelect,
  selectedLesson,
  lastLesson,
  disabled = false,
  searchable = true,
  extraHeader,
  renderExtra,
}: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('uploaded');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = rows.filter(
    (r) =>
      !search ||
      friendlyLessonLabel(r.lessonNumber).toLowerCase().includes(search.toLowerCase()) ||
      r.lessonNumber.toLowerCase().includes(search.toLowerCase()),
  );

  // Sort filtered rows
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'lesson':
        cmp = a.lessonNumber.localeCompare(b.lessonNumber);
        break;
      case 'uploaded':
        cmp = (a.uploadedAt ?? '').localeCompare(b.uploadedAt ?? '');
        break;
      case 'status': {
        const sa = lessonStatus(a.progress);
        const sb = lessonStatus(b.progress);
        // done > in_progress > not_started
        const order: Record<LessonStatus, number> = { done: 2, in_progress: 1, not_started: 0 };
        cmp = (order[sa] ?? 0) - (order[sb] ?? 0);
        break;
      }
      case 'extra': {
        const ea = renderExtra?.(a);
        const eb = renderExtra?.(b);
        cmp = String(ea ?? '').localeCompare(String(eb ?? ''));
        break;
      }
    }
    return sortAsc ? cmp : -cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortTh({ colKey, label, align }: { colKey: SortKey; label: string; align?: string }) {
    const active = sortKey === colKey;
    return (
      <th
        className={`py-2.5 px-4 cursor-pointer select-none hover:text-slate-600 transition-colors ${align ?? 'text-left'}`}
        onClick={() => handleSort(colKey)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <span className="text-[9px] leading-none">
            {active ? (sortAsc ? '▲' : '▼') : <span className="opacity-30">▼</span>}
          </span>
        </span>
      </th>
    );
  }

  const colCount = extraHeader ? 4 : 3;

  return (
    <div className="space-y-3">
      {searchable && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lessons…"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-slate-50/50 placeholder:text-slate-300"
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/70">
              <SortTh colKey="lesson" label="Lesson" />
              <SortTh colKey="uploaded" label="Uploaded" />
              <SortTh colKey="status" label="Status" />
              {extraHeader && <SortTh colKey="extra" label={extraHeader} align="text-right" />}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-6 px-4 text-center text-sm text-slate-400">
                  No lessons match your search.
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const isSelected = selectedLesson === row.lessonNumber;
                const isLast = !isSelected && lastLesson === row.lessonNumber;
                return (
                  <tr
                    key={row.lessonNumber}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onClick={() => !disabled && onSelect(row.lessonNumber)}
                    onKeyDown={(e) => {
                      if (disabled) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(row.lessonNumber);
                      }
                    }}
                    className={`border-t border-slate-100 transition-colors ${
                      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isSelected
                        ? 'bg-indigo-50'
                        : isLast
                        ? 'bg-indigo-50/40 hover:bg-indigo-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>{friendlyLessonLabel(row.lessonNumber)}</span>
                        {isLast && (
                          <span className="inline-flex items-center gap-0.5 bg-amber-400 text-white text-[9px] font-bold pl-1 pr-1.5 py-0.5 rounded-full leading-none">
                            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Last
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(row.uploadedAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 justify-center">
                        {['practice', 'dictation', 'tricky', 'mistake_pick'].map((step) => {
                          const done = row.progress[step as keyof LessonProgress];
                          const label = { practice: 'P', dictation: 'D', tricky: 'T', mistake_pick: 'M' }[step];
                          return (
                            <span
                              key={step}
                              title={`${step}: ${done ? 'done' : 'pending'}`}
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                                done
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    {extraHeader && (
                      <td className="py-3 px-4 text-right text-slate-600 font-semibold">{renderExtra?.(row)}</td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
