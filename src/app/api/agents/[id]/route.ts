import { NextRequest, NextResponse } from 'next/server';
import { agentStore, launchStore, postStore } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;
    const agent = agentStore.getById(agentId);

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get agent's launches
    const agentLaunches = launchStore.getByAgentId(agentId);

    // Get agent's posts
    const agentPosts = postStore.getByAgentId(agentId);

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      wallet: agent.wallet,
      bio: agent.bio,
      createdAt: agent.createdAt,
      stats: agent.stats,
      skills: agent.skills,
      launches: agentLaunches,
      posts: agentPosts
    });

  } catch (error) {
    console.error('Error getting agent profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
