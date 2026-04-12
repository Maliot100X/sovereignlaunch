'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatAddress } from '@/lib/utils';
import { CheckCircle, Twitter } from 'lucide-react';

interface AgentContentProps {
  id: string;
}

export function AgentContent({ id }: AgentContentProps) {
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAgent() {
      try {
        console.log('[AgentContent] Fetching agent:', id);
        const res = await fetch(`/api/agents/${id}`);
        const data = await res.json();

        if (cancelled) return;

        console.log('[AgentContent] API response:', data);

        if (!res.ok) {
          setError(data.error || `HTTP ${res.status}`);
        } else if (data.error) {
          setError(data.error);
        } else {
          setAgent(data);
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error('[AgentContent] Fetch error:', err);
        setError(err.message || 'Failed to load agent');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAgent();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd700] mx-auto"></div>
        <p className="mt-4 text-gray-400">Loading agent profile...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-white mb-4">Agent Not Found</h1>
        <p className="text-gray-400 mb-4">{error || 'This agent does not exist.'}</p>
        <Link href="/agents" className="text-[#ffd700] hover:underline">
          View All Agents
        </Link>
      </div>
    );
  }

  // Safe defaults with explicit null checks
  const name = agent?.name || 'Unknown Agent';
  const bio = agent?.bio || '';
  const profileImage = agent?.profileImage || '/default-avatar.svg';
  const backgroundImage = agent?.backgroundImage || '/default-banner.svg';
  const twitterVerified = !!(agent?.twitterVerified || agent?.verified);
  const twitterHandle = agent?.twitterHandle || '';
  const wallet = agent?.wallet || '';
  const stats = agent?.stats || {};

  return (
    <div>
      {/* Profile Card with Background */}
      <div className="card p-0 mb-8 overflow-hidden">
        {/* Background Image */}
        <div className="h-48 w-full relative">
          <img
            src={backgroundImage}
            alt="Background"
            className="w-full h-full object-cover"
            onError={(e) => {
              // On error, show default gradient
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent"></div>
        </div>

        {/* Profile Content */}
        <div className="p-8 -mt-12 relative">
          <div className="flex items-start gap-6">
            {/* Profile Image */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center flex-shrink-0 border-4 border-[#0a0a0f] shadow-2xl">
              {profileImage && profileImage !== '/default-avatar.png' ? (
                <img
                  src={profileImage}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                    const span = document.createElement('span');
                    span.className = 'text-4xl font-bold text-black';
                    span.textContent = name.charAt(0).toUpperCase();
                    target.parentElement?.appendChild(span);
                  }}
                />
              ) : (
                <span className="text-4xl font-bold text-black">{name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold text-white">@{name}</h1>
                {twitterVerified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium border border-blue-600/30">
                    <CheckCircle className="w-4 h-4" />
                    Verified
                  </span>
                )}
              </div>

              {twitterHandle && (
                <a
                  href={`https://twitter.com/${twitterHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 mb-2"
                >
                  <Twitter className="w-4 h-4" />
                  {twitterHandle}
                </a>
              )}

              {wallet && (
                <p className="text-gray-400 font-mono text-sm mb-3">{formatAddress(wallet)}</p>
              )}
              {bio && <p className="text-gray-300 mb-4">{bio}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Tokens Launched</p>
          <p className="text-2xl font-bold text-[#ffd700]">{stats?.tokensLaunched || 0}</p>
        </div>
        <div className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Volume</p>
          <p className="text-2xl font-bold text-[#00d4ff]">${stats?.totalVolume?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Trades</p>
          <p className="text-2xl font-bold text-white">{stats?.tradesExecuted || 0}</p>
        </div>
        <div className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-4">
          <p className="text-gray-400 text-sm">Followers</p>
          <p className="text-2xl font-bold text-white">{stats?.followers || 0}</p>
        </div>
      </div>

      {/* Launches Section */}
      {agent?.launches && agent.launches.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Token Launches</h2>
          <div className="space-y-4">
            {agent.launches.map((launch: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-[#12121a] rounded-lg">
                <img
                  src={launch?.image || '/placeholder-token.png'}
                  alt={launch?.name || 'Token'}
                  className="w-12 h-12 rounded-full bg-[#1a1a24]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-token.png';
                  }}
                />
                <div className="flex-1">
                  <h3 className="font-bold text-white">{launch?.name || 'Unknown Token'}</h3>
                  <p className="text-[#ffd700] text-sm">${launch?.symbol || '???'}</p>
                </div>
                <a
                  href={`https://bags.fm/${launch?.mint || launch?.tokenMint || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#ffd700] hover:text-[#ff6b35]"
                >
                  View on BAGS
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts Section */}
      {agent?.posts && agent.posts.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold text-white mb-4">Recent Posts</h2>
          <div className="space-y-4">
            {agent.posts.map((post: any, idx: number) => (
              <div key={idx} className="p-4 bg-[#12121a] rounded-lg">
                <p className="text-gray-300">{post?.content || 'No content'}</p>
                <p className="text-gray-500 text-sm mt-2">
                  {post?.createdAt ? new Date(post.createdAt).toLocaleString() : 'Unknown date'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back Link */}
      <div className="mt-8 text-center">
        <Link href="/agents" className="text-[#ffd700] hover:underline">
          ← Back to All Agents
        </Link>
      </div>
    </div>
  );
}
