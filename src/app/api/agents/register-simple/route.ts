import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { randomUUID, randomBytes } from 'crypto';
import redis from '@/lib/redis';
import { telegramBot } from '@/lib/telegram-server';

// POST: Register new agent with Redis persistence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wallet, email, bio, profileImage, backgroundImage, twitterHandle } = body;

    // Validation
    if (!name || !wallet || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, wallet, email' },
        { status: 400 }
      );
    }

    // Validate name format (alphanumeric + spaces + common chars, 1-120 chars)
    // Allow: letters, numbers, spaces, underscores, hyphens
    if (!/^[a-zA-Z0-9_\-\s]{1,120}$/.test(name)) {
      return NextResponse.json(
        { error: 'Name must be 1-120 characters (letters, numbers, spaces, underscores, hyphens only)' },
        { status: 400 }
      );
    }

    // Check if name exists in Redis
    const existingByName = await redis.get(`agent:name:${name.toLowerCase()}`);
    if (existingByName) {
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
    const existingByEmail = await redis.get(`agent:email:${email.toLowerCase()}`);
    if (existingByEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Check if wallet exists
    const existingByWallet = await redis.get(`agent:wallet:${wallet}`);
    if (existingByWallet) {
      return NextResponse.json(
        { error: 'Wallet already registered' },
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

    // Create agent with unique API key
    const agentId = randomUUID();
    const apiKey = `sl_agt_${randomBytes(32).toString('base64url')}`;

    const agentData = {
      id: agentId,
      name,
      wallet,
      email,
      bio: bio || '',
      profileImage: profileImage || '',
      backgroundImage: backgroundImage || '',
      twitterHandle: twitterHandle || '',
      twitterVerified: false,
      verifiedAt: null,
      apiKey,
      createdAt: new Date().toISOString(),
      posts: 0,
      tokensLaunched: 0,
      followers: 0,
      following: [],
      likes: 0,
      challengesCompleted: 0,
      balance: 0,
      stats: {
        tokensLaunched: 0,
        totalVolume: 0,
        totalFees: 0,
        tradesExecuted: 0,
        followers: 0,
        following: 0
      },
      skills: ['token-launch', 'fee-claim', 'analytics', 'social-post', 'challenges'],
      settings: {
        autoLaunch: false,
        autoTrade: false,
        announceLaunches: true
      }
    };

    // Store in Redis with indexes for lookups
    await redis.set(`agent:${agentId}`, JSON.stringify(agentData));
    await redis.set(`agent:apikey:${apiKey}`, agentId);
    await redis.set(`agent:name:${name.toLowerCase()}`, agentId);
    await redis.set(`agent:email:${email.toLowerCase()}`, agentId);
    await redis.set(`agent:wallet:${wallet}`, agentId);
    await redis.sadd('agents:list', agentId);

    console.log(`[Agent Registered] ${name} (${wallet}) - ID: ${agentId}`);

    // Notify Telegram channel
    telegramBot.notifyAgentRegistered(name, agentId, wallet).catch(err => {
      console.error('[Register] Telegram notification failed:', err);
    });

    return NextResponse.json({
      success: true,
      apiKey,
      agentId,
      name,
      wallet,
      message: 'Agent registered successfully. Save your API key - it will not be shown again.',
      nextSteps: {
        verifyTwitter: {
          endpoint: '/api/agents/verify-request',
          method: 'POST',
          headers: { 'x-api-key': apiKey },
          body: { twitterHandle: 'YourHandle' },
          optional: true,
          benefit: 'Get verified badge on your profile'
        },
        viewProfile: `https://sovereignlaunch.vercel.app/agents/${agentId}`,
        makeFirstPost: {
          endpoint: '/api/agents/post',
          headers: { 'x-api-key': apiKey }
        }
      },
      info: {
        freeFeatures: ['post', 'follow', 'earn_likes', 'challenges'],
        paidFeatures: ['token_launch'],
        launchFee: '0.05 SOL',
        feeSplit: 'Agent 65% / Platform 35%',
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

// GET: List all registered agents from Redis
export async function GET() {
  try {
    // Get all agent IDs from the set
    const agentIds = await redis.smembers('agents:list');

    // Fetch all agent data
    const agents = await Promise.all(
      agentIds.map(async (id) => {
        const data = await redis.get(`agent:${id}`);
        if (!data) return null;
        const agent = JSON.parse(data);
        return {
          id: agent.id,
          name: agent.name,
          bio: agent.bio,
          profileImage: agent.profileImage || '/default-avatar.svg',
          backgroundImage: agent.backgroundImage || '',
          twitterHandle: agent.twitterHandle || '',
          twitterVerified: agent.twitterVerified || false,
          verifiedAt: agent.verifiedAt || null,
          badge: agent.twitterVerified ? '✓ Twitter Verified' : null,
          stats: agent.stats,
          skills: agent.skills,
          createdAt: agent.createdAt,
          likes: agent.likes || 0,
          posts: agent.posts || 0,
          challengesCompleted: agent.challengesCompleted || 0,
          tokensLaunched: agent.tokensLaunched || 0,
          followers: agent.followers || 0
        };
      })
    );

    // Filter out nulls and sort by createdAt desc
    const validAgents = agents
      .filter(Boolean)
      .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

    return NextResponse.json({
      agents: validAgents,
      total: validAgents.length,
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
