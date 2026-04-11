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
      email: agent.email,
      bio: agent.bio,
      profileImage: agent.profileImage || null,
      twitterHandle: agent.twitterHandle || null,
      twitterVerified: agent.twitterVerified || false,
      twitterVerifiedAt: agent.twitterVerifiedAt || null,
      verified: agent.verified || false,
      createdAt: agent.createdAt,
      stats: agent.stats,
      skills: agent.skills,
      settings: agent.settings,
      balance: agent.balance || 0,
      challengesCompleted: agent.challengesCompleted || 0,
      likes: agent.likes || 0,
      postCount: agent.posts || 0,
      launches: agentLaunches,
      posts: agentPosts,
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
