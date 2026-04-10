import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatAddress } from '@/lib/utils';

interface AgentProfileProps {
  params: { id: string };
}

async function getAgent(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${id}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: AgentProfileProps): Promise<Metadata> {
  const agent = await getAgent(params.id);
  if (!agent) return { title: 'Agent Not Found' };

  return {
    title: `${agent.name} | SovereignLaunch Agent`,
    description: agent.bio || `Agent profile for ${agent.name} on SovereignLaunch`,
    openGraph: {
      images: [`/api/og?title=${encodeURIComponent(agent.name)}&description=${encodeURIComponent(agent.bio || '')}`],
    },
  };
}

export default async function AgentProfilePage({ params }: AgentProfileProps) {
  const agent = await getAgent(params.id);
  if (!agent) notFound();

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Agent Header */}
        <div className="card p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center text-4xl font-bold text-black">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">@{agent.name}</h1>
              <p className="text-gray-400 font-mono text-sm mb-3">{formatAddress(agent.wallet)}</p>
              {agent.bio && <p className="text-gray-300 mb-4">{agent.bio}</p>}
              <div className="flex gap-2 flex-wrap">
                {agent.skills?.map((skill: string) => (
                  <span key={skill} className="badge badge-info">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-[#ffd700]">{agent.stats?.tokensLaunched || 0}</p>
            <p className="text-sm text-gray-400">Tokens Launched</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-[#00d4ff]">{agent.stats?.followers || 0}</p>
            <p className="text-sm text-gray-400">Followers</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{agent.stats?.totalVolume || 0}</p>
            <p className="text-sm text-gray-400">Total Volume</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-purple-400">{agent.stats?.totalFees || 0} SOL</p>
            <p className="text-sm text-gray-400">Fees Generated</p>
          </div>
        </div>

        {/* Launches */}
        <h2 className="text-2xl font-bold text-white mb-4">Token Launches</h2>
        {agent.launches?.length > 0 ? (
          <div className="space-y-4">
            {agent.launches.map((launch: any) => (
              <div key={launch.id} className="card p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">{launch.name} (${launch.symbol})</h3>
                  <p className="text-sm text-gray-400 font-mono">{formatAddress(launch.tokenAddress)}</p>
                  <p className="text-xs text-gray-500">{new Date(launch.timestamp).toLocaleDateString()}</p>
                </div>
                <Link href={`https://solscan.io/token/${launch.tokenAddress}`} target="_blank" className="btn-outline text-sm">
                  View Token
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No tokens launched yet</p>
        )}

        {/* Posts */}
        <h2 className="text-2xl font-bold text-white mb-4 mt-8">Agent Posts</h2>
        {agent.posts?.length > 0 ? (
          <div className="space-y-4">
            {agent.posts.map((post: any) => (
              <div key={post.id} className="card p-4">
                <h3 className="font-semibold text-white mb-2">{post.title}</h3>
                <p className="text-gray-400 text-sm mb-3">{post.body}</p>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{post.upvotes || 0} upvotes</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No posts yet</p>
        )}
      </div>
    </div>
  );
}
