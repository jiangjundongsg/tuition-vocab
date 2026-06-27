'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Role = 'student' | 'teacher';

interface StudentRow {
  username: string;
  displayName: string;
  password: string;
  age: string;
}

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-slate-50/50 placeholder:text-slate-300';
const labelClass =
  'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('student');

  // Shared
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');

  // Username — the account being created (both roles)
  const [username, setUsername] = useState('');

  // Student
  const [teacherUsername, setTeacherUsername] = useState('');

  // Teacher
  const [email, setEmail] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function addStudentRow() {
    setStudents((s) => [...s, { username: '', displayName: '', password: '', age: '' }]);
  }
  function updateStudentRow(i: number, field: keyof StudentRow, value: string) {
    setStudents((s) => s.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }
  function removeStudentRow(i: number) {
    setStudents((s) => s.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    if (!username.trim()) { setError('Please choose a username'); return; }
    if (role === 'student' && !teacherUsername.trim()) { setError("Please enter your teacher's username"); return; }
    if (role === 'teacher' && !email.trim()) { setError('Email is required for a teacher account'); return; }

    // Validate any filled-in student rows (teacher mode)
    const cleanStudents = students
      .filter((s) => s.username.trim() || s.password.trim())
      .map((s) => ({
        username: s.username.trim(),
        displayName: s.displayName.trim() || undefined,
        password: s.password,
        age: s.age ? parseInt(s.age) : undefined,
      }));
    for (const s of cleanStudents) {
      if (!s.username || s.password.length < 6) {
        setError('Each student needs a username and a password of at least 6 characters');
        return;
      }
    }

    setLoading(true);
    try {
      const payload =
        role === 'teacher'
          ? {
              role: 'teacher',
              username: username.trim(),
              email: email.trim(),
              password,
              displayName: displayName.trim() || undefined,
              students: cleanStudents,
            }
          : {
              role: 'student',
              username: username.trim(),
              password,
              displayName: displayName.trim() || undefined,
              age: age ? parseInt(age) : undefined,
              teacherUsername: teacherUsername.trim(),
            };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }

      const dest = data.user?.role === 'teacher' || data.user?.role === 'admin' ? '/words' : '/';
      router.push(dest);
      router.refresh();
    } catch {
      setError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-start justify-center py-10 pb-16">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/60 p-8">

          {/* Logo + heading */}
          <div className="mb-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-200">
              <span className="text-white text-xl leading-none select-none">★</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
            <p className="text-slate-400 mt-1 text-sm">Join Vocab Star and start learning</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-5">
            {(['student', 'teacher'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(''); }}
                className={`py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                  role === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {r === 'student' ? "I'm a student" : "I'm a teacher"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className={labelClass}>
                Name <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                required placeholder="Pick a username to log in" className={inputClass} autoCapitalize="none" />
              {role === 'teacher' && (
                <p className="text-xs text-slate-400 mt-1.5">Students use this username to join your class.</p>
              )}
            </div>

            {role === 'student' ? (
              <>
                <div>
                  <label className={labelClass}>Age <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                    min={5} max={18} placeholder="e.g. 10" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Teacher Username</label>
                  <input type="text" value={teacherUsername} onChange={(e) => setTeacherUsername(e.target.value)}
                    required placeholder="e.g. jundong" autoCapitalize="none" className={inputClass} />
                  <p className="text-xs text-slate-400 mt-1.5">Ask your teacher for their username. They&apos;ll approve your account.</p>
                </div>
              </>
            ) : (
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required placeholder="your@email.com" className={inputClass} />
                <p className="text-xs text-slate-400 mt-1.5">Used only for password recovery.</p>
              </div>
            )}

            <div>
              <label className={labelClass}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required placeholder="At least 6 characters" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Confirm password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                required placeholder="Type your password again" className={inputClass} />
            </div>

            {role === 'teacher' && (
              <>
                {/* Add students inline */}
                <div className="border-t border-slate-100 pt-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <label className={`${labelClass} mb-0`}>Add your students <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                  </div>
                  <div className="space-y-3">
                    {students.map((s, i) => (
                      <div key={i} className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 space-y-2 relative">
                        <button type="button" onClick={() => removeStudentRow(i)}
                          className="absolute top-2 right-2 text-slate-300 hover:text-red-500 text-xs" aria-label="Remove student">✕</button>
                        <input type="text" value={s.username} onChange={(e) => updateStudentRow(i, 'username', e.target.value)}
                          placeholder="Username" className={inputClass} autoCapitalize="none" />
                        <div className="flex gap-2">
                          <input type="text" value={s.displayName} onChange={(e) => updateStudentRow(i, 'displayName', e.target.value)}
                            placeholder="Name (optional)" className={inputClass} />
                          <input type="number" value={s.age} onChange={(e) => updateStudentRow(i, 'age', e.target.value)}
                            placeholder="Age" min={5} max={18} className={`${inputClass} w-24`} />
                        </div>
                        <input type="text" value={s.password} onChange={(e) => updateStudentRow(i, 'password', e.target.value)}
                          placeholder="Password (min 6 chars)" className={inputClass} />
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addStudentRow}
                    className="mt-2.5 w-full border border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 rounded-xl py-2 text-sm font-semibold transition-colors">
                    + Add a student
                  </button>
                  <p className="text-xs text-slate-400 mt-1.5">You can also add students later from Teacher Tools.</p>
                </div>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-200 mt-1">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
