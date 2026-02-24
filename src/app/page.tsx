import Link from 'next/link';

const features = [
  {
    href: '/upload',
    emoji: '📚',
    title: 'Upload Word List',
    description: 'Teachers: add your vocabulary words here. The site will score their difficulty automatically!',
    gradient: 'from-purple-400 to-purple-600',
    hoverGradient: 'hover:from-purple-500 hover:to-purple-700',
  },
  {
    href: '/practice',
    emoji: '✏️',
    title: 'Practice Words',
    description: 'Students: answer multiple choice, fill-in-the-blank, and reading questions!',
    gradient: 'from-pink-400 to-pink-600',
    hoverGradient: 'hover:from-pink-500 hover:to-pink-700',
  },
  {
    href: '/wrong-bank',
    emoji: '🌟',
    title: 'My Tricky Words',
    description: 'Words you got wrong are saved here. Practice them again until you ace them all!',
    gradient: 'from-yellow-400 to-orange-500',
    hoverGradient: 'hover:from-yellow-500 hover:to-orange-600',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4 pt-4">
        <div className="text-7xl">🔤</div>
        <h1 className="text-5xl font-black text-gray-800 leading-tight">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Vocab Star!
          </span>
        </h1>
        <p className="text-xl text-gray-600 font-semibold max-w-xl mx-auto">
          Learn new words, practice every day, and become a vocabulary superstar! ⭐
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {features.map(({ href, emoji, title, description, gradient, hoverGradient }) => (
          <Link
            key={href}
            href={href}
            className={`block bg-gradient-to-br ${gradient} ${hoverGradient} text-white rounded-3xl p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200`}
          >
            <div className="text-5xl mb-3">{emoji}</div>
            <h2 className="text-xl font-black mb-2">{title}</h2>
            <p className="text-white/85 font-medium text-sm leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-purple-100">
        <h2 className="text-2xl font-black text-gray-800 mb-4">How it works 🎓</h2>
        <ol className="space-y-3">
          {[
            { n: '1', text: 'Teacher uploads a word list (one word per line)', color: 'bg-purple-500' },
            { n: '2', text: 'Each word is scored Easy, Medium, or Hard automatically', color: 'bg-pink-500' },
            { n: '3', text: 'Student picks a difficulty level and starts practising', color: 'bg-yellow-500' },
            { n: '4', text: 'Three question types are generated for each word using AI', color: 'bg-green-500' },
            { n: '5', text: 'Wrong answers go into the Tricky Words list for extra practice', color: 'bg-orange-500' },
          ].map(({ n, text, color }) => (
            <li key={n} className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-7 h-7 rounded-full ${color} text-white font-black text-sm flex items-center justify-center`}>
                {n}
              </span>
              <span className="text-gray-700 font-medium text-base">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
