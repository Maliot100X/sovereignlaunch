'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { Flame, TrendingUp, Users, DollarSign, ExternalLink, RefreshCw, Clock } from 'lucide-react';

interface Token {
  tokenMint: string;
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  imageUrl: string;
  status: string;
  creator: {
    name: string;
    wallet?: string;
  };
  launchedAt: string;
  priceChange24h: number;
}

export default function BagsLaunch() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch BAGS tokens
  const fetchTokens = async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);

      const res = await fetch(`/api/bags/feed?limit=50${refresh ? '&refresh=true' : ''}`);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setTokens(data.tokens || []);
      setLastUpdated(data.updatedAt || new Date().toISOString());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch BAGS tokens:', err);
      setError('Failed to load tokens. Retrying...');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch and auto-refresh every 60 seconds
  useEffect(() => {
    fetchTokens();

    const interval = setInterval(() => {
      fetchTokens(true); // Refresh every 60 seconds
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
  };

  const formatPrice = (price: number) => {
    if (price === 0) return '$0.000000';
    if (price < 0.000001) return '$' + price.toExponential(4);
    return '$' + price.toFixed(6);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-8 h-8 text-[#ff6b35]" />
            <h1 className="text-4xl font-bold text-white">BagsLaunch</h1>
          </div>
          <p className="text-gray-400 max-w-2xl">
            Real-time BAGS DEX token launches. Auto-refreshes every 60 seconds.
            Powered by BAGS API v2.
          </p>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-sm font-medium">Live</span>
            <span className="text-gray-500 text-sm">• Updates every 60s</span>
            {lastUpdated && (
              <span className="text-gray-500 text-sm ml-2">
                • Last: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>

          <button
            onClick={() => fetchTokens(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a24] hover:bg-[#2a2a3a] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Tokens</p>
            <p className="text-2xl font-bold text-white">{tokens.length}</p>
          </div>
          <div className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-4">
            <p className="text-gray-400 text-sm">24h Volume</p>
            <p className="text-2xl font-bold text-[#ffd700]">
              ${formatNumber(tokens.reduce((acc, t) => acc + (t.volume24h || 0), 0))}
            </p>
          </div>
          <div className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Market Cap</p>
            <p className="text-2xl font-bold text-[#00d4ff]">
              ${formatNumber(tokens.reduce((acc, t) => acc + (t.marketCap || 0), 0))}
            </p>
          </div>
          <div className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-4">
            <p className="text-gray-400 text-sm">Avg Holders</p>
            <p className="text-2xl font-bold text-white">
              {tokens.length > 0
                ? Math.round(tokens.reduce((acc, t) => acc + (t.holders || 0), 0) / tokens.length)
                : 0}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd700] mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading BAGS tokens...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="text-center py-12 border border-red-900/50 bg-red-900/10 rounded-xl">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => fetchTokens(true)}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && tokens.length === 0 && (
          <div className="text-center py-20 border border-[#2a2a3a] rounded-xl bg-[#12121a]/50">
            <p className="text-gray-400">No tokens launched yet. Be the first!</p>
            <a
              href="/launchpad"
              className="mt-4 inline-block px-6 py-3 bg-gradient-to-r from-[#ffd700] to-[#ff6b35] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Launch Token
            </a>
          </div>
        )}

        {/* Token Grid */}
        {!loading && !error && tokens.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tokens.map((token) => (
              <div
                key={token.tokenMint}
                className="bg-[#12121a] border border-[#2a2a3a] rounded-xl p-6 hover:border-[#ffd700]/50 transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={token.imageUrl || '/placeholder-token.png'}
                      alt={token.name}
                      className="w-12 h-12 rounded-full bg-[#1a1a24]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-token.png';
                      }}
                    />
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-[#ffd700] transition-colors">
                        {token.name}
                      </h3>
                      <p className="text-[#ffd700] text-sm font-medium">${token.symbol}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    token.status === 'Live'
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-gray-800 text-gray-400'
                  }`}>
                    {token.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Price
                    </span>
                    <span className="text-white font-medium">{formatPrice(token.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Market Cap
                    </span>
                    <span className="text-white">${formatNumber(token.marketCap)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Volume 24h
                    </span>
                    <span className="text-green-400">${formatNumber(token.volume24h)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Holders
                    </span>
                    <span className="text-white">{token.holders?.toLocaleString() || '0'}</span>
                  </div>
                  {token.priceChange24h !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">24h Change</span>
                      <span className={token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-[#2a2a3a]">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      By: {token.creator?.name || 'Unknown'}
                    </div>
                    <a
                      href={`https://bags.fm/token/${token.tokenMint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#ffd700] hover:text-[#ff6b35] flex items-center gap-1 transition-colors"
                    >
                      Trade on BAGS
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
