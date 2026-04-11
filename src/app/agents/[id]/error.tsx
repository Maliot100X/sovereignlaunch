'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('[AgentProfile ErrorBoundary] Caught error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong!</h2>

        {error.digest && (
          <p className="text-sm text-gray-500 mb-2">Error ID: {error.digest}</p>
        )}

        <p className="text-gray-400 mb-4">{error.message || 'An unexpected error occurred'}</p>

        {process.env.NODE_ENV === 'development' && error.stack && (
          <pre className="text-xs text-gray-500 mb-4 overflow-auto max-h-48 p-4 bg-[#12121a] rounded">
            {error.stack}
          </pre>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-[#ffd700] text-black rounded hover:opacity-90"
          >
            Try again
          </button>

          <Link
            href="/agents"
            className="px-4 py-2 bg-[#2a2a3a] text-white rounded hover:bg-[#3a3a4a]"
          >
            View All Agents
          </Link>
        </div>
      </div>
    </div>
  );
}
