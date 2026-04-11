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
    const verifyKey = `verify:${agentId}:${verificationCode}`;
    const verifyData = await redis.get(verifyKey);

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

    // Mark agent as verified
    agent.twitterVerified = true;
    agent.verifiedAt = new Date().toISOString();
    agent.tweetUrl = tweetUrl;
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    // Delete verification code
    await redis.del(verifyKey);

    // Send Telegram notification
    try {
      const { telegramBot } = await import('@/lib/telegram-server');
      await telegramBot.sendNotification({
        type: 'system',
        title: '✓ Twitter Verified',
        message: `Agent *${agent.name}* verified via manual submit!\n\nHandle: @${verification.twitterHandle}`,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Verify-Submit] Telegram notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      verificationCode,
      twitterHandle: verification.twitterHandle,
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
