import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// POST: Update agent profile
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
    const {
      bio,
      profileImage,
      backgroundImage,
      twitterHandle,
      settings,
      autoLaunch,
      autoTrade,
      announceLaunches
    } = body;

    // Track what was updated
    const updates: string[] = [];

    // Update bio
    if (bio !== undefined) {
      agent.bio = bio;
      updates.push('bio');
    }

    // Update profile image
    if (profileImage !== undefined) {
      agent.profileImage = profileImage;
      updates.push('profileImage');
    }

    // Update background image
    if (backgroundImage !== undefined) {
      agent.backgroundImage = backgroundImage;
      updates.push('backgroundImage');
    }

    // Update Twitter handle (if not already verified)
    if (twitterHandle !== undefined && !agent.twitterVerified) {
      agent.twitterHandle = twitterHandle.replace('@', '').trim();
      updates.push('twitterHandle');
    }

    // Update settings
    if (settings) {
      agent.settings = { ...agent.settings, ...settings };
      updates.push('settings');
    }

    // Individual setting updates
    if (autoLaunch !== undefined) {
      agent.settings = agent.settings || {};
      agent.settings.autoLaunch = autoLaunch;
      updates.push('autoLaunch');
    }

    if (autoTrade !== undefined) {
      agent.settings = agent.settings || {};
      agent.settings.autoTrade = autoTrade;
      updates.push('autoTrade');
    }

    if (announceLaunches !== undefined) {
      agent.settings = agent.settings || {};
      agent.settings.announceLaunches = announceLaunches;
      updates.push('announceLaunches');
    }

    // Save updated agent to Redis
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      updates,
      agent: {
        id: agent.id,
        name: agent.name,
        bio: agent.bio,
        profileImage: agent.profileImage || null,
        backgroundImage: agent.backgroundImage || null,
        twitterHandle: agent.twitterHandle || null,
        twitterVerified: agent.twitterVerified || false,
        settings: agent.settings,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[Update Profile] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get current profile
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
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

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        wallet: agent.wallet,
        email: agent.email,
        bio: agent.bio,
        profileImage: agent.profileImage || null,
        backgroundImage: agent.backgroundImage || null,
        twitterHandle: agent.twitterHandle || null,
        twitterVerified: agent.twitterVerified || false,
        twitterVerifiedAt: agent.verifiedAt || null,
        verified: agent.twitterVerified || false,
        stats: agent.stats,
        settings: agent.settings,
        skills: agent.skills,
        balance: agent.balance || 0,
        createdAt: agent.createdAt,
        apiKey: apiKey,
        canUpdate: {
          bio: true,
          profileImage: true,
          backgroundImage: true,
          twitterHandle: !agent.twitterVerified, // Can't change if verified
          settings: true
        }
      }
    });

  } catch (error) {
    console.error('[Update Profile GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
