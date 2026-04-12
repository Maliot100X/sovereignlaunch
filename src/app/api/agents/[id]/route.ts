import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// GET: Get single agent profile from Redis
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agent ID' },
        { status: 400 }
      );
    }

    // Get agent from Redis
    let agentData: string | null;
    try {
      agentData = await redis.get(`agent:${agentId}`);
    } catch (redisErr) {
      console.error('[Agent Profile] Redis error:', redisErr);
      return NextResponse.json(
        { error: 'Database connection error', agentId },
        { status: 500 }
      );
    }

    if (!agentData) {
      return NextResponse.json(
        { error: 'Agent not found', agentId },
        { status: 404 }
      );
    }

    // Safely parse agent data
    let agent: any;
    try {
      agent = JSON.parse(agentData);
    } catch (parseErr) {
      console.error('[Agent Profile] JSON parse error:', parseErr);
      return NextResponse.json(
        { error: 'Corrupted agent data', agentId },
        { status: 500 }
      );
    }

    // Get agent's posts from Redis (don't fail if this errors)
    let posts: any[] = [];
    try {
      const postIds = await redis.lrange(`agent:posts:${agentId}`, 0, 49);
      posts = (await Promise.all(
        postIds.map(async (id) => {
          try {
            const data = await redis.get(`post:${id}`);
            return data ? JSON.parse(data) : null;
          } catch {
            return null;
          }
        })
      )).filter(Boolean);
    } catch (e) {
      console.error('[Agent Profile] Error fetching posts:', e);
    }

    // Get agent's launches from Redis (don't fail if this errors)
    let launches: any[] = [];
    try {
      const tokenIds = await redis.smembers(`agent:tokens:${agentId}`);
      launches = (await Promise.all(
        tokenIds.map(async (id) => {
          try {
            const data = await redis.get(`token:${id}`);
            return data ? JSON.parse(data) : null;
          } catch {
            return null;
          }
        })
      )).filter(Boolean);
    } catch (e) {
      console.error('[Agent Profile] Error fetching launches:', e);
    }

    // Return agent with safe defaults
    return NextResponse.json({
      id: agent.id || agentId,
      name: agent.name || 'Unknown',
      wallet: agent.wallet || '',
      email: agent.email || '',
      bio: agent.bio || '',
      profileImage: agent.profileImage || '/default-avatar.svg',
      backgroundImage: agent.backgroundImage || '/default-banner.svg',
      twitterHandle: agent.twitterHandle || '',
      twitterVerified: !!agent.twitterVerified,
      twitterVerifiedAt: agent.verifiedAt || null,
      verified: !!agent.twitterVerified,
      createdAt: agent.createdAt || new Date().toISOString(),
      stats: agent.stats || { tokensLaunched: 0, totalVolume: 0, totalFees: 0, tradesExecuted: 0, followers: 0, following: 0 },
      skills: agent.skills || [],
      settings: agent.settings || { autoLaunch: false, autoTrade: false, announceLaunches: true },
      balance: agent.balance || 0,
      challengesCompleted: agent.challengesCompleted || 0,
      likes: agent.likes || 0,
      postCount: agent.posts || 0,
      launches,
      posts,
      following: agent.following || [],
      badge: agent.twitterVerified ? '✓ Twitter Verified' : null
    });

  } catch (error) {
    console.error('[Agent Profile] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
