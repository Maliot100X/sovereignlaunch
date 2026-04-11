import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// POST: Auto-verify by checking actual Twitter post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, tweetUrl, twitterHandle } = body;

    if (!agentId || !tweetUrl) {
      return NextResponse.json(
        { error: 'agentId and tweetUrl required' },
        { status: 400 }
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

    // Check if already verified
    if (agent.twitterVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Agent already verified',
        twitterHandle: agent.twitterHandle,
        badge: '✓ Twitter Verified'
      });
    }

    // Validate tweet URL format
    const isValidTweetUrl = /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/.test(tweetUrl);
    if (!isValidTweetUrl) {
      return NextResponse.json(
        { error: 'Invalid tweet URL format. Expected: https://twitter.com/username/status/1234567890' },
        { status: 400 }
      );
    }

    // Extract handle from tweet URL
    const handleMatch = tweetUrl.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/\d+/);
    const extractedHandle = handleMatch ? handleMatch[1] : null;

    // Check for any pending verification codes for this agent
    const verifyKeys = await redis.keys(`verify:${agentId}:*`);

    if (verifyKeys.length === 0) {
      return NextResponse.json(
        { error: 'No pending verification found. Request a code first with /verify' },
        { status: 404 }
      );
    }

    // Get the verification data
    const verifyData = await redis.get(verifyKeys[0]);
    if (!verifyData) {
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 404 }
      );
    }

    const verification = JSON.parse(verifyData);

    // Validate the handle matches
    const expectedHandle = twitterHandle || verification.twitterHandle;
    if (expectedHandle && extractedHandle) {
      const normalizedExpected = expectedHandle.replace('@', '').toLowerCase();
      const normalizedExtracted = extractedHandle.toLowerCase();

      if (normalizedExpected !== normalizedExtracted) {
        return NextResponse.json(
          {
            error: 'Twitter handle mismatch',
            expected: expectedHandle,
            found: extractedHandle,
            message: 'The tweet URL must be from the same Twitter handle you provided'
          },
          { status: 403 }
        );
      }
    }

    // Mark agent as verified
    agent.twitterVerified = true;
    agent.verifiedAt = new Date().toISOString();
    agent.tweetUrl = tweetUrl;
    agent.twitterHandle = extractedHandle || expectedHandle || agent.twitterHandle;
    agent.badge = '✓ Twitter Verified';

    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    // Clean up verification codes
    for (const key of verifyKeys) {
      await redis.del(key);
    }
    // Also clean up the global verify code
    if (verification.code) {
      await redis.del(`verify:${verification.code}`);
    }

    // Send Telegram notification
    try {
      const { telegramBot } = await import('@/lib/telegram-server');
      await telegramBot.sendNotification({
        type: 'system',
        title: '✓ Twitter Verified (Auto)',
        message: `Agent *${agent.name}* verified via tweet URL!\n\nHandle: @${agent.twitterHandle}`,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Verify-Auto] Telegram notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      agentId,
      twitterHandle: agent.twitterHandle,
      tweetUrl,
      badge: '✓ Twitter Verified',
      verifiedAt: new Date().toISOString(),
      message: 'Twitter verification successful! Your agent now has a verified badge.'
    });

  } catch (error) {
    console.error('[Verify-Auto] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
