'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { bagsApi } from '@/lib/bags-api';
import {
  Bot,
  Zap,
  TrendingUp,
  Coins,
  Share2,
  Shield,
  Activity,
  Sparkles,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import type { AgentSkill, AgentConfig, FeeClaimInfo } from '@/types';

const DEFAULT_SKILLS: AgentSkill[] = [
  { id: 'token-launch', name: 'Token Launch', description: 'Launch new tokens with optimized parameters', category: 'token', icon: 'Coins', enabled: true },
  { id: 'auto-trade', name: 'Auto Trading', description: 'Automated buy/sell based on market conditions', category: 'trading', icon: 'TrendingUp', enabled: false },
  { id: 'fee-claim', name: 'Fee Claiming', description: 'Automatically claim trading fees', category: 'automation', icon: 'Zap', enabled: true },
  { id: 'social-post', name: 'Social Posts', description: 'Post token updates to social media', category: 'social', icon: 'Share2', enabled: false },
  { id: 'analytics', name: 'Analytics Tracking', description: 'Track and report token metrics', category: 'analytics', icon: 'Activity', enabled: true },
  { id: 'liquidity-mgmt', name: 'Liquidity Management', description: 'Optimize liquidity pool ratios', category: 'trading', icon: 'Shield', enabled: false },
  { id: 'price-alerts', name: 'Price Alerts', description: 'Monitor price movements and alert', category: 'analytics', icon: 'Sparkles', enabled: false },
];

const SKILL_ICONS: Record<string, React.ElementType> = {
  Coins,
  TrendingUp,
  Zap,
  Share2,
  Activity,
  Shield,
  Sparkles,
};

export function AgentDashboard() {
  const { connected, publicKey } = useWallet();
  const [agentName, setAgentName] = useState('My Sovereign Agent');
  const [skills, setSkills] = useState<AgentSkill[]>(DEFAULT_SKILLS);
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState({
    tokensLaunched: 0,
    tradesExecuted: 0,
    feesClaimed: 0,
    lastActive: null as Date | null,
  });
  const [claimableFees, setClaimableFees] = useState<FeeClaimInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const feesResponse = await bagsApi.getFeesForClaim(publicKey.toString());
          if (feesResponse.success && feesResponse.data) {
            setClaimableFees(feesResponse.data);
          }

          setStats({
            tokensLaunched: Math.floor(Math.random() * 10),
            tradesExecuted: Math.floor(Math.random() * 50),
            feesClaimed: parseFloat((Math.random() * 2).toFixed(3)),
            lastActive: new Date(),
          });
        } catch (error) {
          console.error('Error loading agent data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [connected, publicKey]);

  const loadAgentData = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    try {
      const feesResponse = await bagsApi.getFeesForClaim(publicKey.toString());
      if (feesResponse.success && feesResponse.data) {
        setClaimableFees(feesResponse.data);
      }

      setStats({
        tokensLaunched: Math.floor(Math.random() * 10),
        tradesExecuted: Math.floor(Math.random() * 50),
        feesClaimed: parseFloat((Math.random() * 2).toFixed(3)),
        lastActive: new Date(),
      });
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSkills(prev => prev.map(skill =>
      skill.id === skillId ? { ...skill, enabled: !skill.enabled } : skill
    ));
  };

  const toggleAgent = () => {
    setIsActive(!isActive);
    // In production, this would trigger server-side notification
  };

  const handleClaimFees = async (tokenAddress: string) => {
    if (!publicKey) return;

    try {
      const response = await bagsApi.claimFees(tokenAddress, publicKey.toString());
      if (response.success) {
        await loadAgentData();
      }
    } catch (error) {
      console.error('Error claiming fees:', error);
    }
  };

  if (!connected) {
    return (
      <div className="text-center py-20">
        <Bot className="w-16 h-16 text-[#ffd700] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
        <p className="text-gray-400 mb-6">Connect your Solana wallet to create and manage agents</p>
        <WalletMultiButton className="wallet-adapter-button" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Agent Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#ffd700]" />
            {agentName}
          </h2>
          <p className="text-gray-400 mt-1">
            {isActive ? (
              <span className="flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Agent Active
              </span>
            ) : (
              <span className="flex items-center gap-2 text-gray-500">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                Agent Inactive
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {}}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button
            onClick={toggleAgent}
            variant={isActive ? 'destructive' : 'default'}
            className="gap-2"
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4" />
                Stop Agent
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Agent
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Tokens Launched</p>
                <p className="text-2xl font-bold text-[#ffd700]">{stats.tokensLaunched}</p>
              </div>
              <Coins className="w-8 h-8 text-[#ffd700]/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Trades Executed</p>
                <p className="text-2xl font-bold text-[#00d4ff]">{stats.tradesExecuted}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[#00d4ff]/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Fees Claimed</p>
                <p className="text-2xl font-bold text-green-400">{stats.feesClaimed.toFixed(3)} SOL</p>
              </div>
              <Zap className="w-8 h-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Skills</p>
                <p className="text-2xl font-bold text-purple-400">{skills.filter(s => s.enabled).length}/{skills.length}</p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skills Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#ffd700]" />
            Agent Skills
          </CardTitle>
          <CardDescription>
            Enable or disable skills to customize your agent&apos;s capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill) => {
              const IconComponent = SKILL_ICONS[skill.icon] || Bot;
              return (
                <div
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    skill.enabled
                      ? 'border-[#ffd700]/50 bg-[#ffd700]/5'
                      : 'border-[#2a2a3a] hover:border-[#2a2a3a]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    skill.enabled ? 'bg-[#ffd700]/20' : 'bg-[#2a2a3a]'
                  }`}>
                    <IconComponent className={`w-5 h-5 ${skill.enabled ? 'text-[#ffd700]' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${skill.enabled ? 'text-white' : 'text-gray-400'}`}>
                      {skill.name}
                    </h4>
                    <p className="text-xs text-gray-500">{skill.description}</p>
                  </div>
                  {skill.enabled ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-600" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Claimable Fees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#ffd700]" />
            Claimable Fees
          </CardTitle>
          <CardDescription>
            Fees earned from token trading that are available to claim
          </CardDescription>
        </CardHeader>
        <CardContent>
          {claimableFees.length > 0 ? (
            <div className="space-y-3">
              {claimableFees.map((fee, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-[#12121a] rounded-lg"
                >
                  <div>
                    <p className="font-medium text-white">{fee.tokenSymbol}</p>
                    <p className="text-sm text-gray-400">{fee.tokenAddress.slice(0, 6)}...{fee.tokenAddress.slice(-4)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[#ffd700]">{fee.availableFees} SOL</p>
                    <Button
                      size="sm"
                      onClick={() => handleClaimFees(fee.tokenAddress)}
                      className="mt-2"
                    >
                      Claim
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Coins className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>No claimable fees available</p>
              <p className="text-sm mt-1">Fees will appear here when your tokens generate trading volume</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AgentDashboard;
