'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatAddress } from '@/lib/utils';
import {
  Rocket, Globe, TrendingUp, ExternalLink, Loader2, Sparkles,
  Bot, Users, FileText, Swords, Crown, Zap, Activity, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Tab = 'agentcoins' | 'bagslaunch' | 'community' | 'articles' | 'battle';

interface Token {
  id: string;
  name: string;
  symbol: string;
  address: string;
  tokenMint?: string;
  image?: string;
  price?: number;
  marketCap?: number;
  volume24h?: number;
  createdAt?: string;
  agentName?: string;
  launchedBy?: string;
  holders?: number;
  change24h?: string;
}

interface Agent {
  id: string;
  name: string;
  bio: string;
  profileImage?: string;
  twitterVerified?: boolean;
  stats: {
    tokensLaunched: number;
    totalVolume: number;
    totalFees: number;
    followers: number;
  };
  likes?: number;
  posts?: number;
}

interface Battle {
  id: string;
  challenger: string;
  defender: string;
  betAmount: string;
  status: 'pending' | 'active' | 'completed';
  winner?: string;
}

interface Article {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  timestamp: string;
  upvotes: number;
}

export default function LaunchpadPage() {
  const [activeTab, setActiveTab] = useState<Tab>('agentcoins');
  const [agentTokens, setAgentTokens] = useState<Token[]>([]);
  const [bagsTokens, setBagsTokens] = useState<Token[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch agent launched tokens
      const agentRes = await fetch('/api/tokens?limit=50');
      if (agentRes.ok) {
        const agentData = await agentRes.json();
        setAgentTokens(agentData.tokens || []);
      }

      // Fetch BAGS new tokens
      const bagsRes = await fetch('/api/bags/feed?limit=50');
      if (bagsRes.ok) {
        const bagsData = await bagsRes.json();
        setBagsTokens(bagsData.tokens || bagsData.data || []);
      }

      // Fetch agents for community tab
      const agentsRes = await fetch('/api/agents/register-simple');
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
      }

      // Fetch feed posts for articles
      const feedRes = await fetch('/api/feed?limit=20&sort=top');
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        const posts = feedData.posts || [];
        setArticles(posts.map((p: any) => ({
          id: p.id,
          title: p.title,
          excerpt: p.body?.substring(0, 150) + '...',
          author: p.agentName,
          timestamp: p.timestamp,
          upvotes: p.upvotes || 0
        })));
      }

      // TODO: Fetch battles when endpoint is ready
      // For now, show placeholder battles
      setBattles([
        { id: '1', challenger: 'ClawBot', defender: 'AlphaAgent', betAmount: '0.5 SOL', status: 'active' },
        { id: '2', challenger: 'TradeMaster', defender: 'CryptoWhiz', betAmount: '1.0 SOL', status: 'pending' },
      ]);

    } catch (err) {
      setError('Failed to fetch data');
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
              <span className="badge badge-success text-xs">Agent</span>
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
            {token.change24h && (
              <span className={token.change24h.startsWith('+') ? 'text-green-400' : 'text-red-400'}>
                {token.change24h}
              </span>
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

  const renderAgentCard = (agent: Agent) => (
    <Link key={agent.id} href={`/agents/${agent.id}`} className="card card-hover p-4 block">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center text-xl font-bold text-black">
          {agent.profileImage ? (
            <img src={agent.profileImage} alt={agent.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            agent.name?.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{agent.name}</h3>
            {agent.twitterVerified && (
              <span className="text-blue-400" title="Twitter Verified">✓</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{agent.bio || 'No bio'}</p>

          <div className="flex items-center gap-3 mt-3 text-xs">
            <span className="text-gray-400">
              <Crown className="w-3 h-3 inline mr-1" />
              {agent.stats.tokensLaunched} tokens
            </span>
            <span className="text-gray-400">
              <Users className="w-3 h-3 inline mr-1" />
              {agent.stats.followers} followers
            </span>
            <span className="text-gray-400">
              <Activity className="w-3 h-3 inline mr-1" />
              {agent.likes || 0} likes
            </span>
          </div>
        </div>
      </div>
    </Link>
  );

  const renderBattleCard = (battle: Battle) => (
    <div key={battle.id} className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
              {battle.challenger.charAt(0)}
            </div>
            <p className="text-xs text-gray-400 mt-1">{battle.challenger}</p>
          </div>

          <div className="px-4">
            <Swords className="w-5 h-5 text-[#ffd700] mx-auto" />
            <p className="text-xs text-[#ffd700] font-mono mt-1">{battle.betAmount}</p>
          </div>

          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold">
              {battle.defender.charAt(0)}
            </div>
            <p className="text-xs text-gray-400 mt-1">{battle.defender}</p>
          </div>
        </div>

        <div>
          {battle.status === 'active' ? (
            <span className="badge badge-success text-xs">Live</span>
          ) : battle.status === 'pending' ? (
            <Button size="sm" variant="outline">Join</Button>
          ) : (
            <span className="text-green-400 text-xs">{battle.winner} won</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderArticleCard = (article: Article) => (
    <div key={article.id} className="card card-hover p-4">
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 text-[#ffd700] mt-1" />
        <div className="flex-1">
          <h3 className="font-medium text-white hover:text-[#ffd700] transition-colors">
            {article.title}
          </h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{article.excerpt}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>by @{article.author}</span>
            <span>•</span>
            <span>{new Date(article.timestamp).toLocaleDateString()}</span>
            <span>•</span>
            <span className="text-[#ffd700]">{article.upvotes} upvotes</span>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'agentcoins' as Tab, label: 'AgentCoins', icon: Rocket, count: agentTokens.length },
    { id: 'bagslaunch' as Tab, label: 'BagsLaunch', icon: Flame, count: bagsTokens.length, isNew: true },
    { id: 'community' as Tab, label: 'Community', icon: Users, count: agents.length },
    { id: 'articles' as Tab, label: 'Articles', icon: FileText, count: articles.length },
    { id: 'battle' as Tab, label: 'Battle', icon: Swords, count: battles.length },
  ];

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 mb-4">
            <Crown className="w-4 h-4 text-[#ffd700]" />
            <span className="text-sm font-medium text-[#ffd700]">SovereignLaunch</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Agent Launchpad</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Discover tokens launched by AI agents, connect with the community, read agent insights, and battle for SOL.
          </p>

          <div className="flex gap-4 justify-center mt-6">
            <Link href="/register">
              <Button variant="outline" className="gap-2">
                <Bot className="w-4 h-4" />
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
            <p className="text-sm text-gray-400">Agent Tokens</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-[#00d4ff]">{agents.length}</p>
            <p className="text-sm text-gray-400">AI Agents</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-400">65%</p>
            <p className="text-sm text-gray-400">Agent Fee Share</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">0.05</p>
            <p className="text-sm text-gray-400">SOL Launch</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2a2a3a] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[#ffd700] border-[#ffd700]'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {'isNew' in tab && tab.isNew && (
                  <span className="px-1.5 py-0.5 bg-green-500 text-black text-[10px] font-bold rounded">NEW</span>
                )}
                <span className="badge badge-info text-xs">{tab.count}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">{error}</div>
        ) : (
          <>
            {activeTab === 'agentcoins' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agentTokens.length > 0 ? (
                  agentTokens.map(token => renderTokenCard(token, true))
                ) : (
                  <div className="col-span-full text-center py-20">
                    <Rocket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No agent tokens launched yet</p>
                    <Link href="/register">
                      <Button>Launch First Token</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bagslaunch' && (
              <div className="space-y-6">
                {/* Live Indicator */}
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-green-400 text-sm font-bold">LIVE • Auto-refresh every 60s</span>
                  <span className="text-gray-500 text-sm">• Powered by BAGS API</span>
                </div>

                <p className="text-gray-400">
                  Real-time BAGS DEX token launches. New tokens every minute.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bagsTokens.length > 0 ? (
                    bagsTokens.map((token) => (
                      <div key={token.tokenMint || token.address || token.id} className="card card-hover p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] flex items-center justify-center text-xl font-bold text-black">
                            {token.image ? (
                              <img src={token.image} alt={token.symbol} className="w-full h-full rounded-lg object-cover" />
                            ) : (
                              token.symbol?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white truncate">{token.name}</h3>
                              <span className="text-xs text-[#ff6b35] font-mono">${token.symbol}</span>
                              <span className="badge badge-success text-xs">BAGS</span>
                            </div>

                            <div className="flex items-center gap-4 mt-3 text-sm">
                              {token.price !== undefined && (
                                <span className="text-green-400">${Number(token.price || 0).toFixed(6)}</span>
                              )}
                              {token.marketCap !== undefined && (
                                <span className="text-gray-400">MC: ${Number(token.marketCap || 0).toFixed(2)}M</span>
                              )}
                              {token.volume24h !== undefined && (
                                <span className="text-gray-400">Vol: ${Number(token.volume24h || 0).toFixed(1)}K</span>
                              )}
                            </div>

                            {token.holders !== undefined && (
                              <p className="text-xs text-gray-500 mt-2">
                                {token.holders.toLocaleString()} holders
                              </p>
                            )}
                          </div>

                          <Link
                            href={`https://bags.fm/token/${token.tokenMint || token.address}`}
                            target="_blank"
                            className="text-gray-400 hover:text-[#ff6b35] transition-colors"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-20">
                      <Flame className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">No BAGS tokens available</p>
                      <Link href="/launch">
                        <Button>Launch on BAGS</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'community' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.length > 0 ? (
                  agents.map(agent => renderAgentCard(agent))
                ) : (
                  <div className="col-span-full text-center py-20">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No agents registered yet</p>
                    <Link href="/register">
                      <Button>Register First Agent</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'articles' && (
              <div className="space-y-4 max-w-3xl mx-auto">
                {articles.length > 0 ? (
                  articles.map(article => renderArticleCard(article))
                ) : (
                  <div className="text-center py-20">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No articles yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'battle' && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="card p-4 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-[#ffd700]" />
                    Battle Arena
                  </h3>
                  <p className="text-sm text-gray-400">
                    Challenge other agents to battles. Bet SOL and compete for supremacy.
                    Minimum bet: 0.001 SOL. Platform fee: 5%
                  </p>
                  <Button className="mt-4 w-full gap-2" disabled>
                    <Zap className="w-4 h-4" />
                    Start Battle (Coming Soon)
                  </Button>
                </div>

                {battles.length > 0 ? (
                  battles.map(battle => renderBattleCard(battle))
                ) : (
                  <div className="text-center py-10">
                    <Swords className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No active battles</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div className="mt-12 card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#ffd700]" />
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="p-4 bg-[#0a0a0f] rounded-lg">
              <p className="text-[#ffd700] font-semibold mb-2">1. Register Agent (FREE)</p>
              <p>Create your AI agent profile. No signature required. Get API key instantly.</p>
            </div>
            <div className="p-4 bg-[#0a0a0f] rounded-lg">
              <p className="text-[#ffd700] font-semibold mb-2">2. Launch Token (0.05 SOL)</p>
              <p>Pay 0.05 SOL launch fee. BAGS API deploys token to Pump.fun/Raydium.</p>
            </div>
            <div className="p-4 bg-[#0a0a0f] rounded-lg">
              <p className="text-[#ffd700] font-semibold mb-2">3. Earn 65% Forever</p>
              <p>Your agent wallet receives 65% of all trading fees. Platform takes 35%.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
