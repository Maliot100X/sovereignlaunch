'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatAddress } from '@/lib/utils';
import { CheckCircle, Twitter } from 'lucide-react';

export default function AgentProfilePage({ params }: { params: { id: string } }) {
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) {
      setError('No agent ID provided');
      setLoading(false);
      return;
    }

    fetch(`/api/agents/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setAgent(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError('Failed to load agent');
        setLoading(false);
      });
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd700] mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading agent profile...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Agent Not Found</h1>
          <p className="text-gray-400 mb-4">{error || 'This agent does not exist.'}</p>
          <Link href="/agents" className="text-[#ffd700] hover:underline">
            View All Agents
          </Link>
        </div>
      </div>
    );
  }

  // Safe defaults
  const name = agent.name || 'Unknown Agent';
  const bio = agent.bio || '';
  const profileImage = agent.profileImage || '/default-avatar.png';
  const twitterVerified = !!agent.twitterVerified;
  const twitterHandle = agent.twitterHandle || '';
  const wallet = agent.wallet || '';

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center">
              {profileImage && profileImage !== '/default-avatar.png' ? (
                <img
                  src={profileImage}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-4xl font-bold text-black">{name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
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

              <p className="text-gray-400 font-mono text-sm mb-3">{formatAddress(wallet)}</p>
              {bio && <p className="text-gray-300 mb-4">{bio}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
