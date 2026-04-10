import { NextRequest, NextResponse } from 'next/server';
import { agentStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'tokensLaunched';

    // Get all agents
    const allAgents = agentStore.getAll();

    // Sort by requested metric
    allAgents.sort((a, b) => {
      const aVal = a.stats[sortBy as keyof typeof a.stats] || 0;
      const bVal = b.stats[sortBy as keyof typeof b.stats] || 0;
      return (bVal as number) - (aVal as number);
    });

    // Add rank and limit
    const rankedAgents = allAgents.slice(0, limit).map((agent, index) => ({
      rank: index + 1,
      id: agent.id,
      name: agent.name,
      wallet: agent.wallet,
      bio: agent.bio,
      stats: agent.stats,
      createdAt: agent.createdAt
    }));

    return NextResponse.json({
      agents: rankedAgents,
      sortBy,
      totalAgents: allAgents.length
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
