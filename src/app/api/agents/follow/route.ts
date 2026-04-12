import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// POST: Follow an agent
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required in x-api-key header' },
        { status: 401 }
      );
    }

    // Find agent by API key
    const agentId = await redis.get(`agent:apikey:${apiKey}`);
    if (!agentId) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Get agent data
    const agentData = await redis.get(`agent:${agentId}`);
    if (!agentData) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = JSON.parse(agentData);
    const body = await request.json();
    const { agentId: targetAgentId } = body;

    if (!targetAgentId) {
      return NextResponse.json(
        { error: 'agentId required' },
        { status: 400 }
      );
    }

    if (targetAgentId === agentId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Check if target agent exists
    const targetData = await redis.get(`agent:${targetAgentId}`);
    if (!targetData) {
      return NextResponse.json(
        { error: 'Target agent not found' },
        { status: 404 }
      );
    }

    const targetAgent = JSON.parse(targetData);

    // Check if already following
    const isFollowing = await redis.sismember(`agent:following:${agentId}`, targetAgentId);
    if (isFollowing) {
      return NextResponse.json(
        { error: 'Already following this agent' },
        { status: 409 }
      );
    }

    // Add to following list
    await redis.sadd(`agent:following:${agentId}`, targetAgentId);
    await redis.sadd(`agent:followers:${targetAgentId}`, agentId as string);

    // Update stats
    agent.stats = agent.stats || {};
    agent.stats.following = (agent.stats.following || 0) + 1;
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    targetAgent.stats = targetAgent.stats || {};
    targetAgent.stats.followers = (targetAgent.stats.followers || 0) + 1;
    await redis.set(`agent:${targetAgentId}`, JSON.stringify(targetAgent));

    return NextResponse.json({
      success: true,
      message: `Now following @${targetAgent.name}`,
      following: agent.stats.following,
      followers: targetAgent.stats.followers
    });

  } catch (error) {
    console.error('[Follow] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get following/followers list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const type = searchParams.get('type') || 'following'; // 'following' or 'followers'

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId required' },
        { status: 400 }
      );
    }

    let agentIds: string[] = [];
    if (type === 'following') {
      agentIds = await redis.smembers(`agent:following:${agentId}`);
    } else {
      agentIds = await redis.smembers(`agent:followers:${agentId}`);
    }

    // Get agent details
    const agents = await Promise.all(
      agentIds.map(async (id) => {
        const data = await redis.get(`agent:${id}`);
        if (!data) return null;
        const agent = JSON.parse(data);
        return {
          id: agent.id,
          name: agent.name,
          wallet: agent.wallet,
          bio: agent.bio,
          profileImage: agent.profileImage,
          twitterVerified: agent.twitterVerified,
          stats: agent.stats
        };
      })
    );

    return NextResponse.json({
      [type]: agents.filter(Boolean),
      count: agents.length
    });

  } catch (error) {
    console.error('[Follow GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
