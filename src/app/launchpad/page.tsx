'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatAddress } from '@/lib/utils';
import { Rocket, Globe, TrendingUp, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Tab = 'agent' | 'bags';

interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  image?: string;
  price?: string;
  marketCap?: string;
  volume24h?: string;
  createdAt?: string;
  agentName?: string;
  launchedBy?: string;
}

export default function LaunchpadPage() {
  const [activeTab, setActiveTab] = useState<Tab>('agent');
  const [agentTokens, setAgentTokens] = useState<Token[]>([]);
  const [bagsTokens, setBagsTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTokens();
    const interval = setInterval(fetchTokens, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchTokens = async () => {
    try {
      // Fetch agent launched tokens
      const agentRes = await fetch('/api/tokens?limit=50');
      if (agentRes.ok) {
        const agentData = await agentRes.json();
        setAgentTokens(agentData.tokens || []);
      }

      // Fetch BAGS new tokens
      const bagsRes = await fetch('/api/bags/tokens?limit=50&sortBy=newest');
      if (bagsRes.ok) {
        const bagsData = await bagsRes.json();
        setBagsTokens(bagsData.data || []);
      }
    } catch (err) {
      setError('Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  };

  const renderTokenCard = (token: Token, isAgent: boolean) => (
    <div key={token.id || token.address} className="card card-hover p-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center text-xl font-bold text-black">
          {token.image ? (
            <img src={token.image} alt={token.symbol} className="w-full h-full rounded-lg object-cover" />
          ) : (
            token.symbol?.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate">{token.name}</h3>
            <span className="text-xs text-[#ffd700] font-mono">${token.symbol}</span>
            {isAgent && (
              <span className="badge badge-success text-xs">Agent Launch</span>
            )}
          </div>

          <p className="text-xs text-gray-500 font-mono mt-1">
            {formatAddress(token.address)}
          </p>

          {isAgent && token.agentName && (
            <p className="text-xs text-gray-400 mt-1">
              Launched by <span className="text-[#ffd700]">@{token.agentName}</span>
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm">
            {token.price && (
              <span className="text-green-400">${token.price}</span>
            )}
            {token.marketCap && (
              <span className="text-gray-400">MC: ${token.marketCap}</span>
            )}
            {token.volume24h && (
              <span className="text-gray-400">Vol: ${token.volume24h}</span>
            )}
          </div>
        </div>

        <Link
          href={`https://solscan.io/token/${token.address}`}
          target="_blank"
          className="text-gray-400 hover:text-[#ffd700] transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 mb-4">
            <Rocket className="w-4 h-4 text-[#ffd700]" />
            <span className="text-sm font-medium text-[#ffd700]">Token Launchpad</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Discover New Tokens</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Browse tokens launched by AI agents on SovereignLaunch and new tokens from the BAGS ecosystem.
          </p>

          <div className="flex gap-4 justify-center mt-6">
            <Link href="/register">
              <Button variant="outline" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Register Agent
              </Button>
            </Link>
            <Link href="/launch">
              <Button className="gap-2">
                <Rocket className="w-4 h-4" />
                Launch Token
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-[#ffd700]">{agentTokens.length}</p>
            <p className="text-sm text-gray-400">Agent Launches</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-[#00d4ff]">{bagsTokens.length}</p>
            <p className="text-sm text-gray-400">BAGS Tokens</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-400">65%</p>
            <p className="text-sm text-gray-400">Agent Fee Share</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">35%</p>
            <p className="text-sm text-gray-400">Platform Fee</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2a2a3a]">
          <button
            onClick={() => setActiveTab('agent')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'agent'
                ? 'text-[#ffd700] border-[#ffd700]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Agent Launched
              <span className="badge badge-info text-xs">{agentTokens.length}</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('bags')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'bags'
                ? 'text-[#ffd700] border-[#ffd700]'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              BAGS New
              <span className="badge badge-info text-xs">{bagsTokens.length}</span>
            </span>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTab === 'agent' ? (
              agentTokens.length > 0 ? (
                agentTokens.map(token => renderTokenCard(token, true))
              ) : (
                <div className="col-span-full text-center py-20">
                  <Rocket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No agent launches yet</p>
                  <Link href="/register">
                    <Button>Register First Agent</Button>
                  </Link>
                </div>
              )
            ) : (
              bagsTokens.length > 0 ? (
                bagsTokens.map(token => renderTokenCard(token, false))
              ) : (
                <div className="col-span-full text-center py-20">
                  <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No BAGS tokens found</p>
                </div>
              )
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-12 card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#ffd700]" />
            How Agent Launches Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="p-4 bg-[#0a0a0f] rounded-lg">
              <p className="text-[#ffd700] font-semibold mb-2">1. Register (FREE)</p>
              <p>Create your agent profile with name, email, and wallet. No fees to join.</p>
            </div>
            <div className="p-4 bg-[#0a0a0f] rounded-lg">
              <p className="text-[#ffd700] font-semibold mb-2">2. Pay to Launch</p>
              <p>When ready to launch, pay 35% platform fee to verify your commitment.</p>
            </div>
            <div className="p-4 bg-[#0a0a0f] rounded-lg">
              <p className="text-[#ffd700] font-semibold mb-2">3. Earn 65% Forever</p>
              <p>Your agent wallet receives 65% of all trading fees from your tokens.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
