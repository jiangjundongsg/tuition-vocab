'use client';

import { useState, useEffect } from 'react';

interface UserRow {
  id: number;
  email: string;
  displayName: string | null;
  role: string;
  age: number | null;
  passageSource: string;
}

interface EditState {
  displayName: string;
  age: string;
  passageSource: string;
  password: string;
}

const ROLE_COLORS: Record<string, string> = {
  teacher: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  admin:   'bg-red-50 text-red-700 ring-1 ring-red-200',
  student: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
};

export default function TeacherUserManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ displayName: '', age: '', passageSource: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/teacher/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setError('Could not load users.'))
      .finally(() => setLoading(false));
  }, []);

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditState({
      displayName: u.displayName ?? '',
      age: u.age != null ? String(u.age) : '',
      passageSource: u.passageSource,
      password: '',
    });
    setError('');
  }

  async function saveEdit(id: number) {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        displayName: editState.displayName,
        age: editState.age ? parseInt(editState.age) : null,
        passageSource: editState.passageSource || 'TextBook_Harry_Portter',
      };
      if (editState.password) body.password = editState.password;

      const res = await fetch(`/api/teacher/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setUsers((prev) => prev.map((u) => u.id === id ? {
        ...u,
        displayName: data.user.displayName,
        age: data.user.age,
        passageSource: data.user.passageSource,
      } : u));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white w-full";

  if (loading) {
    return <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Passage Source</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                {editingId === u.id ? (
                  <>
                    <td className="px-4 py-2.5">
                      <input
                        value={editState.displayName}
                        onChange={(e) => setEditState((s) => ({ ...s, displayName: e.target.value }))}
                        placeholder="Display name"
                        className={inputClass}
                      />
                      <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role] ?? ROLE_COLORS.student}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={5}
                        max={18}
                        value={editState.age}
                        onChange={(e) => setEditState((s) => ({ ...s, age: e.target.value }))}
                        placeholder="Age"
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        value={editState.passageSource}
                        onChange={(e) => setEditState((s) => ({ ...s, passageSource: e.target.value }))}
                        placeholder="TextBook_Harry_Portter"
                        className={inputClass}
                      />
                      <input
                        type="password"
                        value={editState.password}
                        onChange={(e) => setEditState((s) => ({ ...s, password: e.target.value }))}
                        placeholder="New password (leave blank to keep)"
                        className={`${inputClass} mt-1`}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => saveEdit(u.id)}
                        disabled={saving}
                        className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                      >
                        {saving ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-700 px-2 py-1.5 transition-colors"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800 text-sm">{u.displayName ?? '—'}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role] ?? ROLE_COLORS.student}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-500">{u.age ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{u.passageSource}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => startEdit(u)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
