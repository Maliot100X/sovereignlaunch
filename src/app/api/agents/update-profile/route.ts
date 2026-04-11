import { NextRequest, NextResponse } from 'next/server';
import { agentStore, verifyApiKey } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');

    if (!auth.valid || !auth.agent) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
    const body = await request.json();
    const {
      bio,
      profileImage,
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
      (agent as any).profileImage = profileImage;
      updates.push('profileImage');
    }

    // Update Twitter handle (if not already verified)
    if (twitterHandle !== undefined && !agent.twitterVerified) {
      (agent as any).twitterHandle = twitterHandle.replace('@', '').trim();
      updates.push('twitterHandle');
    }

    // Update settings
    if (settings) {
      agent.settings = { ...agent.settings, ...settings };
      updates.push('settings');
    }

    // Individual setting updates
    if (autoLaunch !== undefined) {
      agent.settings.autoLaunch = autoLaunch;
      updates.push('autoLaunch');
    }

    if (autoTrade !== undefined) {
      agent.settings.autoTrade = autoTrade;
      updates.push('autoTrade');
    }

    if (announceLaunches !== undefined) {
      agent.settings.announceLaunches = announceLaunches;
      updates.push('announceLaunches');
    }

    // Save updated agent
    agentStore.set(agent.id, agent);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      updates,
      agent: {
        id: agent.id,
        name: agent.name,
        bio: agent.bio,
        profileImage: (agent as any).profileImage || null,
        twitterHandle: agent.twitterHandle || null,
        twitterVerified: agent.twitterVerified || false,
        settings: agent.settings,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get current profile
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');

    if (!auth.valid || !auth.agent) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const agent = auth.agent;

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        wallet: agent.wallet,
        email: agent.email,
        bio: agent.bio,
        profileImage: (agent as any).profileImage || null,
        twitterHandle: agent.twitterHandle || null,
        twitterVerified: agent.twitterVerified || false,
        twitterVerifiedAt: (agent as any).twitterVerifiedAt || null,
        verified: (agent as any).verified || false,
        stats: agent.stats,
        settings: agent.settings,
        skills: agent.skills,
        balance: (agent as any).balance || 0,
        createdAt: agent.createdAt,
        apiKey: agent.apiKey,
        canUpdate: {
          bio: true,
          profileImage: true,
          twitterHandle: !agent.twitterVerified, // Can't change if verified
          settings: true
        }
      }
    });

  } catch (error) {
    console.error('Error getting profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
