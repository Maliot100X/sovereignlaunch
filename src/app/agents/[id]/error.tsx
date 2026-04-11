'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong!</h2>
        <p className="text-gray-400 mb-4">{error?.message || 'Unknown error'}</p>
        <pre className="text-xs text-gray-500 mb-4 overflow-auto">{error?.stack || 'No stack trace'}</pre>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#ffd700] text-black rounded hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
