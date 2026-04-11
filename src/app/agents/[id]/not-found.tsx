import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Agent Not Found</h1>
        <p className="text-gray-400 mb-4">The requested agent does not exist or has been removed.</p>
        <Link href="/agents" className="text-[#ffd700] hover:underline">
          View All Agents
        </Link>
      </div>
    </div>
  );
}
