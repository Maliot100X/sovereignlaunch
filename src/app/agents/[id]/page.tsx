import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AgentContent } from './agent-content';

// Force dynamic rendering - no static generation
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Generate static paths for build (will be regenerated at runtime due to force-dynamic)
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

// Metadata
export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `Agent Profile - ${params.id}`,
  };
}

// Loading fallback
function Loading() {
  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd700] mx-auto"></div>
        <p className="mt-4 text-gray-400">Loading agent profile...</p>
      </div>
    </div>
  );
}

// Main page component (Server Component)
export default function AgentProfilePage({ params }: { params: { id: string } }) {
  const id = params?.id;

  if (!id) {
    notFound();
  }

  console.log('[AgentPage] Rendering with ID:', id);

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={<Loading />}>
          <AgentContent id={id} />
        </Suspense>
      </div>
    </div>
  );
}
