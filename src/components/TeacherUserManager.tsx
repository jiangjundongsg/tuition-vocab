'use client';

import { useState, useEffect, Fragment } from 'react';

interface UserRow {
  id: number;
  email: string | null;
  username: string | null;
  status: string;
  teacherId: number | null;
  displayName: string | null;
  role: string;
  age: number | null;
  lastLesson: string | null;
  passageSource: string;
  numComprehension: number;
  numBlanks: number;
  blankZipfMax: number;
  passageWordCount: number;
  compQuestionType: string;
  enableMcqMeaning: boolean;
  enableMcqSynonym: boolean;
  enableMcqAntonym: boolean;
  enableComprehension: boolean;
  enableFillBlank: boolean;
  enableSentenceWriting: boolean;
}

interface EditState {
  displayName: string;
  age: string;
  passageSource: string;
  password: string;
  numComprehension: string;
  numBlanks: string;
  blankZipfMax: string;
  passageWordCount: string;
  compQuestionType: string;
  enableMcqMeaning: boolean;
  enableMcqSynonym: boolean;
  enableMcqAntonym: boolean;
  enableComprehension: boolean;
  enableFillBlank: boolean;
  enableSentenceWriting: boolean;
}

interface LessonProgressItem {
  lesson: string;
  practice: boolean;
  dictation: boolean;
  tricky: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  teacher: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  admin:   'bg-red-50 text-red-700 ring-1 ring-red-200',
  student: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
};

const COMP_TYPE_OPTIONS = [
  { value: 'mcq',        label: 'MCQ (4 options)' },
  { value: 'true_false', label: 'True / False' },
  { value: 'mixed',      label: 'Mixed' },
];

const QUESTION_KEYS = [
  { key: 'enableMcqMeaning',     label: 'Meaning MCQ' },
  { key: 'enableMcqSynonym',     label: 'Synonym MCQ' },
  { key: 'enableMcqAntonym',     label: 'Antonym MCQ' },
  { key: 'enableComprehension',  label: 'Comprehension' },
  { key: 'enableFillBlank',      label: 'Fill Blank' },
  { key: 'enableSentenceWriting',label: 'Sentence Writing' },
] as const;

const Q_CONFIG_LABELS: Record<string, string> = {
  numComprehension: 'Comp. Qs',
  numBlanks: 'Fill blanks',
  blankZipfMax: 'Zipf max',
  passageWordCount: 'Words',
  compQuestionType: 'Q type',
  enableMcqMeaning: 'Meaning',
  enableMcqSynonym: 'Synonym',
  enableMcqAntonym: 'Antonym',
  enableComprehension: 'Comprehension',
  enableFillBlank: 'Fill blank',
  enableSentenceWriting: 'Sentence writing',
};

export default function TeacherUserManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState<UserRow | null>(null);
  const [editState, setEditState] = useState<EditState>({
    displayName: '', age: '', passageSource: '', password: '',
    numComprehension: '2', numBlanks: '5', blankZipfMax: '4.2',
    passageWordCount: '150', compQuestionType: 'mcq',
    enableMcqMeaning: true, enableMcqSynonym: false, enableMcqAntonym: false,
    enableComprehension: true, enableFillBlank: true, enableSentenceWriting: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedConfig, setExpandedConfig] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [studentProgress, setStudentProgress] = useState<LessonProgressItem[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  // Current teacher (for the shareable Teacher ID) + approval/add-student state
  const [meId, setMeId] = useState<number | null>(null);
  const [meRole, setMeRole] = useState<string>('teacher');
  const [meUsername, setMeUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({ username: '', displayName: '', password: '', age: '' });
  const [addingStudent, setAddingStudent] = useState(false);

  function reloadUsers() {
    return fetch('/api/teacher/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setError('Could not load users.'));
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) { setMeId(d.user.id); setMeRole(d.user.role); setMeUsername(d.user.username); } })
      .catch(() => {});
    reloadUsers().finally(() => setLoading(false));
  }, []);

  async function setStatus(id: number, status: 'approved' | 'rejected') {
    setApprovingId(id);
    setError('');
    try {
      const res = await fetch(`/api/teacher/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setApprovingId(null);
    }
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!newStudent.username.trim() || newStudent.password.length < 6) {
      setError('A username and a password of at least 6 characters are required');
      return;
    }
    setAddingStudent(true);
    setError('');
    try {
      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: [{
            username: newStudent.username.trim(),
            displayName: newStudent.displayName.trim() || undefined,
            password: newStudent.password,
            age: newStudent.age ? parseInt(newStudent.age) : undefined,
          }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add student');
      if (data.created === 0) throw new Error('That username is already taken');
      setNewStudent({ username: '', displayName: '', password: '', age: '' });
      setShowAddForm(false);
      await reloadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add student');
    } finally {
      setAddingStudent(false);
    }
  }

  /* Esc to close modal */
  useEffect(() => {
    if (!modalUser) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalUser(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalUser]);

  function openModal(u: UserRow) {
    setModalUser(u);
    setExpandedConfig(null);
    setEditState({
      displayName:       u.displayName ?? '',
      age:               u.age != null ? String(u.age) : '',
      passageSource:     u.passageSource,
      password:          '',
      numComprehension:  String(u.numComprehension),
      numBlanks:         String(u.numBlanks),
      blankZipfMax:      String(u.blankZipfMax),
      passageWordCount:  String(u.passageWordCount),
      compQuestionType:  u.compQuestionType,
      enableMcqMeaning:  u.enableMcqMeaning,
      enableMcqSynonym:  u.enableMcqSynonym,
      enableMcqAntonym:  u.enableMcqAntonym,
      enableComprehension: u.enableComprehension,
      enableFillBlank:   u.enableFillBlank,
      enableSentenceWriting: u.enableSentenceWriting,
    });
    setError('');
  }

  function closeModal() {
    setModalUser(null);
  }

  async function saveEdit(id: number) {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        displayName:       editState.displayName,
        age:               editState.age ? parseInt(editState.age) : null,
        passageSource:     editState.passageSource || 'TextBook_Harry_Portter',
        numComprehension:  parseInt(editState.numComprehension) || 2,
        numBlanks:         parseInt(editState.numBlanks) || 5,
        blankZipfMax:      parseFloat(editState.blankZipfMax) || 4.2,
        passageWordCount:  parseInt(editState.passageWordCount) || 150,
        compQuestionType:  editState.compQuestionType,
        enableMcqMeaning:  editState.enableMcqMeaning,
        enableMcqSynonym:  editState.enableMcqSynonym,
        enableMcqAntonym:  editState.enableMcqAntonym,
        enableComprehension: editState.enableComprehension,
        enableFillBlank:   editState.enableFillBlank,
        enableSentenceWriting: editState.enableSentenceWriting,
      };
      if (editState.password) body.password = editState.password;

      const res = await fetch(`/api/teacher/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...data.user } : u));
      setModalUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user and all their data? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/teacher/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleExpand(userId: number) {
    if (expandedConfig === userId) {
      setExpandedConfig(null);
      setStudentProgress([]);
      return;
    }
    setExpandedConfig(userId);
    setProgressLoading(true);
    setStudentProgress([]);
    try {
      const res = await fetch(`/api/teacher/users/${userId}/progress`);
      const data = await res.json();
      setStudentProgress(data.progress ?? []);
    } catch {
      setStudentProgress([]);
    } finally {
      setProgressLoading(false);
    }
  }

  function progressDone(item: LessonProgressItem) {
    return [item.practice, item.dictation, item.tricky].filter(Boolean).length;
  }

  function progressBadge(item: LessonProgressItem) {
    const done = progressDone(item);
    if (done === 3) return 'bg-slate-200 text-slate-400 line-through ring-1 ring-slate-200';
    if (done === 2) return 'bg-purple-50 text-purple-700 ring-1 ring-purple-300';
    if (done === 1) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-300';
    return 'bg-white text-slate-400 ring-1 ring-slate-200';
  }

  function formatQConfigValue(u: UserRow, key: string): string {
    if (key === 'compQuestionType') return u.compQuestionType;
    const boolKeys = ['enableMcqMeaning','enableMcqSynonym','enableMcqAntonym','enableComprehension','enableFillBlank','enableSentenceWriting'];
    if (boolKeys.includes(key)) return (u as any)[key] ? 'on' : 'off';
    return String((u as any)[key]);
  }


  const inputClass = "border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 bg-white w-full";

  if (loading) {
    return <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}</div>;
  }

  const Q_SUMMARY_KEYS = ['numComprehension','numBlanks','blankZipfMax','passageWordCount','compQuestionType'];

  const pending = users.filter((u) => u.role === 'student' && u.status === 'pending');
  const roster = users.filter((u) => !(u.role === 'student' && u.status === 'pending'));

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* Teacher username — share so students can join */}
      {meRole === 'teacher' && meId != null && (
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Your Teacher Username</p>
            <p className="text-3xl font-bold text-indigo-700 leading-none">{meUsername || `#${meId}`}</p>
            <p className="text-xs text-slate-500 mt-1.5">Share this username — students use it to join your class.</p>
          </div>
          <button
            onClick={() => { navigator.clipboard?.writeText(meUsername || String(meId)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="shrink-0 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-lg px-3 py-2 hover:bg-indigo-50 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Add student — prominent button */}
      {(meRole === 'teacher' || meRole === 'admin') && (
        <div>
          {showAddForm ? (
            <form onSubmit={addStudent} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Student</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={newStudent.username} onChange={(e) => setNewStudent((s) => ({ ...s, username: e.target.value }))}
                  placeholder="Username" autoCapitalize="none" className={inputClass} />
                <input value={newStudent.displayName} onChange={(e) => setNewStudent((s) => ({ ...s, displayName: e.target.value }))}
                  placeholder="Name (optional)" className={inputClass} />
                <input value={newStudent.password} onChange={(e) => setNewStudent((s) => ({ ...s, password: e.target.value }))}
                  placeholder="Password (min 6)" className={inputClass} />
                <input type="number" min={5} max={18} value={newStudent.age} onChange={(e) => setNewStudent((s) => ({ ...s, age: e.target.value }))}
                  placeholder="Age (optional)" className={inputClass} />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={addingStudent}
                  className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg transition-colors disabled:opacity-50">
                  {addingStudent ? 'Adding…' : 'Add student'}
                </button>
                <button type="button" onClick={() => { setShowAddForm(false); setError(''); }}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700 px-3 py-2 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 border-2 border-dashed border-indigo-200 hover:border-indigo-300 rounded-xl text-sm font-semibold text-indigo-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add a student
            </button>
          )}
        </div>
      )}

      {/* Pending join requests */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">
            Pending requests ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-xl border border-amber-100 px-4 py-2.5">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{u.displayName ?? u.username ?? '—'}</p>
                  <p className="text-xs text-slate-400">{u.username ? '@' + u.username : u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setStatus(u.id, 'approved')} disabled={approvingId === u.id}
                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    {approvingId === u.id ? '…' : 'Approve'}
                  </button>
                  <button onClick={() => setStatus(u.id, 'rejected')} disabled={approvingId === u.id}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1.5 transition-colors disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {roster.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
          <p className="text-sm text-slate-500">No students yet. Add one above, or share your Teacher ID so students can join.</p>
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Last Lesson</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {roster.map((u) => (
              <Fragment key={u.id}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      {u.displayName ?? u.username ?? '\u2014'}
                      {u.status === 'rejected' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 ring-1 ring-red-200">rejected</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">{u.username ? '@' + u.username : u.email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={'px-2 py-0.5 rounded-full text-xs font-semibold ' + (ROLE_COLORS[u.role] ?? ROLE_COLORS.student)}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-500">{u.age ?? '\u2014'}</td>
                  <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                    {u.lastLesson
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">{u.lastLesson}</span>
                      : <span className="text-xs text-slate-400">\u2014</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => toggleExpand(u.id)}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
                    >
                      {expandedConfig === u.id ? 'Hide' : 'View'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal(u)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 transition-colors">
                        Edit
                      </button>
                      {u.role === 'student' && (
                        <button
                          onClick={() => deleteUser(u.id)}
                          disabled={deletingId === u.id}
                          className="text-xs font-semibold text-red-400 hover:text-red-700 transition-colors disabled:opacity-50"
                        >
                          {deletingId === u.id ? '\u2026' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expanded row: Q config summary + Lesson progress */}
                {expandedConfig === u.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                          {Q_SUMMARY_KEYS.map((k) => (
                            <span key={k}>
                              <span className="font-semibold text-slate-400">{Q_CONFIG_LABELS[k]}:</span>{' '}
                              {formatQConfigValue(u, k)}
                            </span>
                          ))}
                          {QUESTION_KEYS.map(({ key, label }) => (
                            <span key={key}>
                              <span className="font-semibold text-slate-400">{Q_CONFIG_LABELS[key]}:</span>{' '}
                              {(u as any)[key] ? 'on' : 'off'}
                            </span>
                          ))}
                        </div>



                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Lesson Progress</p>



                          {progressLoading ? (
                            <span className="text-xs text-slate-400 italic">Loading...</span>
                          ) : studentProgress.length === 0 ? (
                            <span className="text-xs text-slate-400">No lesson data yet.</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {studentProgress.map((lp) => {
                                const done = progressDone(lp);
                                const cls = "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold " + progressBadge(lp);
                                return (
                                  <span key={lp.lesson} className={cls}>
                                    {lp.lesson}
                                    <span className="font-normal opacity-70">({done}/3)</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Edit modal overlay */}
      {modalUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">
                  Edit: {modalUser.displayName ?? modalUser.username ?? modalUser.email}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-slate-300 hover:text-slate-600 text-lg leading-none transition-colors"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              {/* Basic fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Display name</p>
                  <input value={editState.displayName}
                    onChange={(e) => setEditState((s) => ({ ...s, displayName: e.target.value }))}
                    placeholder="Display name" className={inputClass} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Age</p>
                  <input type="number" min={5} max={18} value={editState.age}
                    onChange={(e) => setEditState((s) => ({ ...s, age: e.target.value }))}
                    placeholder="Age" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-1">Passage source</p>
                  <input value={editState.passageSource}
                    onChange={(e) => setEditState((s) => ({ ...s, passageSource: e.target.value }))}
                    placeholder="TextBook_Harry_Portter" className={inputClass} />
                </div>
              </div>

              {/* Question type toggles */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Enabled Question Types</p>
                <div className="flex flex-wrap gap-3">
                  {QUESTION_KEYS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editState[key as keyof EditState] as boolean}
                        onChange={(e) => setEditState((s) => ({ ...s, [key]: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded accent-indigo-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Question config fields */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Question Settings</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Comp. questions</p>
                    <input type="number" min={0} max={10} value={editState.numComprehension}
                      onChange={(e) => setEditState((s) => ({ ...s, numComprehension: e.target.value }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Fill blanks</p>
                    <input type="number" min={1} max={10} value={editState.numBlanks}
                      onChange={(e) => setEditState((s) => ({ ...s, numBlanks: e.target.value }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Blank Zipf max</p>
                    <input type="number" min={2} max={7} step={0.1} value={editState.blankZipfMax}
                      onChange={(e) => setEditState((s) => ({ ...s, blankZipfMax: e.target.value }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Passage words</p>
                    <input type="number" min={50} max={400} step={10} value={editState.passageWordCount}
                      onChange={(e) => setEditState((s) => ({ ...s, passageWordCount: e.target.value }))}
                      className={inputClass} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Q type</p>
                    <select value={editState.compQuestionType}
                      onChange={(e) => setEditState((s) => ({ ...s, compQuestionType: e.target.value }))}
                      className={inputClass}>
                      {COMP_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">New password (leave blank to keep)</p>
                  <input type="password" value={editState.password}
                    onChange={(e) => setEditState((s) => ({ ...s, password: e.target.value }))}
                    placeholder="New password" className={inputClass} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => saveEdit(modalUser.id)} disabled={saving}
                  className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={closeModal}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 px-3 py-1.5 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
