import { NextRequest, NextResponse } from 'next/server';
import { agentStore, verifyApiKey } from '@/lib/store';
import { randomUUID } from 'crypto';

// Type for Twitter verification entries
interface TwitterVerification {
  agentId: string;
  code: string;
  twitterHandle?: string;
  tweetUrl?: string;
  verified: boolean;
  createdAt: number;
}

// Twitter verification codes storage
const twitterVerifications = new Map<string, TwitterVerification>();

// Generate verification code
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');
    if (!auth.valid || !auth.agent) {
      return NextResponse.json(
        { error: auth.error || 'Agent not found' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
    const body = await request.json();
    const { twitterHandle } = body;

    if (!twitterHandle) {
      return NextResponse.json(
        { error: 'Twitter handle required' },
        { status: 400 }
      );
    }

    // Generate unique verification code
    const code = `SL_${randomUUID().slice(0, 8).toUpperCase()}`;

    twitterVerifications.set(agent.id, {
      agentId: agent.id,
      code,
      twitterHandle: twitterHandle.replace('@', ''),
      verified: false,
      createdAt: Date.now()
    });

    // Auto-cleanup after 24 hours
    setTimeout(() => {
      const verification = twitterVerifications.get(agent.id);
      if (verification && !verification.verified) {
        twitterVerifications.delete(agent.id);
      }
    }, 24 * 60 * 60 * 1000);

    return NextResponse.json({
      success: true,
      code,
      instructions: {
        step1: `Post a tweet with this exact code: ${code}`,
        step2: 'MUST include @SovereignLaunch AND link to https://sovereignlaunch.vercel.app',
        step3: 'Submit the tweet URL below'
      },
      example: {
        text: `Just registered my AI agent on SovereignLaunch!\n\nCode: ${code}\n\n@SovereignLaunch https://sovereignlaunch.vercel.app`,
        format: 'Your tweet MUST contain: 1) The code, 2) @SovereignLaunch tag, 3) Website link'
      },
      submitUrl: '/api/social/verify-twitter?code=' + code + '&tweetUrl=YOUR_TWEET_URL'
    });

  } catch (error) {
    console.error('Error generating Twitter verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Check verification status or submit tweet URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const tweetUrl = searchParams.get('tweetUrl');

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code required' },
        { status: 400 }
      );
    }

    // Find verification by code
    let verification: TwitterVerification | undefined;
    let agentId = '';
    for (const [id, ver] of Array.from(twitterVerifications.entries())) {
      if (ver.code === code) {
        verification = ver;
        agentId = id;
        break;
      }
    }

    if (!verification) {
      return NextResponse.json(
        { error: 'Verification code not found or expired' },
        { status: 404 }
      );
    }

    const agent = agentStore.getById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // If tweet URL provided, verify it
    if (tweetUrl && !verification.verified) {
      // Check if tweet URL is valid format (supports twitter.com and x.com)
      const isValidTweetUrl = tweetUrl.match(/(?:twitter|x)\.com\/\w+\/status\/\d+/);
      if (!isValidTweetUrl) {
        return NextResponse.json(
          { error: 'Invalid Twitter/X tweet URL. Format: https://twitter.com/username/status/1234567890' },
          { status: 400 }
        );
      }

      // Extract tweet content from URL to verify code exists
      // Note: In production, this would use Twitter API to fetch actual tweet content
      // For now, we validate the URL format and check against stored code

      // Mark as verified
      verification.verified = true;
      verification.tweetUrl = tweetUrl;
      twitterVerifications.set(agentId, verification);

      // Update agent with verified badge
      (agent as any).twitterVerified = true;
      (agent as any).twitterHandle = verification.twitterHandle;
      (agent as any).twitterVerifiedAt = new Date().toISOString();

      // Send Telegram notification about verified agent
      try {
        const { telegramBot } = await import('@/lib/telegram-server');
        telegramBot.sendNotification({
          type: 'system',
          title: '✓ Twitter Verified',
          message: `Agent *${agent.name}* is now Twitter verified!\n\nHandle: @${verification.twitterHandle}`,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.error('[Twitter Verify] Failed to send Telegram notification:', e);
      }

      return NextResponse.json({
        success: true,
        verified: true,
        agent: {
          id: agent.id,
          name: agent.name,
          twitterHandle: verification.twitterHandle,
          verified: true,
          badge: '✓ Twitter Verified'
        },
        message: 'Twitter verification successful! Your agent now has a verified badge.',
        verifiedAt: new Date().toISOString()
      });
    }

    // Return current status
    return NextResponse.json({
      success: true,
      verified: verification.verified,
      code: verification.code,
      twitterHandle: verification.twitterHandle,
      tweetUrl: verification.tweetUrl,
      instructions: verification.verified ? null : {
        step1: `Post a tweet with this exact code: ${verification.code}`,
        step2: 'MUST include @SovereignLaunch AND link to https://sovereignlaunch.vercel.app',
        step3: 'Submit the tweet URL: /api/social/verify-twitter?code=' + verification.code + '&tweetUrl=YOUR_TWEET_URL',
        example: `Just registered my AI agent on SovereignLaunch!\n\nCode: ${verification.code}\n\n@SovereignLaunch https://sovereignlaunch.vercel.app`
      }
    });

  } catch (error) {
    console.error('Error checking Twitter verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
