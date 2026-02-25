import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 pt-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-3xl text-5xl mb-2">🔤</div>
        <h1 className="text-5xl font-black text-gray-800 leading-tight">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Vocab Star
          </span>
        </h1>
        <p className="text-lg text-gray-500 max-w-lg mx-auto leading-relaxed">
          Build your vocabulary every day — practise words, track progress, and become a superstar reader! ⭐
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/practice"
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-6 py-3 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm"
          >
            Start Practising →
          </Link>
          <Link
            href="/register"
            className="bg-white text-purple-600 font-bold px-6 py-3 rounded-xl border border-purple-200 shadow-sm hover:shadow-md hover:scale-105 transition-all text-sm"
          >
            Create Account
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {[
          {
            href: '/practice',
            emoji: '✏️',
            title: 'Practice',
            description: '5 words per session — meaning, synonym, antonym, comprehension, and dictation all in one go.',
            bg: 'bg-purple-500',
          },
          {
            href: '/wrong-bank',
            emoji: '🌟',
            title: 'My Tricky Words',
            description: 'Words you got wrong are saved here. Practise them again until you ace them all!',
            bg: 'bg-pink-500',
          },
          {
            href: '/upload',
            emoji: '📋',
            title: 'Word Management',
            description: 'Teachers: upload word lists by lesson, and edit or delete words anytime.',
            bg: 'bg-indigo-500',
          },
        ].map(({ href, emoji, title, description, bg }) => (
          <Link
            key={href}
            href={href}
            className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`inline-flex items-center justify-center w-12 h-12 ${bg} rounded-xl text-2xl mb-4`}>
              {emoji}
            </div>
            <h2 className="text-base font-bold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-5">How it works</h2>
        <ol className="space-y-4">
          {[
            { n: '1', text: 'Teacher uploads a word list with lesson numbers (e.g. "1 cat")', accent: 'bg-purple-500' },
            { n: '2', text: 'Words are automatically scored Easy, Medium, or Hard', accent: 'bg-blue-500' },
            { n: '3', text: 'Student picks a difficulty or lesson, then clicks Pick 5 Words', accent: 'bg-pink-500' },
            { n: '4', text: 'AI generates MCQ, comprehension, and dictation questions instantly', accent: 'bg-amber-500' },
            { n: '5', text: 'Wrong answers are saved to Tricky Words for focused re-practice', accent: 'bg-emerald-500' },
          ].map(({ n, text, accent }) => (
            <li key={n} className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full ${accent} text-white font-bold text-xs flex items-center justify-center mt-0.5`}>
                {n}
              </span>
              <span className="text-gray-600 text-sm leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
