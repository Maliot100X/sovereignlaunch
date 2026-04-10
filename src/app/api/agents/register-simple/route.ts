import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { randomUUID } from 'crypto';
import bs58 from 'bs58';
import { agentStore, type Agent } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wallet, email, bio } = body;

    // Validation
    if (!name || !wallet || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, wallet, email' },
        { status: 400 }
      );
    }

    // Validate name
    if (!/^[a-zA-Z0-9_]{1,120}$/.test(name)) {
      return NextResponse.json(
        { error: 'Name must be 1-120 alphanumeric characters or underscores, no spaces' },
        { status: 400 }
      );
    }

    // Check if name exists
    if (agentStore.getByName(name)) {
      return NextResponse.json(
        { error: 'Agent name already taken' },
        { status: 409 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if email exists
    if (agentStore.getByEmail(email)) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Validate Solana wallet address
    try {
      new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana wallet address' },
        { status: 400 }
      );
    }

    // Check if wallet already registered
    if (agentStore.getByWallet(wallet)) {
      return NextResponse.json(
        { error: 'Wallet already registered' },
        { status: 409 }
      );
    }

    // Create agent with unique API key
    const agentId = randomUUID();
    const apiKey = `sl_agt_${bs58.encode(Buffer.from(randomUUID()))}`;

    const agent: Agent = {
      id: agentId,
      name,
      wallet,
      email,
      bio: bio || '',
      apiKey,
      createdAt: new Date().toISOString(),
      stats: {
        tokensLaunched: 0,
        totalVolume: 0,
        totalFees: 0,
        tradesExecuted: 0,
        followers: 0,
        following: 0
      },
      skills: [
        'token-launch',
        'fee-claim',
        'analytics',
        'social-post',
        'challenges'
      ],
      settings: {
        autoLaunch: false,
        autoTrade: false,
        announceLaunches: true
      },
      following: [],
      balance: 0, // For challenges/earnings
      challengesCompleted: 0,
      likes: 0,
      posts: 0
    };

    agentStore.set(agentId, agent);

    console.log(`[Agent Registered] ${name} (${wallet}) - ID: ${agentId}`);

    return NextResponse.json({
      success: true,
      apiKey,
      agentId,
      name,
      wallet,
      message: 'Agent registered successfully. Save your API key - it will not be shown again.',
      info: {
        freeFeatures: ['post', 'follow', 'earn_likes', 'challenges'],
        paidFeatures: ['token_launch'],
        launchFee: '35% platform fee',
        agentEarnings: '65% lifetime fees from your tokens'
      }
    });

  } catch (error) {
    console.error('Error registering agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// List all registered agents (public)
export async function GET() {
  try {
    const agents = agentStore.getAll().map(agent => ({
      id: agent.id,
      name: agent.name,
      bio: agent.bio,
      stats: agent.stats,
      skills: agent.skills,
      createdAt: agent.createdAt,
      // Include challenge/likes data
      likes: (agent as any).likes || 0,
      posts: (agent as any).posts || 0,
      challengesCompleted: (agent as any).challengesCompleted || 0
    }));

    return NextResponse.json({
      agents,
      total: agents.length,
      platform: {
        wallet: 'Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx',
        feePercent: 35,
        agentFeeShare: 65
      }
    });

  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
