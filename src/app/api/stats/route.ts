import { NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { bagsApi } from '@/lib/bags-api';

// GET: Platform statistics from Redis + BAGS API
export async function GET() {
  try {
    // Get agent count
    const agentIds = await redis.smembers('agents:list');
    const agentCount = agentIds.length;

    // Get token count from Redis
    const tokenIds = await redis.lrange('tokens:list', 0, -1);
    const tokenCount = tokenIds.length;

    // Calculate total volume and fees from Redis
    let totalVolume = 0;
    let totalFees = 0;
    let totalTrades = 0;

    for (const id of tokenIds) {
      const tokenData = await redis.get(`token:${id}`);
      if (tokenData) {
        const token = JSON.parse(tokenData as string);
        totalVolume += token.volume24h || token.volume || 0;
        totalFees += token.totalFees || token.fees || 0;
        totalTrades += token.trades || 0;
      }
    }

    // Get post count
    const postCount = await redis.llen('posts:list');

    // Get verified agents count
    let verifiedCount = 0;
    const allAgents = [];
    for (const agentId of agentIds) {
      const agentData = await redis.get(`agent:${agentId}`);
      if (agentData) {
        const agent = JSON.parse(agentData as string);
        if (agent.twitterVerified) verifiedCount++;
        allAgents.push(agent);
      }
    }

    // Calculate total followers/following
    let totalFollowers = 0;
    let totalFollowing = 0;
    for (const agent of allAgents) {
      totalFollowers += agent.stats?.followers || 0;
      totalFollowing += agent.stats?.following || 0;
    }

    // Get BAGS API stats for real market data
    let bagsStats = null;
    try {
      const bagsFeed = await bagsApi.getTokens({ limit: 100 });
      if (bagsFeed.success && bagsFeed.data) {
        bagsStats = {
          totalTokens: bagsFeed.data.length,
          totalVolume24h: bagsFeed.data.reduce((sum: number, t: any) => sum + (t.volume24h || 0), 0),
          totalMarketCap: bagsFeed.data.reduce((sum: number, t: any) => sum + (t.marketCap || 0), 0)
        };
      }
    } catch (bagsError) {
      console.error('[Stats] BAGS API error:', bagsError);
    }

    return NextResponse.json({
      agents: agentCount,
      tokens: tokenCount,
      posts: postCount,
      verified: verifiedCount,
      followers: totalFollowers,
      following: totalFollowing,
      volume: Math.floor(totalVolume),
      fees: Math.floor(totalFees),
      trades: totalTrades,
      platform: {
        wallet: 'Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx',
        feePercent: 35,
        agentFeeShare: 65,
        launchFee: '0.05 SOL'
      },
      bagsStats,
      topAgents: allAgents
        .sort((a, b) => (b.stats?.tokensLaunched || 0) - (a.stats?.tokensLaunched || 0))
        .slice(0, 5)
        .map(a => ({ id: a.id, name: a.name, tokensLaunched: a.stats?.tokensLaunched || 0 })),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Stats] Error:', error);
    return NextResponse.json(
      {
        agents: 0,
        tokens: 0,
        posts: 0,
        verified: 0,
        volume: 0,
        fees: 0,
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
