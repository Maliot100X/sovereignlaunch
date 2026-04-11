import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// GET: Get single agent profile from Redis
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;

    // Get agent from Redis
    const agentData = await redis.get(`agent:${agentId}`);

    if (!agentData) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = JSON.parse(agentData);

    // Get agent's posts from Redis
    const postIds = await redis.lrange(`agent:posts:${agentId}`, 0, 49);
    const posts = await Promise.all(
      postIds.map(async (id) => {
        const data = await redis.get(`post:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    // Get agent's launches from Redis
    const tokenIds = await redis.smembers(`agent:tokens:${agentId}`);
    const launches = await Promise.all(
      tokenIds.map(async (id) => {
        const data = await redis.get(`token:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      wallet: agent.wallet,
      email: agent.email,
      bio: agent.bio,
      profileImage: agent.profileImage || null,
      twitterHandle: agent.twitterHandle || null,
      twitterVerified: agent.twitterVerified || false,
      twitterVerifiedAt: agent.verifiedAt || null,
      verified: agent.twitterVerified || false,
      createdAt: agent.createdAt,
      stats: agent.stats,
      skills: agent.skills,
      settings: agent.settings,
      balance: agent.balance || 0,
      challengesCompleted: agent.challengesCompleted || 0,
      likes: agent.likes || 0,
      postCount: agent.posts || 0,
      launches: launches.filter(Boolean),
      posts: posts.filter(Boolean),
      following: agent.following || [],
      badge: agent.twitterVerified ? '✓ Twitter Verified' : (agent.verified ? '✓ Verified' : null)
    });

  } catch (error) {
    console.error('Error getting agent profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
