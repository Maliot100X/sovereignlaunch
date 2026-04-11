import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// GET: Get leaderboard of top agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'tokensLaunched';

    // Get all agent IDs
    const agentIds = await redis.smembers('agents:list');

    // Fetch all agent data
    const agents = await Promise.all(
      agentIds.map(async (id) => {
        const data = await redis.get(`agent:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    // Filter out nulls and sort by requested metric
    const validAgents = agents.filter(Boolean);
    validAgents.sort((a, b) => {
      const aVal = a.stats?.[sortBy] || a[sortBy] || 0;
      const bVal = b.stats?.[sortBy] || b[sortBy] || 0;
      return (bVal as number) - (aVal as number);
    });

    // Add rank and limit
    const rankedAgents = validAgents.slice(0, limit).map((agent, index) => ({
      rank: index + 1,
      id: agent.id,
      name: agent.name,
      wallet: agent.wallet,
      bio: agent.bio,
      profileImage: agent.profileImage,
      twitterVerified: agent.twitterVerified,
      stats: agent.stats,
      tokensLaunched: agent.tokensLaunched || 0,
      posts: agent.posts || 0,
      likes: agent.likes || 0,
      createdAt: agent.createdAt
    }));

    return NextResponse.json({
      agents: rankedAgents,
      sortBy,
      totalAgents: validAgents.length
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
