'use client';

import { useState, useEffect } from 'react';

interface StudentOption {
  id: number;
  displayName: string | null;
  email: string;
  username?: string | null;
}

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export default function StudentSelector({ selectedIds, onChange }: Props) {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/teacher/users')
      .then((r) => r.json())
      .then((d) => {
        const all = (d.users ?? []) as Array<{ id: number; displayName: string | null; email: string; username?: string | null; role: string; status?: string }>;
        setStudents(all.filter((u) => u.role === 'student' && u.status !== 'rejected'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: number) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function selectAll() {
    onChange(students.map((s) => s.id));
  }

  function selectNone() {
    onChange([]);
  }

  if (loading) {
    return <div className="animate-pulse h-8 bg-stone-100 rounded-lg" />;
  }

  if (students.length === 0) {
    return <p className="text-xs text-stone-400">No students yet. Add students under the Students tab, or share your Teacher ID so they can join.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Target Students</p>
        <div className="flex gap-2 text-xs">
          <button onClick={selectAll} className="text-indigo-600 hover:text-indigo-800 font-semibold">All</button>
          <span className="text-stone-300">|</span>
          <button onClick={selectNone} className="text-stone-400 hover:text-stone-600 font-semibold">None</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {students.map((s) => {
          const selected = selectedIds.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                selected
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-stone-200 text-stone-600 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              {s.displayName ?? s.username ?? s.email}
            </button>
          );
        })}
      </div>
      {selectedIds.length === 0 && (
        <p className="text-xs text-amber-600">Please select at least one student.</p>
      )}
    </div>
  );
}
