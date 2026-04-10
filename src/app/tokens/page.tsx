import { bagsApi } from '@/lib/bags-api';
import { formatCurrency, formatAddress, formatNumber } from '@/lib/utils';
import Link from 'next/link';
import type { Metadata } from 'next';
import { TrendingUp, TrendingDown, ExternalLink, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tokens | SovereignLaunch',
  description: 'Explore all tokens launched on SovereignLaunch. View prices, market cap, volume, and more.',
};

export const revalidate = 60; // Revalidate every 60 seconds

async function getTokens() {
  try {
    const response = await bagsApi.getTokens({ limit: 50 });
    return response.success ? response.data || [] : [];
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return [];
  }
}

export default async function TokensPage() {
  const tokens = await getTokens();

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">All Tokens</h1>
            <p className="text-gray-400">
              Explore tokens launched on SovereignLaunch
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search tokens..."
              className="pl-10 pr-4 py-2 bg-[#12121a] border border-[#2a2a3a] rounded-lg text-white placeholder-gray-500 focus:border-[#ffd700] focus:outline-none"
            />
          </div>
        </div>

        {tokens.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a3a]">
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Token</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">Price</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">Market Cap</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">Volume (24h)</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-gray-400">Holders</th>
                    <th className="text-center py-4 px-6 text-sm font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => (
                    <tr key={token.address} className="border-b border-[#2a2a3a] hover:bg-[#12121a] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center text-black font-bold">
                            {token.symbol.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{token.name}</p>
                            <p className="text-sm text-gray-500">
                              {token.symbol} • {formatAddress(token.address)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-medium text-white">
                          {token.price ? formatCurrency(parseFloat(token.price), 6) : 'N/A'}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-medium text-white">
                          {token.marketCap ? formatCurrency(parseFloat(token.marketCap)) : 'N/A'}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-medium text-white">
                          {token.volume24h ? formatCurrency(parseFloat(token.volume24h)) : 'N/A'}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-medium text-white">
                          {token.holders ? formatNumber(token.holders) : 'N/A'}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Link
                          href={`https://solscan.io/token/${token.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#ffd700] hover:text-[#ff6b35] transition-colors"
                        >
                          View
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-[#2a2a3a] flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No tokens found</h3>
            <p className="text-gray-400 mb-6">
              Be the first to launch a token on SovereignLaunch!
            </p>
            <Link
              href="/launch"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ffd700] to-[#b8a030] text-black font-semibold rounded-lg hover:shadow-[0_4px_20px_rgba(255,215,0,0.4)] transition-all"
            >
              Launch Token
              <TrendingUp className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
