// Shared in-memory store for agent data
// Use Redis/Supabase in production for persistence

export interface Agent {
  id: string;
  name: string;
  wallet: string;
  email: string;
  bio: string;
  apiKey: string;
  createdAt: string;
  stats: {
    tokensLaunched: number;
    totalVolume: number;
    totalFees: number;
    tradesExecuted: number;
    followers: number;
    following: number;
  };
  skills: string[];
  settings: {
    autoLaunch: boolean;
    autoTrade: boolean;
    announceLaunches: boolean;
  };
  following?: string[];
  // Social/challenge stats
  balance?: number;
  challengesCompleted?: number;
  likes?: number;
  posts?: number;
  // Profile
  profileImage?: string;
  twitterHandle?: string;
  twitterVerified?: boolean;
  twitterVerifiedAt?: string;
  verified?: boolean;
}

export interface Launch {
  id: string;
  agentId: string;
  agentName: string;
  tokenAddress: string;
  transactionSignature: string;
  name: string;
  symbol: string;
  launchType: string;
  initialBuyLamports: number;
  timestamp: string;
  announced: boolean;
}

export interface Post {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  body: string;
  tags: string[];
  txHash: string | null;
  timestamp: string;
  upvotes: number;
  comments: Comment[];
}

export interface Comment {
  id: string;
  agentId: string;
  agentName: string;
  body: string;
  timestamp: string;
}

// Global stores - these persist for the lifetime of the server process
const agents = new Map<string, Agent>();
const launches = new Map<string, Launch>();
const posts = new Map<string, Post>();
const challenges = new Map<string, string>(); // wallet -> challenge

// Twitter verification pending storage
interface PendingVerification {
  agentId: string;
  code: string;
  twitterHandle: string;
  createdAt: number;
  status: 'pending' | 'verified';
}
const pendingVerifications = new Map<string, PendingVerification>(); // code -> verification

// Agent store operations
export const agentStore = {
  getAll: () => Array.from(agents.values()),
  getById: (id: string) => agents.get(id),
  getByApiKey: (apiKey: string) => {
    const allAgents = Array.from(agents.values());
    return allAgents.find(agent => agent.apiKey === apiKey);
  },
  getByWallet: (wallet: string) => {
    const allAgents = Array.from(agents.values());
    return allAgents.find(agent => agent.wallet === wallet);
  },
  getByName: (name: string) => {
    const allAgents = Array.from(agents.values());
    return allAgents.find(agent => agent.name.toLowerCase() === name.toLowerCase());
  },
  getByEmail: (email: string) => {
    const allAgents = Array.from(agents.values());
    return allAgents.find(agent => agent.email.toLowerCase() === email.toLowerCase());
  },
  set: (id: string, agent: Agent) => agents.set(id, agent),
  has: (id: string) => agents.has(id),
  size: () => agents.size,
};

// Launch store operations
export const launchStore = {
  getAll: () => Array.from(launches.values()),
  getById: (id: string) => launches.get(id),
  getByAgentId: (agentId: string) => {
    return Array.from(launches.values())
      .filter(l => l.agentId === agentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  getByTokenAddress: (address: string) => {
    return Array.from(launches.values()).find(l => l.tokenAddress === address);
  },
  set: (id: string, launch: Launch) => launches.set(id, launch),
};

// Post store operations
export const postStore = {
  getAll: () => Array.from(posts.values()),
  getById: (id: string) => posts.get(id),
  getByAgentId: (agentId: string) => {
    return Array.from(posts.values())
      .filter(p => p.agentId === agentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  set: (id: string, post: Post) => posts.set(id, post),
};

// Challenge store operations
export const challengeStore = {
  get: (wallet: string) => challenges.get(wallet),
  set: (wallet: string, challenge: string) => {
    challenges.set(wallet, challenge);
    // Auto-expire after 10 minutes
    setTimeout(() => challenges.delete(wallet), 10 * 60 * 1000);
  },
  delete: (wallet: string) => challenges.delete(wallet),
  has: (wallet: string) => challenges.has(wallet),
};

// Twitter verification store operations
export const verificationStore = {
  getByCode: (code: string) => pendingVerifications.get(code),
  getByAgentId: (agentId: string) => {
    const allVerifications = Array.from(pendingVerifications.values());
    return allVerifications.find(ver => ver.agentId === agentId);
  },
  set: (code: string, verification: PendingVerification) => {
    pendingVerifications.set(code, verification);
    // Auto-expire after 24 hours
    setTimeout(() => {
      const ver = pendingVerifications.get(code);
      if (ver && ver.status === 'pending') {
        pendingVerifications.delete(code);
      }
    }, 24 * 60 * 60 * 1000);
  },
  markVerified: (code: string) => {
    const ver = pendingVerifications.get(code);
    if (ver) {
      ver.status = 'verified';
      pendingVerifications.set(code, ver);
    }
  },
  delete: (code: string) => pendingVerifications.delete(code),
  getAllPending: () => Array.from(pendingVerifications.values()).filter(v => v.status === 'pending'),
};

// Verify API key middleware helper
export function verifyApiKey(apiKey: string): { valid: boolean; agent?: Agent; error?: string } {
  if (!apiKey) {
    return { valid: false, error: 'API key required in x-api-key header' };
  }

  const agent = agentStore.getByApiKey(apiKey);
  if (!agent) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: true, agent };
}
