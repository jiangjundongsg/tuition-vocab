import WordUploader from '@/components/WordUploader';

export default function UploadPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="text-5xl">📚</div>
        <h1 className="text-4xl font-black text-gray-800">Upload Word List</h1>
        <p className="text-lg text-gray-600 font-medium max-w-lg mx-auto">
          Type or paste your vocabulary words below. Each word will be automatically scored for difficulty.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-6 border-2 border-purple-100">
        <WordUploader />
      </div>

      {/* Tips box */}
      <div className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-200">
        <h3 className="font-black text-blue-700 text-lg mb-2">💡 Tips for teachers</h3>
        <ul className="space-y-1.5 text-blue-800 font-medium text-sm">
          <li>• Enter one word per line, or separate with commas</li>
          <li>• You can also drag and drop a .txt file</li>
          <li>• Words are scored: 🌱 Easy, 🔥 Medium, 🚀 Hard</li>
          <li>• Re-uploading a word updates its difficulty score</li>
          <li>• AI questions are generated automatically when students practise</li>
        </ul>
      </div>
    </div>
  );
}
