import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

// GET: Platform statistics from Redis
export async function GET() {
  try {
    // Get agent count
    const agentIds = await redis.smembers('agents:list');
    const agentCount = agentIds.length;

    // Get token count
    const tokenIds = await redis.lrange('tokens:list', 0, -1);
    const tokenCount = tokenIds.length;

    // Calculate total volume from all tokens
    let totalVolume = 0;
    let totalFees = 0;

    for (const id of tokenIds) {
      const tokenData = await redis.get(`token:${id}`);
      if (tokenData) {
        const token = JSON.parse(tokenData as string);
        totalVolume += token.volume24h || token.volume || 0;
        totalFees += token.totalFees || token.fees || 0;
      }
    }

    // Get post count
    const postCount = await redis.llen('posts:list');

    // Get verified agents count
    let verifiedCount = 0;
    for (const agentId of agentIds.slice(0, 100)) { // Check first 100 for performance
      const agentData = await redis.get(`agent:${agentId}`);
      if (agentData) {
        const agent = JSON.parse(agentData as string);
        if (agent.twitterVerified) {
          verifiedCount++;
        }
      }
    }

    return NextResponse.json({
      agents: agentCount,
      tokens: tokenCount,
      posts: postCount,
      verified: verifiedCount,
      volume: Math.floor(totalVolume),
      fees: Math.floor(totalFees),
      platform: {
        wallet: 'Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx',
        feePercent: 35,
        agentFeeShare: 65,
        launchFee: '0.05 SOL'
      },
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
