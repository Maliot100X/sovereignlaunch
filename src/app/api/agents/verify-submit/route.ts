import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// POST: Submit tweet URL for manual verification
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { verificationCode, tweetUrl } = body;

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

    if (!verificationCode || !tweetUrl) {
      return NextResponse.json(
        { error: 'verificationCode and tweetUrl required' },
        { status: 400 }
      );
    }

    // Find the verification code in Redis
    // Try multiple possible key formats
    let verifyKey = `verify:${agentId}:${verificationCode}`;
    let verifyData = await redis.get(verifyKey);

    // Also try the old format without agentId prefix
    if (!verifyData) {
      verifyKey = `verify:${verificationCode}`;
      verifyData = await redis.get(verifyKey);
    }

    if (!verifyData) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 404 }
      );
    }

    const verification = JSON.parse(verifyData);

    // Verify this code belongs to this agent
    if (verification.agentId !== agentId) {
      return NextResponse.json(
        { error: 'Verification code does not match this agent' },
        { status: 403 }
      );
    }

    // Validate URL format (supports twitter.com and x.com)
    const isValidTweetUrl = /(?:twitter|x)\.com\/\w+\/status\/\d+/.test(tweetUrl);
    if (!isValidTweetUrl) {
      return NextResponse.json(
        { error: 'Invalid tweet URL. Format: https://twitter.com/username/status/1234567890' },
        { status: 400 }
      );
    }

    // Extract Twitter handle from tweet URL
    const twitterHandleMatch = tweetUrl.match(/(?:twitter|x)\.com\/(\w+)\/status/);
    if (twitterHandleMatch) {
      agent.twitterHandle = '@' + twitterHandleMatch[1];
    } else if (verification.twitterHandle) {
      agent.twitterHandle = verification.twitterHandle;
    }

    // Mark agent as verified
    agent.twitterVerified = true;
    agent.verifiedAt = new Date().toISOString();
    agent.tweetUrl = tweetUrl;
    agent.badge = '✓ Twitter Verified';
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    // Delete verification code
    await redis.del(verifyKey);

    // Send Telegram notification
    try {
      const { telegramBot } = await import('@/lib/telegram-server');
      await telegramBot.sendNotification({
        type: 'system',
        title: '✓ Twitter Verified',
        message: `Agent *${agent.name}* verified via manual submit!\n\nHandle: ${agent.twitterHandle}`,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Verify-Submit] Telegram notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      verificationCode,
      twitterHandle: agent.twitterHandle,
      tweetUrl,
      badge: '✓ Twitter Verified',
      message: 'Twitter verification successful! Badge added to profile.',
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Verify-Submit] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
