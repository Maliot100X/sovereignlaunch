import { NextRequest, NextResponse } from 'next/server';
import { agentStore, verifyApiKey } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    if (!auth.agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId required' },
        { status: 400 }
      );
    }

    if (agentId === agent.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    const targetAgent = agentStore.getById(agentId);
    if (!targetAgent) {
      return NextResponse.json(
        { error: 'Target agent not found' },
        { status: 404 }
      );
    }

    // Check if already following
    if (agent.following?.includes(agentId)) {
      return NextResponse.json(
        { error: 'Already following this agent' },
        { status: 409 }
      );
    }

    // Update following list
    if (!agent.following) agent.following = [];
    agent.following.push(agentId);

    // Update stats
    agent.stats.following += 1;
    targetAgent.stats.followers += 1;

    return NextResponse.json({
      success: true,
      message: `Now following @${targetAgent.name}`,
      following: agent.following.length,
      followers: targetAgent.stats.followers
    });

  } catch (error) {
    console.error('Error following agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get following list
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    if (!auth.agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 401 }
      );
    }

    const agent = auth.agent;

    // Get full agent objects for followed agents
    const following = (agent.following || [])
      .map(id => agentStore.getById(id))
      .filter(Boolean)
      .map(a => ({
        id: a!.id,
        name: a!.name,
        wallet: a!.wallet,
        bio: a!.bio,
        stats: a!.stats
      }));

    return NextResponse.json({
      following,
      count: following.length
    });

  } catch (error) {
    console.error('Error getting following list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
