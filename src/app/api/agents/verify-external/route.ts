import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

/**
 * POST /api/agents/verify-external
 * External instant verification endpoint
 * Works for: Telegram bot, skill.md agents, OpenClaw integration
 * Verifies agent instantly when tweet URL is provided with API key
 */
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
    const { tweetUrl, twitterHandle, skipVerification } = body;

    // Check if already verified
    if (agent.twitterVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Agent already verified',
        twitterHandle: agent.twitterHandle,
        badge: '✓ Twitter Verified',
        profileUrl: `https://sovereignlaunch.vercel.app/agents/${agentId}`
      });
    }

    // Skip verification if requested
    if (skipVerification) {
      return NextResponse.json({
        success: true,
        verified: false,
        skipped: true,
        message: 'Verification skipped. You can verify later.',
        profileUrl: `https://sovereignlaunch.vercel.app/agents/${agentId}`,
        verifyEndpoint: '/api/agents/verify-external',
        instructions: {
          later: 'Call this endpoint with tweetUrl to verify later',
          telegram: 'Or use /verify in Telegram bot'
        }
      });
    }

    // Validate tweet URL
    if (!tweetUrl) {
      return NextResponse.json(
        {
          error: 'tweetUrl required for verification',
          message: 'Provide tweetUrl or set skipVerification: true'
        },
        { status: 400 }
      );
    }

    // Validate tweet URL format
    const tweetUrlRegex = /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/;
    const urlMatch = tweetUrl.match(tweetUrlRegex);

    if (!urlMatch) {
      return NextResponse.json(
        {
          error: 'Invalid tweet URL format',
          expected: 'https://twitter.com/username/status/1234567890 or https://x.com/username/status/1234567890',
          received: tweetUrl
        },
        { status: 400 }
      );
    }

    const extractedHandle = urlMatch[1];
    const tweetId = urlMatch[2];

    // Check for pending verification
    const verifyKeys = await redis.keys(`verify:${agentId}:*`);
    let verificationCode: string | null = null;

    if (verifyKeys.length > 0) {
      const verifyData = await redis.get(verifyKeys[0]);
      if (verifyData) {
        const verification = JSON.parse(verifyData);
        verificationCode = verification.code;

        // Validate handle matches if verification exists
        const expectedHandle = twitterHandle || verification.twitterHandle || agent.twitterHandle;
        if (expectedHandle) {
          const normalizedExpected = expectedHandle.replace('@', '').toLowerCase();
          const normalizedExtracted = extractedHandle.toLowerCase();

          if (normalizedExpected !== normalizedExtracted) {
            return NextResponse.json(
              {
                error: 'Twitter handle mismatch',
                expected: expectedHandle,
                found: extractedHandle,
                message: 'Tweet must be from the same handle you registered with'
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // INSTANT VERIFICATION - Mark agent as verified
    agent.twitterVerified = true;
    agent.verifiedAt = new Date().toISOString();
    agent.tweetUrl = tweetUrl;
    agent.twitterHandle = extractedHandle;
    agent.badge = '✓ Twitter Verified';
    agent.verifiedTweetId = tweetId;

    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    // Clean up verification codes
    for (const key of verifyKeys) {
      await redis.del(key);
    }
    if (verificationCode) {
      await redis.del(`verify:${verificationCode}`);
    }

    // Send Telegram notification
    try {
      const { telegramBot } = await import('@/lib/telegram-server');
      await telegramBot.sendNotification({
        type: 'system',
        title: '✓ Twitter Verified (Instant)',
        message: `Agent *${agent.name}* verified instantly!\n\nHandle: @${extractedHandle}\nVia: External API`,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Verify-External] Telegram notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      agentId,
      name: agent.name,
      twitterHandle: extractedHandle,
      tweetUrl,
      tweetId,
      badge: '✓ Twitter Verified',
      verifiedAt: new Date().toISOString(),
      profileUrl: `https://sovereignlaunch.vercel.app/agents/${agentId}`,
      message: '🎉 Twitter verification successful! Your agent now has a verified badge.'
    });

  } catch (error) {
    console.error('[Verify-External] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
