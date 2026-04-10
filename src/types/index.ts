import { PublicKey } from '@solana/web3.js';

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  description?: string;
  image?: string;
  creator: string;
  createdAt: string;
  price?: string;
  marketCap?: string;
  volume24h?: string;
  holders?: number;
}

export interface TokenLaunchParams {
  name: string;
  symbol: string;
  description: string;
  image?: string;
  decimals?: number;
  totalSupply?: string;
  initialLiquidity?: string;
  launchType: 'gasless' | 'self-funded';
  creatorWallet: string;
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    website?: string;
    discord?: string;
  };
}

export interface FeeDistribution {
  platform: number;
  user: number;
  partner: number;
  agent?: string;
  agentWallet?: string;
  platformWallet?: string;
}

export interface LaunchResponse {
  success: boolean;
  tokenAddress?: string;
  transactionSignature?: string;
  metadataUrl?: string;
  error?: string;
  message?: string;
  feeDistribution?: FeeDistribution;
}

export interface TradeParams {
  tokenAddress: string;
  amount: string;
  slippage?: number;
  walletAddress: string;
  type: 'buy' | 'sell';
}

export interface TradeResponse {
  success: boolean;
  transactionSignature?: string;
  error?: string;
  message?: string;
  amountReceived?: string;
  price?: string;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: 'token' | 'trading' | 'analytics' | 'social' | 'automation';
  icon: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  walletAddress: string;
  skills: AgentSkill[];
  autoLaunch: boolean;
  autoTrade: boolean;
  feeClaimEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletContextType {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  disconnecting: boolean;
  wallet: any;
  wallets: any[];
  select: (walletName: string) => void;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface TelegramCommand {
  command: string;
  description: string;
  handler: (ctx: any) => Promise<void>;
  adminOnly?: boolean;
}

export interface BAGSAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TokenMetrics {
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  buys24h: number;
  sells24h: number;
}

export interface FeeClaimInfo {
  availableFees: string;
  tokenAddress: string;
  tokenSymbol: string;
  lastClaimedAt?: string;
  totalClaimed?: string;
}

export interface LaunchpadStats {
  totalTokens: number;
  totalVolume: string;
  totalFees: string;
  activeAgents: number;
  topTokens: TokenInfo[];
}

export interface NotificationMessage {
  type: 'launch' | 'trade' | 'fee' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

export interface NetworkConfig {
  cluster: SolanaCluster;
  rpcUrl: string;
  wsUrl?: string;
}

export interface PlatformConfig {
  name: string;
  wallet: string;
  fees: FeeDistribution;
  apiUrl: string;
  bagsApiUrl: string;
  bagsApiKey: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ChartDataPoint {
  timestamp: number;
  price: number;
  volume: number;
}

export interface HolderInfo {
  address: string;
  balance: string;
  percentage: number;
}
